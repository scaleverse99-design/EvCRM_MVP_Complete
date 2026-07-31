/**
 * benchmark-mcp-token-savings.js
 *
 * Measures REAL token usage for the same queries answered two ways:
 *   1. Claude with the web_search tool (no MCP) — has to search + read pages
 *   2. Claude with evcrm.in/api/mcp connected via the MCP connector
 * and reports the actual delta from response.usage, not an estimate.
 *
 * Requires ANTHROPIC_API_KEY (or CLAUDE_API_KEY) in .env. Without a real key
 * this script refuses to print numbers rather than fabricate them — see the
 * CTE incident (2026-07-31, CTE_BUILD_PLAN.md §7b) this project already hit
 * once from a "benchmark" that used hardcoded constants instead of real
 * measurements. No fabricated data, ever.
 */

const fs = require('fs')
const path = require('path')

// Load .env the same way the other cte-engine/orchestrator scripts do.
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m) {
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = val
    }
  })
}

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
const MODEL = 'claude-sonnet-5'
const MCP_URL = 'https://evcrm.in/api/mcp'

const QUERIES = [
  'Compare Ather 450X vs TVS iQube specs and pricing in India',
  'Find top electric 2W models under 1.5 Lakhs with real range > 100km',
  'What is the cheapest EV under 15 lakhs available in India right now',
]

async function callClaude({ query, useMcp }) {
  const body = {
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: query }],
  }

  if (useMcp) {
    body.mcp_servers = [{ type: 'url', name: 'evcrm', url: MCP_URL }]
    body.tools = [{ type: 'mcp_toolset', mcp_server_name: 'evcrm' }]
  } else {
    body.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }]
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  }
  if (useMcp) headers['anthropic-beta'] = 'mcp-client-2025-11-20'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data
}

async function runBenchmark() {
  console.log('=================================================================')
  console.log('CTE MCP TOKEN SAVINGS BENCHMARK — REAL MEASURED DATA')
  console.log('=================================================================\n')

  if (!API_KEY) {
    console.log('NO ANTHROPIC_API_KEY / CLAUDE_API_KEY CONFIGURED.')
    console.log('This script measures real token usage via live API calls — it will')
    console.log('not print fabricated numbers. Set the key in .env and re-run.')
    console.log('=================================================================')
    process.exitCode = 1
    return
  }

  let totalWithout = 0
  let totalWith = 0
  const results = []

  for (const query of QUERIES) {
    console.log(`Query: "${query}"`)
    try {
      const withoutMcp = await callClaude({ query, useMcp: false })
      const withoutTokens = (withoutMcp.usage?.input_tokens || 0) + (withoutMcp.usage?.output_tokens || 0)
      console.log(`  Without MCP (web_search): ${withoutTokens} tokens (in=${withoutMcp.usage?.input_tokens}, out=${withoutMcp.usage?.output_tokens})`)

      const withMcp = await callClaude({ query, useMcp: true })
      const withTokens = (withMcp.usage?.input_tokens || 0) + (withMcp.usage?.output_tokens || 0)
      console.log(`  With CTE MCP:             ${withTokens} tokens (in=${withMcp.usage?.input_tokens}, out=${withMcp.usage?.output_tokens})`)

      const saved = withoutTokens - withTokens
      const pct = withoutTokens > 0 ? ((saved / withoutTokens) * 100).toFixed(1) : '0.0'
      console.log(`  Delta: ${saved} tokens (${pct}%)\n`)

      totalWithout += withoutTokens
      totalWith += withTokens
      results.push({ query, withoutTokens, withTokens, saved, pct })
    } catch (e) {
      console.log(`  ERROR: ${e.message}\n`)
      results.push({ query, error: e.message })
    }
  }

  const validResults = results.filter(r => !r.error)
  if (validResults.length === 0) {
    console.log('No successful measurements — cannot report a real number.')
    process.exitCode = 1
    return
  }

  const totalSaved = totalWithout - totalWith
  const avgPct = totalWithout > 0 ? ((totalSaved / totalWithout) * 100).toFixed(1) : '0.0'

  console.log('-----------------------------------------------------------------')
  console.log(`SUMMARY (${validResults.length}/${QUERIES.length} queries measured successfully):`)
  console.log(`  Total tokens without MCP: ${totalWithout}`)
  console.log(`  Total tokens with MCP:    ${totalWith}`)
  console.log(`  Net saved:                ${totalSaved} (${avgPct}%)`)
  console.log('=================================================================')
  console.log('These are real measured numbers from live API calls, safe to cite.')
}

runBenchmark().catch(e => { console.error(e); process.exitCode = 1 })
