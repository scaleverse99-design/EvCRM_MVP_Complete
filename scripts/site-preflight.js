// Site-level rule book — run before pointing Google at anything.
//
//   node scripts/site-preflight.js            checks https://evcrm.in
//   node scripts/site-preflight.js http://localhost:3000
//
// The article gate (lib/blog/prePublishCheck.js) stops one bad page. This
// checks the things that decide how the whole site is treated: what the
// crawler is allowed to see, whether the sitemap points at pages that
// actually exist, and whether the structured data is there to be read.
//
// Every check reports PASS / FAIL / WARN with the reason, and exits non-zero
// on any FAIL so it can gate a deploy. It asserts nothing it has not
// fetched — a check that guesses is worse than no check, because it gets
// trusted.
//
// Grounded in this site's real history:
//   2026-07-31  AdSense "low value content" — thin, templated pages.
//   2026-08-04  Sitemap/index hygiene never verified end to end; 404s had
//               previously been reported in Search Console.

const BASE = (process.argv[2] || "https://evcrm.in").replace(/\/$/, "")
const UA = "EvCRM-Preflight/1.0 (+https://evcrm.in)"

let failures = 0, warnings = 0
const pass = (m) => console.log(`  PASS  ${m}`)
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`) }
const warn = (m) => { warnings++; console.log(`  WARN  ${m}`) }

async function get(path, { asText = true } = {}) {
  const url = path.startsWith("http") ? path : BASE + path
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })
    return { ok: res.ok, status: res.status, body: asText ? await res.text() : null, url }
  } catch (e) {
    return { ok: false, status: 0, body: null, url, error: e.message }
  }
}

// ── 1. Crawler access ──────────────────────────────────────────────────
async function checkRobots() {
  console.log("\n[1] Crawler access")
  const r = await get("/robots.txt")
  if (!r.ok) return fail(`robots.txt returned ${r.status || r.error}`)

  // A blanket disallow is the single most expensive mistake here: it is
  // invisible on the site and silently removes you from search.
  if (/^\s*Disallow:\s*\/\s*$/mi.test(r.body) && !/^\s*Allow:/mi.test(r.body)) {
    fail("robots.txt contains a blanket 'Disallow: /' — the whole site is blocked from crawling.")
  } else {
    pass("robots.txt served and does not block the site")
  }

  if (!/sitemap:/i.test(r.body)) warn("robots.txt does not reference a Sitemap: line")
  else pass("robots.txt references a sitemap")
}

// ── 2. Sitemap integrity ───────────────────────────────────────────────
// A sitemap listing URLs that 404 tells Google the site is unmaintained.
// Sampled rather than exhaustive, so this stays cheap to run.
async function checkSitemap() {
  console.log("\n[2] Sitemap")
  const r = await get("/sitemap.xml")
  if (!r.ok) return fail(`sitemap.xml returned ${r.status || r.error}`)

  const urls = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())
  if (!urls.length) return fail("sitemap.xml contains no <loc> entries")
  pass(`sitemap lists ${urls.length} URLs`)

  const offSite = urls.filter(u => !u.startsWith(BASE) && !u.startsWith("https://evcrm.in"))
  if (offSite.length) fail(`${offSite.length} sitemap URLs point off-site, e.g. ${offSite[0]}`)

  const dupes = urls.length - new Set(urls).size
  if (dupes) warn(`${dupes} duplicate URLs in sitemap`)

  // Sample up to 12, spread across the list rather than the first 12 —
  // the first entries are usually the static routes, which always work.
  const step = Math.max(1, Math.floor(urls.length / 12))
  const sample = urls.filter((_, i) => i % step === 0).slice(0, 12)
  let broken = 0
  for (const u of sample) {
    const res = await fetch(u, { headers: { "User-Agent": UA }, method: "GET", redirect: "follow" }).catch(() => null)
    if (!res || !res.ok) { broken++; console.log(`        ${res ? res.status : "ERR"}  ${u}`) }
  }
  if (broken) fail(`${broken} of ${sample.length} sampled sitemap URLs do not return 200`)
  else pass(`all ${sample.length} sampled sitemap URLs return 200`)
}

// ── 3. Indexability of key pages ───────────────────────────────────────
async function checkPages() {
  console.log("\n[3] Key pages")
  const paths = ["/", "/showroom", "/blog", "/learn", "/charging"]
  for (const p of paths) {
    const r = await get(p)
    if (!r.ok) { fail(`${p} returned ${r.status || r.error}`); continue }

    const problems = []
    if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(r.body)) problems.push("noindex")
    const title = (r.body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim()
    if (!title) problems.push("no <title>")
    else if (title.length < 10) problems.push(`title too short ("${title}")`)
    const desc = (r.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1]
    if (!desc) problems.push("no meta description")

    if (problems.length) warn(`${p}: ${problems.join(", ")}`)
    else pass(`${p} indexable, has title and description`)
  }
}

// ── 4. Structured data ─────────────────────────────────────────────────
// How Google extracts facts rather than reading prose. Its absence on a
// vehicle site is the largest single SEO gap this project has.
async function checkStructuredData() {
  console.log("\n[4] Structured data")
  const r = await get("/showroom")
  if (!r.ok) return fail(`/showroom returned ${r.status || r.error}`)

  const blocks = [...r.body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1])
  if (!blocks.length) return fail("/showroom has no JSON-LD structured data at all")

  const types = new Set()
  let bad = 0
  for (const b of blocks) {
    try {
      const j = JSON.parse(b)
      const collect = (o) => { if (o && o["@type"]) types.add(o["@type"]) }
      Array.isArray(j) ? j.forEach(collect) : collect(j)
      if (j["@graph"]) j["@graph"].forEach(collect)
    } catch { bad++ }
  }
  if (bad) fail(`${bad} JSON-LD block(s) are not valid JSON — Google will ignore them silently`)
  else pass(`${blocks.length} valid JSON-LD block(s): ${[...types].join(", ") || "no @type found"}`)

  if (![...types].some(t => /Vehicle|Car|Product/i.test(t))) {
    warn("No Vehicle/Car/Product schema found. For a vehicle marketplace this is the highest-value schema to add — it is how specs and prices get extracted as facts.")
  }
}

// ── 5. AI/agent discovery ──────────────────────────────────────────────
async function checkAiDiscovery() {
  console.log("\n[5] AI discovery")
  for (const p of ["/llms.txt", "/.well-known/mcp.json"]) {
    const r = await get(p)
    r.ok ? pass(`${p} served`) : warn(`${p} returned ${r.status || r.error}`)
  }
  const mcp = await fetch(BASE + "/api/mcp", {
    method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }).then(r => r.json()).catch(() => null)
  const n = mcp?.result?.tools?.length
  n ? pass(`MCP server responds with ${n} tools`) : fail("MCP server did not return a tool list")
}

async function main() {
  console.log(`Site preflight — ${BASE}`)
  await checkRobots()
  await checkSitemap()
  await checkPages()
  await checkStructuredData()
  await checkAiDiscovery()

  console.log(`\n${failures} failure(s), ${warnings} warning(s)`)
  if (failures) {
    console.log("Do not drive traffic or request indexing until the failures are fixed.")
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
