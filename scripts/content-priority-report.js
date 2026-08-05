// The merged view across every intent-capture layer this session built —
// answers "based on that we can have average queries and prepare content
// on that", by combining the layers rather than treating any one as
// complete on its own. None of them alone gives the whole picture:
//
//   query_signals            exact MCP queries          small volume, exact
//   ai_search_bot_hits       AI search fetched this page outcome, not intent
//   search_console_queries   real Google queries         whole market, but
//                                                         only pages we rank
//   intentEngine Autocomplete market-wide phrasing        whole market, but
//                            (fetched live, not stored)   pattern not query
//
//   node scripts/content-priority-report.js [days]
//
// Prints real rows from real tables. A signal with no rows prints "no data
// yet" for that layer rather than being silently skipped — the gaps are
// informative (e.g. zero MCP signal but strong Search Console signal tells
// you the AI-assistant channel isn't warmed up yet, which is itself useful
// to know, not a report bug).
const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const DAYS = Number(process.argv[2] || 30)

async function main() {
  const { createClient } = require("@supabase/supabase-js")
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const since = new Date(Date.now() - DAYS * 86400_000).toISOString()

  console.log(`\nContent priority report — last ${DAYS} days\n${"=".repeat(60)}`)

  // ── Layer 1: MCP query_signals — exact real queries ──────────────
  console.log("\n[1] MCP query signals (exact queries, real AI-assistant usage)")
  const qs = await sb.from("query_signals").select("*").order("hit_count", { ascending: false }).limit(15)
  if (qs.error) console.log(`  Could not read query_signals: ${qs.error.message} — has the table been created?`)
  else if (!qs.data.length) console.log("  No signal yet. Expected while MCP connector adoption is small — this is the lowest-volume layer by design.")
  else qs.data.forEach(r => console.log(`  ${String(r.hit_count).padStart(3)}x  ${r.signature}  ${r.published_article_slug ? "-> " + r.published_article_slug : "(not yet published)"}`))

  // ── Layer 3: AI search bots actually fetching our pages ──────────
  console.log("\n[2] AI search bot hits (self-reported UA — proof AI search found a page, not what was asked)")
  const bh = await sb.from("ai_search_bot_hits").select("*").gte("last_seen", since).order("hit_count", { ascending: false }).limit(15)
  if (bh.error) console.log(`  Could not read ai_search_bot_hits: ${bh.error.message} — has lib/cte/RUN_ME_IN_SUPABASE.sql section 5 been run?`)
  else if (!bh.data.length) console.log("  No hits yet. Needs both the table created AND real crawl traffic from OAI-SearchBot/Claude-SearchBot/PerplexityBot/bingbot since then.")
  else bh.data.forEach(r => console.log(`  ${String(r.hit_count).padStart(3)}x  ${r.bot_name.padEnd(16)} ${r.path}`))

  // ── Layer 4: real Google queries (Search Console) ────────────────
  console.log("\n[3] Search Console queries (real Google queries, whole-market — only for pages already ranking)")
  const sc = await sb.from("search_console_queries").select("*").order("impressions", { ascending: false }).limit(15)
  if (sc.error) console.log(`  Could not read search_console_queries: ${sc.error.message} — has the table been created?`)
  else if (!sc.data.length) console.log("  No data yet. Run scripts/fetch-search-console-queries.js (needs SEARCH_CONSOLE_CLIENT_EMAIL / SEARCH_CONSOLE_PRIVATE_KEY — see that file's header for setup).")
  else sc.data.forEach(r => console.log(`  ${String(r.impressions).padStart(5)} impr  ${String(r.clicks).padStart(4)} clicks  "${r.query}"`))

  // ── Synthesis ──────────────────────────────────────────────────
  // Deliberately not a single "score" — collapsing three differently-shaped
  // signals (small-exact, outcome-only, whole-market-but-rank-gated) into
  // one number would hide exactly the distinctions that make combining
  // them useful. State what each layer independently supports instead.
  console.log(`\n${"=".repeat(60)}\nWhat this means for what to write next:\n`)

  const topSignal = qs.data?.[0]
  const topBotPage = bh.data?.[0]
  const topQuery = sc.data?.[0]

  if (topSignal) console.log(`  - "${topSignal.signature}" has real repeated MCP demand (${topSignal.hit_count}x) — strongest single signal available, since it's an exact question someone actually asked.`)
  if (topBotPage) console.log(`  - ${topBotPage.path} is being actively fetched by AI search (${topBotPage.bot_name}, ${topBotPage.hit_count}x) — confirms that page is winning in AI search; consider a linked companion page on the same topic.`)
  if (topQuery && topQuery.clicks / Math.max(topQuery.impressions, 1) < 0.02 && topQuery.impressions > 20) {
    console.log(`  - "${topQuery.query}" has ${topQuery.impressions} impressions but only ${(topQuery.clicks / topQuery.impressions * 100).toFixed(1)}% CTR — this is a title/snippet fix on an EXISTING page, not a new-content opportunity.`)
  } else if (topQuery) {
    console.log(`  - "${topQuery.query}" is the top real Google query surfacing us (${topQuery.impressions} impressions) — safe to expand that page's coverage, since real demand is confirmed.`)
  }
  if (!topSignal && !topBotPage && !topQuery) {
    console.log("  No signal from any layer yet. This is expected pre-traffic — use intentEngine's Autocomplete phrasings (queryTrigger.js already does, for auto-published articles) as the bootstrap source until real usage accumulates here.")
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
