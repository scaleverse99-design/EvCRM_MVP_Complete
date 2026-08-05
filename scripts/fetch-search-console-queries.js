// Pulls real queries that surfaced evcrm.in in Google Search — the one
// channel discussed today that gives whole-market, real, exact intent with
// zero install. The catch, stated plainly: it only reports queries for
// pages you ALREADY rank on. It confirms and refines demand for content
// that exists; it can't tell you what to write first from nothing.
//
//   node scripts/fetch-search-console-queries.js [days]
//
// ── One-time setup (yours to do, cannot be done from here) ────────────
// 1. Google Cloud Console -> APIs & Services -> enable "Search Console API"
//    on the same project used for Places/other Google APIs, or a new one.
// 2. Create a service account, generate a JSON key.
// 3. Search Console (search.google.com/search-console) -> evcrm.in property
//    -> Settings -> Users and permissions -> Add user -> paste the service
//    account's email -> permission level "Restricted" is enough (read-only).
// 4. From the downloaded JSON key, put into .env:
//      SEARCH_CONSOLE_CLIENT_EMAIL=...@...iam.gserviceaccount.com
//      SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//    (the private key needs its literal \n sequences preserved — the script
//    below un-escapes them, since most .env loaders don't handle real
//    newlines inside a value well)
//
// Until that's done, this refuses to run rather than printing anything —
// same rule as every other data source touched today: no key, no number.
const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env")
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
}

const SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL || "https://evcrm.in/"
const DAYS = Number(process.argv[2] || 28)

async function main() {
  const clientEmail = process.env.SEARCH_CONSOLE_CLIENT_EMAIL
  const privateKey = (process.env.SEARCH_CONSOLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  if (!clientEmail || !privateKey) {
    console.error("SEARCH_CONSOLE_CLIENT_EMAIL / SEARCH_CONSOLE_PRIVATE_KEY not set — see setup steps in this file's header.")
    process.exit(1)
  }

  const { google } = require("googleapis")
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })

  const searchconsole = google.searchconsole({ version: "v1", auth })

  const end = new Date()
  const start = new Date(end.getTime() - DAYS * 86400_000)
  const fmt = (d) => d.toISOString().slice(0, 10)

  let res
  try {
    res = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ["query", "page"],
        rowLimit: 1000,
      },
    })
  } catch (e) {
    console.error("Search Console query failed:", e.message)
    console.error("Common cause: the service account email hasn't been added as a Restricted user on the evcrm.in property yet.")
    process.exit(1)
  }

  const rows = res.data.rows || []
  if (!rows.length) {
    console.log(`No query data for the last ${DAYS} days. Either nothing ranks yet, or the property is newly verified and data hasn't populated (Search Console has a 2-3 day lag).`)
    return
  }

  // Google redacts very-low-volume queries from this API for privacy — rows
  // returned here are the ones with enough volume to be reportable, which
  // is itself a real filter: these are, definitionally, the queries worth
  // writing content for.
  const byQuery = new Map()
  for (const r of rows) {
    const q = r.keys[0]
    const cur = byQuery.get(q) || { query: q, clicks: 0, impressions: 0, pages: new Set() }
    cur.clicks += r.clicks
    cur.impressions += r.impressions
    cur.pages.add(r.keys[1])
    byQuery.set(q, cur)
  }

  const ranked = [...byQuery.values()].sort((a, b) => b.impressions - a.impressions)

  // Persist so scripts/content-priority-report.js (layer 4 — the merged
  // view across all intent signals) can read this without needing live
  // Search Console credentials on every run. Best-effort: a failed write
  // here must not stop the console output this command exists to produce.
  try {
    const { createClient } = require("@supabase/supabase-js")
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const nowIso = new Date().toISOString()
    const rows = ranked.map(r => ({
      query: r.query.slice(0, 300),
      clicks: r.clicks,
      impressions: r.impressions,
      page_count: r.pages.size,
      window_days: DAYS,
      fetched_at: nowIso,
    }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from("search_console_queries").upsert(rows.slice(i, i + 500), { onConflict: "query" })
      if (error) { console.warn("search_console_queries write failed:", error.message); break }
    }
  } catch (e) {
    console.warn("Could not persist to Supabase (console output above is still valid):", e.message)
  }

  console.log(`\nReal Google queries surfacing evcrm.in, last ${DAYS} days (${ranked.length} distinct queries):\n`)
  for (const r of ranked.slice(0, 40)) {
    const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : "0.0"
    console.log(`  ${String(r.impressions).padStart(5)} impr  ${String(r.clicks).padStart(4)} clicks  ${ctr.padStart(5)}% ctr  "${r.query}"`)
  }

  // High impressions + low clicks = people see us in results and don't
  // click. That is a title/snippet problem on an EXISTING page, not a
  // missing-content problem — worth separating from the ranked list above
  // because it calls for a different fix.
  const weak = ranked.filter(r => r.impressions >= 20 && r.clicks / Math.max(r.impressions, 1) < 0.02)
  if (weak.length) {
    console.log(`\nHigh visibility, low clicks (title/snippet worth revisiting, not new content):`)
    weak.slice(0, 10).forEach(r => console.log(`  ${r.impressions} impr, ${(r.clicks / r.impressions * 100).toFixed(1)}% ctr — "${r.query}"`))
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
