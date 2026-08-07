/**
 * Universal Automobile Crawler — the MCP realtime_live_crawl engine.
 *
 * DETERMINISTIC. No LLM. No AI. Pure HTTP + structured data extraction.
 *
 * Fans out to India's most trusted automobile sources in parallel,
 * collects all price facts, removes duplicates, builds a consensus
 * answer, and returns clean structured data to the MCP tool.
 *
 * Sources covered:
 *   1. CarWale        — India's #1 auto portal (JSON-LD)
 *   2. CarDekho       — India's #2 auto portal (JSON-LD)
 *   3. ZigWheels      — Specs & pricing portal (JSON-LD)
 *   4. Team-BHP       — India's most trusted auto community
 *   5. data.gov.in    — Government official EV registration data
 *
 * Deduplication strategy:
 *   Prices within ±2% of each other from different sources are treated
 *   as the same price (accounting for rounding/variant differences).
 *   The most common price cluster wins. Source count is reported so
 *   the AI can convey confidence level to the user.
 */

import { fetchCarWalePrice } from "./sources/carwale.js"
import { fetchCarDekhoPrice } from "./sources/cardekho.js"
import { fetchZigWheelsPrice } from "./sources/zigwheels.js"
import { fetchTeamBhpPrice } from "./sources/teambhp.js"
import { liveCrawlAnswer } from "./liveCrawl.js"
import { getSitesForQuery, buildCrawlUrl } from "./siteMap.js"

const AZURE_BROWSER_URL = process.env.AZURE_BROWSER_URL || "http://localhost:8080/crawl"

/** Calls the Playwright Azure container to crawl a protected site. */
async function azureBrowserCrawl(url, query) {
  try {
    const res = await fetch(AZURE_BROWSER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, query }),
      signal: AbortSignal.timeout(15000), // 15 seconds max for full render
    })
    if (!res.ok) return null
    return await res.json() // { facts, excerpt, sourceUrl, fetchedAt }
  } catch {
    return null
  }
}


const PRICE_TOLERANCE = 0.02 // 2% — treats near-identical prices as one

/** Groups prices that are within PRICE_TOLERANCE of each other. */
function clusterPrices(allFacts) {
  const clusters = []

  for (const fact of allFacts) {
    const v = fact.value
    let placed = false
    for (const c of clusters) {
      const mid = c.reduce((s, f) => s + f.value, 0) / c.length
      if (Math.abs(v - mid) / mid <= PRICE_TOLERANCE) {
        c.push(fact)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([fact])
  }

  return clusters
}

/** Picks the largest cluster and builds the consensus fact. */
function buildConsensus(clusters, query) {
  if (!clusters.length) return null

  // Largest cluster = most sources agree
  clusters.sort((a, b) => b.length - a.length)
  const winner = clusters[0]

  const avgPrice = Math.round(winner.reduce((s, f) => s + f.value, 0) / winner.length)
  const sources = [...new Set(winner.map(f => f.sourceName))]
  const sourceUrls = [...new Set(winner.map(f => f.sourceUrl))]

  return {
    metric: winner[0].metric || "ex_showroom_price",
    value: avgPrice,
    unit: "INR",
    scope: query,
    sourcesAgreed: sources.length,
    sourceNames: sources,
    sourceUrls,
    confidence: sources.length >= 3 ? "high" : sources.length === 2 ? "medium" : "low",
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Main entry point for the realtime_live_crawl MCP tool.
 *
 * Fans out to all sources in parallel, deduplicates, and returns
 * a clean consensus answer. Returns null only if every source fails.
 *
 * @param {string} query  Free-text query, e.g. "MG Comet EV price"
 */
export async function universalCrawl(query) {
  const crawledAt = new Date().toISOString()

  // Fan out to all sources in parallel — one slow/blocked site
  // must never delay the others.
  const [carwale, cardekho, zigwheels, teambhp, govtData] = await Promise.allSettled([
    fetchCarWalePrice(query),
    fetchCarDekhoPrice(query),
    fetchZigWheelsPrice(query),
    fetchTeamBhpPrice(query),
    liveCrawlAnswer(query),
  ])

  const allFacts = []
  const sourceReport = []
  const errors = []

  // Collect results from commercial auto portals
  for (const [name, result, fallbackUrl] of [
    ["CarWale", carwale, buildCrawlUrl(getSitesForQuery(query).find(s => s.domain === "carwale.com"), query)],
    ["CarDekho", cardekho, buildCrawlUrl(getSitesForQuery(query).find(s => s.domain === "cardekho.com"), query)],
    ["ZigWheels", zigwheels, buildCrawlUrl(getSitesForQuery(query).find(s => s.domain === "zigwheels.com"), query)],
    ["Team-BHP", teambhp, buildCrawlUrl(getSitesForQuery(query).find(s => s.domain === "team-bhp.com"), query)],
  ]) {
    if (result.status === "fulfilled" && result.value?.facts?.length) {
      allFacts.push(...result.value.facts)
      sourceReport.push({ source: name, url: result.value.sourceUrl, factsFound: result.value.facts.length })
    } else {
      // Plain fetch failed (likely blocked) — fallback to Azure Auto Browser!
      console.log(`[universalCrawler] Plain fetch failed for ${name}, trying Azure Auto Browser at ${fallbackUrl}`)
      const browserResult = await azureBrowserCrawl(fallbackUrl, query)
      
      if (browserResult?.facts?.length) {
        allFacts.push(...browserResult.facts)
        sourceReport.push({ 
          source: name, 
          url: browserResult.sourceUrl, 
          factsFound: browserResult.facts.length,
          via: "auto-browser" 
        })
      } else {
        const err = result.status === "rejected" ? result.reason?.message : "blocked/no matching page found"
        errors.push({ source: name, error: err })
        sourceReport.push({ source: name, factsFound: 0, note: "failed even with auto-browser" })
      }
    }
  }

  // Collect results from government data (different fact shape — market stats)
  if (govtData.status === "fulfilled" && govtData.value?.facts?.length) {
    allFacts.push(...govtData.value.facts)
    sourceReport.push({
      source: "data.gov.in",
      factsFound: govtData.value.facts.length,
      parsed: govtData.value.parsed,
    })
  }

  if (!allFacts.length) {
    return {
      crawledAt,
      sourcesQueried: sourceReport,
      facts: [],
      consensus: null,
      errors: errors.length ? errors : undefined,
      note: "No matching data found across all sources for this query.",
    }
  }

  // Separate price facts from other facts (govt stats, etc.)
  const priceFacts = allFacts.filter(f => f.metric === "ex_showroom_price" && f.value > 10000)
  const otherFacts = allFacts.filter(f => f.metric !== "ex_showroom_price")

  let consensus = null
  if (priceFacts.length) {
    const clusters = clusterPrices(priceFacts)
    consensus = buildConsensus(clusters, query)
  }

  return {
    crawledAt,
    sourcesQueried: sourceReport,
    consensus,
    allPriceFacts: priceFacts,
    otherFacts,
    errors: errors.length ? errors : undefined,
    note: consensus
      ? `Consensus price from ${consensus.sourcesAgreed} independent source(s). Confidence: ${consensus.confidence}.`
      : otherFacts.length
      ? "No commercial pricing found, but government data facts were retrieved."
      : null,
  }
}
