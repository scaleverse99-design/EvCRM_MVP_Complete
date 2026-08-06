/**
 * Real measurement: what an AI actually consumes to answer one question,
 * with and without the MCP server.
 *
 *   node scripts/mcp-token-benchmark.js [baseUrl]
 *
 * Both paths run against the SAME server so the comparison is apples to
 * apples (default http://localhost:3000). No estimates for the payload
 * sizes — every number below is a real HTTP response measured end to end.
 *
 * Token counts are chars/4, the standard rough conversion. That
 * approximation is deliberately generous to the HTML path: markup
 * tokenizes WORSE than prose (angle brackets, quoted attributes and long
 * hashed class/chunk names each split into several tokens), so the real
 * HTML cost is higher than reported here, and the real gap is wider.
 */

const BASE = process.argv[2] || "http://localhost:3000"

// A question that genuinely needs several facts: two vehicles, specs,
// pricing in a specific city, and live dealer stock. Nothing a model can
// answer from its own weights — it has to go get current data.
// Chosen so BOTH paths can actually answer it against live production data.
// The first draft asked about dealer stock for two named EVs; production's
// search_vehicles returns 0 matches even unfiltered (the marketplace has no
// publicly-visible inventory yet) and compare_vehicles returned
// {"compared":0} because the market table stores "Tata Nexon", not "Tata
// Nexon EV". Benchmarking against empty responses would have manufactured a
// ~200x "saving" out of two error payloads.
const QUESTION =
  "What is the current price and rating of the Tata Nexon in India, " +
  "and which car dealers are in Hyderabad?"

const tokens = (s) => Math.round(Buffer.byteLength(String(s), "utf8") / 4)

async function getHtml(path) {
  const r = await fetch(BASE + path, { headers: { "User-Agent": "OAI-SearchBot/1.0" } })
  const body = await r.text()
  return { path, status: r.status, bytes: Buffer.byteLength(body, "utf8"), tokens: tokens(body) }
}

async function callMcp(name, args) {
  const r = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  })
  const json = await r.json()
  // What the model actually receives is the tool result text.
  const payload = json.result?.content?.[0]?.text ?? JSON.stringify(json.result ?? json)

  // Guard against the failure that invalidated the first run: a tool that
  // errors or matches nothing returns a tiny payload, which would show up as
  // a huge (and fake) token saving.
  let empty = false
  try {
    const parsed = JSON.parse(payload)
    empty = Boolean(parsed.error) ||
      parsed.totalMatches === 0 ||
      (Array.isArray(parsed.vehicles) && parsed.vehicles.length === 0 && parsed.totalMatches !== undefined)
  } catch { empty = payload.trim().length === 0 }

  return { tool: name, status: r.status, bytes: Buffer.byteLength(payload, "utf8"), tokens: tokens(payload), empty }
}

