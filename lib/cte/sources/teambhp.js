/**
 * Source adapter: Team-BHP (team-bhp.com)
 *
 * DETERMINISTIC. No LLM. Hits the Team-BHP search endpoint for price
 * announcements and extracts facts from structured meta data.
 * Team-BHP is India's most trusted automotive enthusiast community
 * and is the gold standard for price launch announcements.
 */

const BASE_URL = "https://www.team-bhp.com"
const SOURCE_NAME = "Team-BHP (team-bhp.com)"
const UA = "EvCRM-CTE/1.0 (+https://evcrm.in)"

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractMeta(html, attr) {
  const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${attr}["'][^>]*content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${attr}["']`, "i"))
  return m ? m[1].trim() : null
}

/** Extracts price mentions from a block of text using INR pattern matching. */
function extractPriceFromText(text) {
  // Match patterns like "Rs. 9.99 lakh", "₹10.31 lakh", "Rs 8,50,000"
  const lakhPattern = /(?:rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*lakh/gi
  const absPattern = /(?:rs\.?|₹)\s*([\d,]+)/gi

  const results = []
  let m

  while ((m = lakhPattern.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, "")) * 100000
    if (Number.isFinite(val) && val > 100000) results.push(Math.round(val))
  }

  if (!results.length) {
    while ((m = absPattern.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ""))
      if (Number.isFinite(val) && val > 100000 && val < 100000000) results.push(Math.round(val))
    }
  }

  return results
}

/**
 * Searches Team-BHP for price articles about a vehicle and returns
 * price facts extracted from article metadata.
 */
export async function fetchTeamBhpPrice(query) {
  const searchTerms = String(query || "")
    .replace(/price|on.road|ex.showroom|launch|india|mileage|range|ev|electric|car|variant|\d{4}/gi, "")
    .trim()
    .replace(/\s+/g, "+")

  if (!searchTerms) return null

  const searchUrl = `${BASE_URL}/forum/search?query=${encodeURIComponent(searchTerms)}&type=1`
  const html = await safeFetch(searchUrl)
  if (!html) return null

  const fetchedAt = new Date().toISOString()
  const facts = []

  // Extract prices from the search result page meta description
  const ogDesc = extractMeta(html, "og:description") || ""
  const pageTitle = extractMeta(html, "og:title") || ""
  const combinedText = `${pageTitle} ${ogDesc}`

  const prices = extractPriceFromText(combinedText)
  for (const price of prices.slice(0, 3)) {
    facts.push({
      metric: "ex_showroom_price",
      value: price,
      unit: "INR",
      scope: query,
      period: fetchedAt,
      sourceName: SOURCE_NAME,
      sourceUrl: searchUrl,
      fetchedAt,
    })
  }

  return facts.length ? { facts, sourceUrl: searchUrl } : null
}
