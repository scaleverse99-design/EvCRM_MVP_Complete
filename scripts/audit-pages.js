/**
 * Crawls the live sitemap and reports pages that are broken, empty, or
 * duplicates of each other.
 *
 *   node scripts/audit-pages.js [--full] [--base https://evcrm.in]
 *
 * By default the 1,344 templated /price pages are SAMPLED rather than fully
 * crawled. Every fetch is a real Cloud Run invocation plus ~25KB of egress,
 * and the infra budget has almost no headroom (HANDOFF section 8) — a full
 * pass is ~39MB and thousands of invocations to re-confirm what a sample
 * already shows. Pass --full when you actually need every URL.
 *
 * What it flags:
 *   BROKEN     non-200 status
 *   EMPTY      served, but almost no visible text — a crawler gets nothing
 *   NO_TITLE   missing or generic site-wide <title>, so it cannot rank for
 *              its own topic and collides with every other such page
 *   DUPLICATE  several URLs sharing one <title>, which is how Google
 *              decides pages are the same and drops all but one
 */

const BASE = (() => {
  const i = process.argv.indexOf("--base")
  return i !== -1 ? process.argv[i + 1] : "https://evcrm.in"
})()
const FULL = process.argv.includes("--full")

const UA = { "User-Agent": "Mozilla/5.0 (compatible; EvCRM-SiteAudit/1.0)" }
const CONCURRENCY = 8
const SAMPLE_PER_GROUP = 40

// The layout's fallback title. Any page still serving this cannot rank for
// its own subject — that was true of every article page until 2026-08-07.
const GENERIC_TITLE = /Premier EV Sales OS/i

const decode = s => String(s || "")
  .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()

async function check(url) {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })
    const html = await res.text()
    const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] || "")
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    return { url, status: res.status, title, textBytes: Buffer.byteLength(text, "utf8") }
  } catch (e) {
    return { url, status: 0, title: "", textBytes: 0, error: e.message.slice(0, 40) }
  }
}

async function pool(items, worker, n = CONCURRENCY) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await worker(items[idx])
      if (out.filter(Boolean).length % 25 === 0) process.stdout.write(".")
    }
  }))
  return out
}

const groupOf = u => "/" + (new URL(u).pathname.split("/")[1] || "(home)")

async function main() {
  console.log(`\nSite audit — ${BASE}${FULL ? "  (FULL)" : "  (sampled)"}\n${"=".repeat(66)}`)

  const xml = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text()
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  console.log(`sitemap: ${all.length} URLs`)

  // Sample the big templated groups; crawl everything else in full.
  const byGroup = {}
  all.forEach(u => (byGroup[groupOf(u)] ||= []).push(u))

  let targets = []
  for (const [g, urls] of Object.entries(byGroup)) {
    if (!FULL && urls.length > SAMPLE_PER_GROUP) {
      const step = Math.floor(urls.length / SAMPLE_PER_GROUP)
      const s = urls.filter((_, i) => i % step === 0).slice(0, SAMPLE_PER_GROUP)
      targets.push(...s)
      console.log(`  ${g.padEnd(16)} ${String(urls.length).padStart(5)}  → sampling ${s.length}`)
    } else {
      targets.push(...urls)
      console.log(`  ${g.padEnd(16)} ${String(urls.length).padStart(5)}  → all`)
    }
  }

  console.log(`\ncrawling ${targets.length} URLs`)
  const results = await pool(targets, check)
  console.log("\n")

  const broken = results.filter(r => r.status !== 200)
  const empty = results.filter(r => r.status === 200 && r.textBytes < 500)
  const noTitle = results.filter(r => r.status === 200 && (!r.title || GENERIC_TITLE.test(r.title)))

  const titleMap = {}
  results.filter(r => r.status === 200 && r.title).forEach(r => (titleMap[r.title] ||= []).push(r.url))
  const dupes = Object.entries(titleMap).filter(([, u]) => u.length > 1).sort((a, b) => b[1].length - a[1].length)

  const section = (label, rows, render) => {
    console.log(`${"=".repeat(66)}\n${label}: ${rows.length}\n${"=".repeat(66)}`)
    if (!rows.length) return console.log("  none ✓\n")
    rows.slice(0, 25).forEach(render)
    if (rows.length > 25) console.log(`  … and ${rows.length - 25} more`)
    console.log("")
  }

  section("BROKEN (non-200)", broken, r => console.log(`  ${String(r.status).padEnd(4)} ${r.url}${r.error ? "  " + r.error : ""}`))
  section("EMPTY (<500 bytes of text)", empty, r => console.log(`  ${String(r.textBytes).padStart(5)}B  ${r.url}`))
  section("NO / GENERIC TITLE", noTitle, r => console.log(`  ${r.url}\n         "${r.title || "(none)"}"`))
  section("DUPLICATE TITLES", dupes, ([t, urls]) => {
    console.log(`  ${urls.length}× "${t.slice(0, 62)}"`)
    urls.slice(0, 3).forEach(u => console.log(`        ${u}`))
    if (urls.length > 3) console.log(`        … +${urls.length - 3} more`)
  })

  const ok = results.filter(r => r.status === 200 && r.textBytes >= 500 && r.title && !GENERIC_TITLE.test(r.title)).length
  console.log(`${"=".repeat(66)}\nSUMMARY  crawled ${results.length}`)
  console.log(`  healthy          ${ok}`)
  console.log(`  broken           ${broken.length}`)
  console.log(`  empty            ${empty.length}`)
  console.log(`  no/generic title ${noTitle.length}`)
  console.log(`  duplicate titles ${dupes.reduce((s, [, u]) => s + u.length, 0)} URLs across ${dupes.length} titles\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