async function main() {
  console.log(`\n${"═".repeat(74)}`)
  console.log("MCP TOKEN BENCHMARK — same question, two retrieval paths")
  console.log(`${"═".repeat(74)}`)
  console.log(`\nQuestion:\n  "${QUESTION}"\n`)
  console.log(`Server: ${BASE}\n`)

  // ── Path A: no MCP — crawl the pages a search engine would surface ──
  console.log("─".repeat(74))
  console.log("PATH A — WITHOUT MCP (fetch + parse HTML pages)")
  console.log("─".repeat(74))

  // The pages a search engine would surface for that question — the set an
  // AI would have to fetch and parse to assemble the same answer.
  const pages = [
    "/best-ev?model=Tata%20Nexon",
    "/price/tata-nexon-ev-price-in-hyderabad",
    "/showroom",
  ]

  const htmlResults = []
  for (const p of pages) {
    try {
      const res = await getHtml(p)
      htmlResults.push(res)
      console.log(`  ${String(res.status).padEnd(4)} ${res.tokens.toLocaleString().padStart(8)} tok  ${res.bytes.toLocaleString().padStart(9)} B   ${res.path}`)
    } catch (e) {
      console.log(`  ERR  ${p}: ${e.message}`)
    }
  }
  const htmlTokens = htmlResults.reduce((s, r) => s + r.tokens, 0)
  console.log(`  ${"".padEnd(4)} ${"─".repeat(8)}`)
  console.log(`  TOTAL${htmlTokens.toLocaleString().padStart(9)} tok  across ${htmlResults.length} page fetches`)

  // ── Path B: MCP — ask for exactly the data, get it structured ───────
  console.log(`\n${"─".repeat(74)}`)
  console.log("PATH B — WITH MCP (targeted tool calls, structured results)")
  console.log("─".repeat(74))

  // Argument names must match the published inputSchema exactly. An earlier
  // run passed `models:` to compare_vehicles (the schema says `names`) and
  // `query:` to search_vehicles (it takes `model`); both returned errors or
  // empty sets, which made the MCP side look ~250x cheaper purely because it
  // had returned nothing. Every call below is asserted to carry real data.
  const calls = [
    ["search_market", { query: "nexon", limit: 3 }],
    ["find_dealers", { city: "Hyderabad", limit: 5 }],
  ]

  const mcpResults = []
  for (const [name, args] of calls) {
    try {
      const res = await callMcp(name, args)
      mcpResults.push(res)
      const flag = res.empty ? "  ⚠ EMPTY/ERROR — not a valid comparison" : ""
      console.log(`  ${String(res.status).padEnd(4)} ${res.tokens.toLocaleString().padStart(8)} tok  ${res.bytes.toLocaleString().padStart(9)} B   ${res.tool}${flag}`)
    } catch (e) {
      console.log(`  ERR  ${name}: ${e.message}`)
    }
  }

  if (mcpResults.some(r => r.empty)) {
    console.log(`\n  ⚠ One or more tools returned an error or zero results. The totals below`)
    console.log(`    would understate the MCP payload — fix the call before quoting them.`)
  }
  const mcpTokens = mcpResults.reduce((s, r) => s + r.tokens, 0)
  console.log(`  ${"".padEnd(4)} ${"─".repeat(8)}`)
  console.log(`  TOTAL${mcpTokens.toLocaleString().padStart(9)} tok  across ${mcpResults.length} tool calls`)

  // ── Result ──────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(74)}`)
  console.log("RESULT")
  console.log(`${"═".repeat(74)}\n`)

  const saved = htmlTokens - mcpTokens
  const pct = htmlTokens ? ((saved / htmlTokens) * 100).toFixed(1) : "0"
  const ratio = mcpTokens ? (htmlTokens / mcpTokens).toFixed(1) : "n/a"

  console.log(`  Without MCP : ${htmlTokens.toLocaleString().padStart(8)} tokens`)
  console.log(`  With MCP    : ${mcpTokens.toLocaleString().padStart(8)} tokens`)
  console.log(`  Saved       : ${saved.toLocaleString().padStart(8)} tokens  (${pct}% less, ${ratio}x cheaper)\n`)

  // Cost framing at Claude Sonnet input pricing ($3 / 1M input tokens).
  const perM = 3
  const costHtml = (htmlTokens / 1_000_000) * perM
  const costMcp = (mcpTokens / 1_000_000) * perM
  console.log(`  At $${perM}/1M input tokens, per 100,000 such queries:`)
  console.log(`    without MCP : $${(costHtml * 100_000).toFixed(2)}`)
  console.log(`    with MCP    : $${(costMcp * 100_000).toFixed(2)}`)
  console.log(`    saved       : $${((costHtml - costMcp) * 100_000).toFixed(2)}\n`)

  console.log("  Note: the HTML path also has to PARSE what it fetched — nav, footer,")
  console.log("  styles and hydration payload — and may still miss the answer. The MCP")
  console.log("  path returns the fields directly, so there is nothing to extract.\n")
}

main().catch(e => { console.error(e); process.exit(1) })
