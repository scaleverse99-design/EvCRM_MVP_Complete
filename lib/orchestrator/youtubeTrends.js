/**
 * YouTube trend detection — feeds the existing publishing pipeline.
 *
 * Turns measured viewer demand into queued topics. Deliberately does NOT
 * publish: it writes rows into orch_topics with state="DISCOVERED", which
 * is exactly what runDiscover() produces, so the already-built
 * research → write → publish stages and the /admin/orchestrator UI pick
 * these up unchanged. One pipeline, two sources of topics.
 *
 * ── Why this beats asking a model "what's trending?" ─────────────────
 * runDiscover() asks Gemini to guess what's trending. This measures what
 * people are actually watching. Same downstream pipeline, better-grounded
 * trigger.
 *
 * ── Three findings from real measurement that shaped this ────────────
 * All measured against the live API 2026-08-06, not assumed:
 *
 * 1. RECENCY FILTER IS MANDATORY. Searching "automotive india" all-time
 *    surfaced a quiz video (582d old) and a mobile-game video. The same
 *    search limited to the last 30 days surfaced an MG 7-seater launch
 *    review and a mileage comparison — and the aggregate velocity went UP
 *    (180k vs 158k views/day). Old viral videos report a views/day
 *    average earned mostly in their first weeks, so without
 *    publishedAfter the metric is simply wrong.
 *
 * 2. VOLUME IS NOT VALUE. "automotive india" pulls ~6x the views of
 *    "indian used-car industry", but its audience is watching quizzes and
 *    hypercar fantasy — not buying. Velocity alone would rank the useless
 *    keyword first, so it is weighted by measured buying-intent rate from
 *    the comments (see youtubeIntent.js, which measured 32.6% intent on
 *    purchase-shaped queries vs ~0% on a general "best SUV" video).
 *
 * 3. PER-VIDEO VELOCITY IS NOISE. A tracked video gained 1 view in 255
 *    seconds. Aggregate across a basket of videos per keyword, never one.
 */

import { readTable, writeTable } from "../store.js"
import { normalizeTitle, significantTokens, isDuplicate } from "./discover.js"
import { harvestYouTubeIntent, classifyIntent } from "../cte/sources/youtubeIntent.js"

const YT_API = "https://www.googleapis.com/youtube/v3"
const UA = "Mozilla/5.0 (compatible; EvCRM-CTE/1.0; +https://evcrm.in)"

const DEFAULT_RECENCY_DAYS = 30
const DEFAULT_MAX_KEYWORDS = 6      // 100 quota units per search
const VIDEOS_PER_KEYWORD = 10
const DEDUPE_WINDOW_DAYS = 30

// A topic must clear both bars to be queued. Velocity alone surfaces
// entertainment; intent alone surfaces low-traffic niche chatter.
const MIN_VIEWS_PER_DAY = 3000
const MIN_INTENT_RATE = 0.10

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error("YOUTUBE_API_KEY not set")
  return key
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `HTTP ${res.status}`)
  return json
}

/** Videos for a keyword, restricted to the recency window (finding #1). */
async function searchRecent(keyword, recencyDays) {
  const after = new Date(Date.now() - recencyDays * 86400_000).toISOString().replace(/\.\d{3}Z$/, "Z")
  const url = `${YT_API}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&regionCode=IN&maxResults=${VIDEOS_PER_KEYWORD}&order=relevance&publishedAfter=${after}&key=${apiKey()}`
  const json = await getJson(url)
  return (json.items || []).map(i => i.id?.videoId).filter(Boolean)
}

/** Stats for up to 50 video ids in ONE call (1 quota unit). */
async function videoStats(ids) {
  if (!ids.length) return []
  const url = `${YT_API}/videos?part=statistics,snippet&id=${ids.slice(0, 50).join(",")}&key=${apiKey()}`
  const json = await getJson(url)
  const now = Date.now()
  return (json.items || []).map(it => {
    const views = Number(it.statistics?.viewCount || 0)
    const publishedAt = it.snippet?.publishedAt
    const ageDays = Math.max(1, Math.round((now - new Date(publishedAt).getTime()) / 86400_000))
    return {
      videoId: it.id,
      title: it.snippet?.title || "",
      channel: it.snippet?.channelTitle || "",
      publishedAt,
      views,
      ageDays,
      viewsPerDay: Math.round(views / ageDays),
      url: `https://www.youtube.com/watch?v=${it.id}`,
    }
  })
}

/**
 * Scores keywords by measured demand, then queues the strongest video
 * topic per qualifying keyword into orch_topics.
 *
 * @param {string[]} keywords     purchase-shaped seeds, not broad category terms
 * @param {object}   opts
 * @param {number}   opts.recencyDays  how fresh videos must be (default 30)
 * @param {boolean}  opts.queueTopics  false = measure only, change nothing
 */
