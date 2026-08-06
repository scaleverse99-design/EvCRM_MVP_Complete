// Unified content priority report — merges six demand-signal layers into one ranked view.
//
// ── Six signal layers, each capturing different buyer intent ──────────────
//
//   [1] query_signals            — exact MCP queries (small volume, highly exact)
//   [2] ai_search_bot_hits       — AI search crawlers (proof of ranking in AI search)
//   [3] search_console_queries   — Google Search Console (real Google demand, rank-gated)
//   [4] youtube_channel_events   — new videos from watched channels (publisher confidence)
//   [5] youtube_intent_signals   — buying-intent comments in YouTube (raw buyer phrasing)
//   [6] orchestrator topics      — queued for auto-publishing (editorial demand signal)
//
// ── Usage ──────────────────────────────────────────────────────────────────
//   node scripts/content-priority-report.js [days] [--channels] [--intent]
//
//   days       — lookback window (default 30)
//   --channels — include YouTube channel events (API calls, quota cost ~1/channel)
//   --intent   — include YouTube intent harvest (API calls, quota cost ~100/keyword)
//
// The merged view answers "what should we write next?" from observed demand,
// ranked across all accessible signals so the highest-confidence topics float
// to the top regardless of which channel they surfaced in.
const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const DAYS = Number(process.argv[2] || 30)
const INCLUDE_CHANNELS = process.argv.includes("--channels")
const INCLUDE_INTENT = process.argv.includes("--intent")

// Fetch YouTube video description and comments
async function fetchVideoContext(videoId) {
  if (!process.env.YOUTUBE_API_KEY) return null
  try {
    const YT_API = "https://www.googleapis.com/youtube/v3"
    const key = process.env.YOUTUBE_API_KEY

    // Fetch video snippet (description)
    const videoRes = await fetch(`${YT_API}/videos?part=snippet&id=${videoId}&key=${key}`)
    const videoJson = await videoRes.json()
    const snippet = videoJson.items?.[0]?.snippet

    if (!snippet) return null

    // Fetch top comments
    const commentsRes = await fetch(`${YT_API}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${key}`)
    const commentsJson = await commentsRes.json()
    const comments = (commentsJson.items || []).map(it => {
      const s = it.snippet?.topLevelComment?.snippet || {}
      return {
        text: String(s.textOriginal || "").replace(/\s+/g, " ").trim(),
        likes: s.likeCount || 0,
        author: s.authorDisplayName
      }
    })

    return { description: snippet.description, comments }
  } catch (e) {
    return null
  }
}

// Normalize diverse signals into a common "demand signal" shape for ranking
function normalizeSignal(source, data) {
  switch (source) {
    case "query_signals":
      return {
        source: "MCP queries",
        topic: data.signature,
        demand: data.hit_count,
        demandUnit: "exact queries",
        confidence: "high",
        isExact: true,
        published: data.published_article_slug ? `✓ ${data.published_article_slug}` : "— unpublished",
      }
    case "ai_search_bot_hits":
      return {
        source: "AI search crawlers",
        topic: data.path,
        demand: data.hit_count,
        demandUnit: "crawler visits",
        confidence: "high",
        botName: data.bot_name,
        published: "✓ already ranking",
      }
    case "search_console":
      return {
        source: "Google Search",
        topic: data.query,
        demand: data.impressions,
        demandUnit: "impressions",
        confidence: data.clicks / Math.max(data.impressions, 1) < 0.02 ? "medium (low CTR)" : "high",
        clicks: data.clicks,
        ctr: `${(data.clicks / Math.max(data.impressions, 1) * 100).toFixed(1)}%`,
        published: "✓ already ranking",
      }
    case "youtube_channels":
      return {
        source: "YouTube channels",
        topic: data.title,
        demand: data.viewsPerHour || 0,
        demandUnit: "views/hour",
        confidence: "medium",
        channel: data.publisher,
        viewsTotal: data.views,
        url: data.url,
      }
    case "youtube_intent":
      return {
        source: "YouTube buyer intent",
        topic: data.text,
        demand: data.likes || 0,
        demandUnit: "comment likes",
        confidence: "high (explicit intent)",
        intent: data.intent,
        video: data.videoTitle,
        channel: data.channel,
      }
    case "orch_topics":
      return {
        source: "Orchestrator queue",
        topic: data.topic,
        demand: data.demandMetrics?.score || 0,
        demandUnit: "composite score",
        confidence: "high",
        reason: data.summary,
        discoverySource: data.discoverySource,
      }
    default:
      return null
  }
}