export async function runYouTubeTrends(keywords = [], opts = {}) {
  const {
    recencyDays = DEFAULT_RECENCY_DAYS,
    maxKeywords = DEFAULT_MAX_KEYWORDS,
    queueTopics = true,
    minViewsPerDay = MIN_VIEWS_PER_DAY,
    minIntentRate = MIN_INTENT_RATE,
  } = opts

  const seeds = keywords.slice(0, maxKeywords)
  if (!seeds.length) return { error: "no keywords supplied", scored: [], queued: 0 }

  const scored = []
  const errors = []

  for (const keyword of seeds) {
    try {
      const ids = await searchRecent(keyword, recencyDays)
      if (!ids.length) {
        scored.push({ keyword, videos: 0, aggregateViewsPerDay: 0, intentRate: 0, score: 0, reason: "no recent videos" })
        continue
      }

      const stats = await videoStats(ids)
      const aggregateViewsPerDay = stats.reduce((s, v) => s + v.viewsPerDay, 0)

      // Measure buying intent from comments on this keyword's videos —
      // finding #2. Reuses the tested harvester rather than a second
      // keyword-matching implementation.
      let intentRate = 0
      let topIntentComments = []
      try {
        const harvest = await harvestYouTubeIntent([keyword])
        intentRate = harvest.signalRate || 0
        topIntentComments = (harvest.signals || [])
          .filter(s => s.intent !== "GENERAL")
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 5)
      } catch (e) {
        errors.push({ keyword, stage: "intent", error: e.message })
      }

      stats.sort((a, b) => b.viewsPerDay - a.viewsPerDay)
      const top = stats[0]

      scored.push({
        keyword,
        videos: stats.length,
        aggregateViewsPerDay,
        intentRate,
        // Volume weighted by how commercially useful that audience is.
        score: Math.round(aggregateViewsPerDay * intentRate),
        topVideo: top,
        topIntentComments,
        qualifies: aggregateViewsPerDay >= minViewsPerDay && intentRate >= minIntentRate,
      })
    } catch (e) {
      errors.push({ keyword, stage: "search", error: e.message })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  if (!queueTopics) {
    return { scored, queued: 0, queuedTopics: [], skippedDuplicates: 0, errors: errors.length ? errors : undefined, measureOnly: true }
  }

  // ── Queue qualifying topics, deduped against everything recent ──────
  const [existing, blogPosts] = await Promise.all([
    readTable("orch_topics").catch(() => []),
    readTable("blog_posts").catch(() => []),
  ])

  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 86400_000)
  const dedupeEntries = []
  for (const row of existing) {
    if (row.state === "FAILED") continue
    if (row.discoveredAt && new Date(row.discoveredAt) < cutoff) continue
    dedupeEntries.push({ title: normalizeTitle(row.topic), tokens: significantTokens(row.topic), sourceUrl: row.sourceUrl })
  }
  for (const post of blogPosts) {
    if (post.type === "news" && post.title) {
      dedupeEntries.push({ title: normalizeTitle(post.title), tokens: significantTokens(post.title), sourceUrl: post.sourceUrl })
    }
  }

  const nowIso = new Date().toISOString()
  const rowsToInsert = []
  let skippedDuplicates = 0

  for (const s of scored) {
    if (!s.qualifies || !s.topVideo) continue

    const topic = s.topVideo.title.slice(0, 200)
    const sourceUrl = s.topVideo.url

    // Same dedup as runDiscover — one implementation, so a story already
    // queued or published from the news pipeline is not re-queued here.
    if (isDuplicate(topic, dedupeEntries, sourceUrl)) { skippedDuplicates++; continue }
    dedupeEntries.push({ title: normalizeTitle(topic), tokens: significantTokens(topic), sourceUrl })

    // keyFacts carry the MEASURED evidence, so a human reviewing this in
    // /admin/orchestrator sees why it was queued, and the writer stage has
    // real viewer questions to answer rather than inventing an angle.
    const keyFacts = [
      `Measured demand: ${s.aggregateViewsPerDay.toLocaleString("en-IN")} views/day across ${s.videos} videos published in the last ${recencyDays} days`,
      `Top video: "${s.topVideo.title}" — ${s.topVideo.views.toLocaleString("en-IN")} views in ${s.topVideo.ageDays} day(s) (${s.topVideo.viewsPerDay.toLocaleString("en-IN")}/day)`,
      `Buying-intent rate in comments: ${(s.intentRate * 100).toFixed(1)}%`,
      ...s.topIntentComments.slice(0, 3).map(c => `Viewer question [${c.intent}]: "${c.text.slice(0, 140)}"`),
    ]

    rowsToInsert.push({
      id: `topic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      topic,
      category: "cars",
      sourceUrl,
      keyFacts: keyFacts.slice(0, 6),
      publisher: s.topVideo.channel || "YouTube",
      summary: `Detected from measured YouTube demand for "${s.keyword}": ${s.aggregateViewsPerDay.toLocaleString("en-IN")} views/day with ${(s.intentRate * 100).toFixed(1)}% buying-intent comments.`,
      slugSeed: normalizeTitle(topic).slice(0, 60).replace(/\s+/g, "-") || "topic",
      state: "DISCOVERED",
      discoveredAt: nowIso,
      discoveredByModel: "youtube-trends (measured, no LLM)",
      // Provenance so these are distinguishable from Gemini-discovered rows
      // in the admin UI and in any later analysis.
      discoverySource: "youtube_velocity",
      demandMetrics: {
        keyword: s.keyword,
        aggregateViewsPerDay: s.aggregateViewsPerDay,
        intentRate: s.intentRate,
        score: s.score,
      },
    })
  }

  if (rowsToInsert.length) {
    try {
      await writeTable("orch_topics", existing.concat(rowsToInsert))
    } catch (e) {
      errors.push({ stage: "persist", error: e.message })
      return { scored, queued: 0, skippedDuplicates, errors }
    }
  }

  return {
    scored,
    queued: rowsToInsert.length,
    queuedTopics: rowsToInsert.map(r => ({ id: r.id, topic: r.topic, score: r.demandMetrics.score })),
    skippedDuplicates,
    errors: errors.length ? errors : undefined,
  }
}