async function main() {
  const { createClient } = require("@supabase/supabase-js")
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString()

  console.log(`\n${"═".repeat(80)}`)
  console.log(`Content Priority Report — Unified Demand Signals (${DAYS} days)`)
  console.log(`${"═".repeat(80)}\n`)

  const signals = []

  // ── Layer 1: MCP query_signals ─────────────────────────────────────
  console.log("[1] MCP Query Signals (exact AI-assistant queries)")
  try {
    const qs = await sb.from("query_signals").select("*").order("hit_count", { ascending: false }).limit(15)
    if (qs.error) {
      console.log(`    ⚠ ${qs.error.message}`)
    } else if (!qs.data.length) {
      console.log("    — no signal yet (expected during early adoption)")
    } else {
      console.log(`    ✓ ${qs.data.length} signals found`)
      qs.data.forEach(r => signals.push(normalizeSignal("query_signals", r)))
    }
  } catch (e) {
    console.log(`    ✗ Error: ${e.message}`)
  }

  // ── Layer 2: AI search bot hits ────────────────────────────────────
  console.log("\n[2] AI Search Bot Crawls (proof of ranking in AI search)")
  try {
    const bh = await sb.from("ai_search_bot_hits").select("*").gte("last_seen", since).order("hit_count", { ascending: false }).limit(15)
    if (bh.error) {
      console.log(`    ⚠ ${bh.error.message}`)
    } else if (!bh.data.length) {
      console.log("    — no hits yet (needs real crawler traffic)")
    } else {
      console.log(`    ✓ ${bh.data.length} pages being crawled`)
      bh.data.forEach(r => signals.push(normalizeSignal("ai_search_bot_hits", r)))
    }
  } catch (e) {
    console.log(`    ✗ Error: ${e.message}`)
  }

  // ── Layer 3: Search Console queries ────────────────────────────────
  console.log("\n[3] Google Search Console (real Google search demand)")
  try {
    const sc = await sb.from("search_console_queries").select("*").order("impressions", { ascending: false }).limit(15)
    if (sc.error) {
      console.log(`    ⚠ ${sc.error.message}`)
    } else if (!sc.data.length) {
      console.log("    — no data yet (run scripts/fetch-search-console-queries.js)")
    } else {
      console.log(`    ✓ ${sc.data.length} queries found`)
      sc.data.forEach(r => signals.push(normalizeSignal("search_console", r)))
    }
  } catch (e) {
    console.log(`    ✗ Error: ${e.message}`)
  }

  // ── Layer 4: YouTube channel events ────────────────────────────────
  if (INCLUDE_CHANNELS) {
    console.log("\n[4] YouTube Channel Events (new videos from trusted publishers)")
    try {
      const { pollWatchedChannels } = await import("../lib/orchestrator/youtubeChannels.js")
      const ytResult = await pollWatchedChannels({ lookbackHours: DAYS * 24, excludeShorts: true })
      if (ytResult.newVideos.length) {
        console.log(`    ✓ ${ytResult.newVideos.length} new videos found across ${ytResult.channelsPolled.length} channels`)
        ytResult.newVideos.forEach(v => signals.push(normalizeSignal("youtube_channels", v)))
      } else {
        console.log("    — no new videos in lookback window")
      }
      if (ytResult.channelsFailed?.length) {
        console.log(`    ⚠ ${ytResult.channelsFailed.length} channels failed: ${ytResult.channelsFailed.map(c => c.name).join(", ")}`)
      }
    } catch (e) {
      console.log(`    ✗ Error: ${e.message}`)
    }
  } else {
    console.log("\n[4] YouTube Channel Events (pass --channels to include, quota cost ~1 unit/channel)")
  }

  // ── Layer 5: YouTube intent signals ────────────────────────────────
  if (INCLUDE_INTENT) {
    console.log("\n[5] YouTube Buyer Intent (purchase-intent comments)")
    try {
      const { harvestYouTubeIntent } = await import("../lib/cte/sources/youtubeIntent.js")
      // Use a sample of high-intent keywords to avoid quota exhaustion
      const seedQueries = [
        "tata nexon ev price 2026",
        "mahindra xuv400 vs creta comparison",
        "electric car india cheapest",
      ]
      const harvest = await harvestYouTubeIntent(seedQueries)
      if (harvest.signals.length) {
        console.log(`    ✓ ${harvest.signals.length} intent signals found (${harvest.signalRate * 100}% intent rate)`)
        // Top signals by intent type
        const byIntent = harvest.signals.reduce((acc, s) => { acc[s.intent] = (acc[s.intent] || 0) + 1; return acc }, {})
        Object.entries(byIntent).forEach(([intent, count]) => {
          console.log(`       ${intent}: ${count}`)
        })
        harvest.signals.slice(0, 10).forEach(s => signals.push(normalizeSignal("youtube_intent", s)))
      } else {
        console.log("    — no intent signals found in sample")
      }
      if (harvest.errors?.length) {
        console.log(`    ⚠ ${harvest.errors.length} API errors in harvest`)
      }
    } catch (e) {
      console.log(`    ✗ Error: ${e.message}`)
    }
  } else {
    console.log("\n[5] YouTube Buyer Intent (pass --intent to include, quota cost ~100 units/keyword)")
  }

  // ── Layer 6: Orchestrator topics ───────────────────────────────────
  console.log("\n[6] Orchestrator Topics (queued for publishing)")
  try {
    const ot = await sb.from("orch_topics").select("*").eq("state", "DISCOVERED").order("discoveredAt", { ascending: false }).limit(15)
    if (ot.error) {
      console.log(`    ⚠ ${ot.error.message}`)
    } else if (!ot.data.length) {
      console.log("    — no discovered topics (run news orchestrator or YouTube trends)")
    } else {
      console.log(`    ✓ ${ot.data.length} topics queued`)
      ot.data.forEach(r => signals.push(normalizeSignal("orch_topics", r)))
    }
  } catch (e) {
    console.log(`    ✗ Error: ${e.message}`)
  }

  // ── Trending video highlight (if available) ────────────────────────
  const trendingYtChannels = signals.filter(s => s.source === "YouTube channels").sort((a, b) => (b.demand || 0) - (a.demand || 0))?.[0]

  if (trendingYtChannels && trendingYtChannels.url) {
    console.log(`${"═".repeat(80)}`)
    console.log("🔥 TRENDING NOW — What Buyers Are Actually Asking About")
    console.log(`${"═".repeat(80)}\n`)
    console.log(`📹 "${trendingYtChannels.topic}"`)
    console.log(`   Channel: ${trendingYtChannels.channel} | ${trendingYtChannels.demand} views/hour | ${trendingYtChannels.viewsTotal?.toLocaleString("en-IN")} total`)

    // Fetch video context (description + comments)
    const videoId = trendingYtChannels.url?.match(/v=([^&]+)/)?.[1]
    if (videoId) {
      const context = await fetchVideoContext(videoId)
      if (context) {
        // Show description (first 300 chars)
        if (context.description) {
          const desc = context.description.split('\n')[0].trim()
          console.log(`\n📝 Description:\n   ${desc.slice(0, 280)}${desc.length > 280 ? "…" : ""}`)
        }

        // Show buyer questions/comments
        if (context.comments.length) {
          console.log(`\n💬 What Viewers Are Asking (real buyer intent):`)

          // Categorize comments
          const questions = context.comments
            .filter(c => c.text.length > 15 && c.text.includes("?"))
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))

          const statements = context.comments
            .filter(c => c.text.length > 15 && !c.text.includes("?"))
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))

          // Show questions first (highest intent)
          if (questions.length > 0) {
            console.log(`\n   QUESTIONS (highest buyer intent):`)
            questions.slice(0, 3).forEach((c, i) => {
              const truncated = c.text.length > 90 ? c.text.slice(0, 90) + "…" : c.text
              console.log(`   ${i + 1}. "${truncated}" (${c.likes} likes)`)
            })
          }

          // Show opinions/insights
          if (statements.length > 0) {
            console.log(`\n   INSIGHTS FROM VIEWERS:`)
            statements.slice(0, 3).forEach((c, i) => {
              const truncated = c.text.length > 90 ? c.text.slice(0, 90) + "…" : c.text
              console.log(`   ${i + 1}. "${truncated}" (${c.likes} likes)`)
            })
          }
        }

        // Extract topics from all comments
        console.log(`\n📊 What Buyers Care About (extracted from comments):`)
        if (context.comments.length) {
          const allComments = context.comments.map(c => c.text).join(" ").toLowerCase()
          const topics = {}

          // Look for specific terms
          const interests = [
            "price", "cost", "on road", "ex showroom", "emi", "loan", "finance",
            "range", "charging", "battery", "performance", "features", "specs",
            "engine", "transmission", "mileage", "warranty", "service",
            "comparison", "vs", "vs.", "competitor", "rival",
            "launch", "release", "availability", "booking", "delivery",
            "interior", "exterior", "design", "luxury", "safety"
          ]

          interests.forEach(term => {
            if (allComments.includes(term)) {
              topics[term] = (topics[term] || 0) + 1
            }
          })

          const sorted = Object.entries(topics)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)

          if (sorted.length) {
            sorted.forEach(([topic, count]) => {
              console.log(`   • ${topic} (mentioned ${count} times)`)
            })
          } else {
            console.log(`   (Topics: scroll comments to see what buyers discuss)`)
          }
        }

        console.log(`\n💡 Content to Write:`)
        console.log(`   Answering the QUESTIONS above is your highest-ROI content.`)
        console.log(`   Buyers who ask are closer to purchase than those just watching.\n`)
      } else {
        console.log(`   Link: ${trendingYtChannels.url}\n`)
      }
    }
  }

  // ── Unified ranking ────────────────────────────────────────────────
  console.log(`${"═".repeat(80)}`)
  console.log("UNIFIED RANK (all sources merged & sorted by demand)")
  console.log(`${"═".repeat(80)}\n`)

  if (!signals.length) {
    console.log("No signals across all layers. Run fetchers or pass --channels / --intent.\n")
    return
  }

  // Normalize demand to 0–100 for comparison across different units
  const maxDemand = Math.max(...signals.map(s => s.demand || 0))
  const normalized = signals
    .map(s => ({
      ...s,
      demandNorm: maxDemand ? Math.round((s.demand / maxDemand) * 100) : 0,
    }))
    .sort((a, b) => (b.demandNorm || 0) - (a.demandNorm || 0))

  // Show top 30 across all layers
  normalized.slice(0, 30).forEach((sig, i) => {
    const demandBar = "▓".repeat(Math.floor(sig.demandNorm / 5)) + "░".repeat(20 - Math.floor(sig.demandNorm / 5))
    console.log(`${String(i + 1).padStart(2)}. [${demandBar}] ${String(sig.demandNorm).padStart(3)}%  ${sig.source.padEnd(20)}  ${sig.demand} ${sig.demandUnit}`)
    console.log(`    → "${sig.topic.slice(0, 90)}${sig.topic.length > 90 ? "…" : ""}"`)
    if (sig.confidence) console.log(`    Confidence: ${sig.confidence}`)
    if (sig.published) console.log(`    ${sig.published}`)
    if (sig.ctr) console.log(`    CTR: ${sig.ctr}`)
    if (sig.intent) console.log(`    Intent type: ${sig.intent}`)
    console.log("")
  })

  // ── Summary ────────────────────────────────────────────────────────
  const sourceCount = {}
  signals.forEach(s => { sourceCount[s.source] = (sourceCount[s.source] || 0) + 1 })

  console.log(`\n${"═".repeat(80)}`)
  console.log("Summary")
  console.log(`${"═".repeat(80)}`)
  console.log(`Total signals: ${signals.length}`)
  Object.entries(sourceCount).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`)
  })

  console.log(`\nTop opportunity: "${normalized[0]?.topic?.slice(0, 80)}"`)
  console.log(`  Source: ${normalized[0]?.source} (${normalized[0]?.demand} ${normalized[0]?.demandUnit})`)
  console.log(`  Confidence: ${normalized[0]?.confidence}`)
  if (normalized[0]?.url) console.log(`  Reference: ${normalized[0]?.url}`)
  console.log("\n")
}

main().catch(e => { console.error(e.message); process.exit(1) })
