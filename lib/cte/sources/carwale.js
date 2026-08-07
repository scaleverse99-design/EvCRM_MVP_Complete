/**
 * Source adapter: CarWale (carwale.com)
 *
 * DETERMINISTIC. No LLM. Fetches CarWale vehicle price pages, extracts
 * structured data from JSON-LD and Open Graph meta tags, and returns
 * price facts. Same query, same answer.
 *
 * CarWale embeds schema.org Product JSON-LD on every price page,
 * making extraction reliable without HTML parsing or regex guessing.
 */

const BASE_URL = "https://www.carwale.com"
const SOURCE_NAME = "CarWale (carwale.com)"
const UA = "EvCRM-CTE/1.0 (+https://evcrm.in)"

/** Normalizes a brand/model string into a CarWale-style URL slug. */
function toSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
}

/** Attempts to extract the brand and model from a free-text query. */
export function parseQuery(query) {
  const q = String(query || "").toLowerCase()
  // Known brand aliases used by CarWale
  const brands = [
    { match: /\bmg\b/, slug: "mg-cars" },
    { match: /\btata\b/, slug: "tata-cars" },
    { match: /\bhyundai\b/, slug: "hyundai-cars" },
    { match: /\bmaruti\b|\bsuzuki\b/, slug: "maruti-cars" },
    { match: /\bkia\b/, slug: "kia-cars" },
    { match: /\bkona\b|\bioniq\b|\bionic\b/, slug: "hyundai-cars" },
    { match: /\boxford\b|\bwxl\b|\bcomet\b|\bwindsor\b|\bgloster\b|\bhector\b/, slug: "mg-cars" },
    { match: /\bnexon\b|\btigor\b|\bcurvv\b|\bpunch\b/, slug: "tata-cars" },
    { match: /\bमहिंद्रा\b|\bmahindra\b/, slug: "mahindra-cars" },
    { match: /\brenault\b/, slug: "renault-cars" },
    { match: /\bvolkswagen\b|\bvw\b/, slug: "volkswagen-cars" },
    { match: /\bskoda\b/, slug: "skoda-cars" },
    { match: /\bhonda\b/, slug: "honda-cars" },
    { match: /\btoyota\b/, slug: "toyota-cars" },
    { match: /\bjeep\b/, slug: "jeep-cars" },
    { match: /\bford\b/, slug: "ford-cars" },
    { match: /\bbmw\b/, slug: "bmw-cars" },
    { match: /\bmercedes\b|\bbenz\b/, slug: "mercedes-benz-cars" },
    { match: /\baudi\b/, slug: "audi-cars" },
    { match: /\bnissan\b/, slug: "nissan-cars" },
    { match: /\bcitroen\b/, slug: "citroen-cars" },
  ]

  let brandSlug = null
  for (const b of brands) {
    if (b.match.test(q)) { brandSlug = b.slug; break }
  }

  // Extract model: everything after the brand name, strip price/year noise
  const modelWords = q
    .replace(/price|on.road|ex.showroom|launch|india|mileage|range|ev|electric|car|variant|top|base|\d{4}/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)

  return { brandSlug, modelSlug: toSlug(modelWords.join(" ")) }
}

/** Fetches a URL and returns text, or null on failure. */
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

/** Extracts the first JSON-LD block of a given @type from HTML. */
function extractJsonLd(html, type) {
  const blocks = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item["@type"] === type) blocks.push(item)
        // Handle @graph
        if (item["@graph"]) {
          for (const node of item["@graph"]) {
            if (node["@type"] === type) blocks.push(node)
          }
        }
      }
    } catch { /* skip malformed */ }
  }
  return blocks
}

/** Extracts a meta tag content by property or name. */
function extractMeta(html, attr) {
  const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${attr}["'][^>]*content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${attr}["']`, "i"))
  return m ? m[1].trim() : null
}

/**
 * Fetches the CarWale price page for a vehicle and returns structured facts.
 * Returns null if the page cannot be fetched or no price is found.
 */
export async function fetchCarWalePrice(query) {
  const { brandSlug, modelSlug } = parseQuery(query)
  if (!brandSlug || !modelSlug) return null

  const url = `${BASE_URL}/${brandSlug}/${modelSlug}/`
  const html = await safeFetch(url)
  if (!html) return null

  const fetchedAt = new Date().toISOString()
  const facts = []

  // 1. Try JSON-LD Product schema (most reliable)
  const products = extractJsonLd(html, "Product")
  for (const product of products) {
    const offers = product.offers
    if (!offers) continue
    const offerList = Array.isArray(offers) ? offers : [offers]
    for (const offer of offerList) {
      const price = parseFloat(String(offer.price || "").replace(/,/g, ""))
      if (!Number.isFinite(price) || price < 10000) continue
      facts.push({
        metric: "ex_showroom_price",
        value: price,
        unit: offer.priceCurrency || "INR",
        scope: product.name || query,
        period: fetchedAt,
        sourceName: SOURCE_NAME,
        sourceUrl: url,
        fetchedAt,
      })
    }
  }

  // 2. Try Open Graph / meta price hints as fallback
  if (!facts.length) {
    const ogDesc = extractMeta(html, "og:description") || ""
    const priceMatch = ogDesc.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(?:lakh)?/i)
    if (priceMatch) {
      const raw = parseFloat(priceMatch[1].replace(/,/g, ""))
      if (Number.isFinite(raw)) {
        const value = raw < 1000 ? raw * 100000 : raw // convert lakhs
        facts.push({
          metric: "ex_showroom_price",
          value,
          unit: "INR",
          scope: query,
          period: fetchedAt,
          sourceName: SOURCE_NAME,
          sourceUrl: url,
          fetchedAt,
        })
      }
    }
  }

  return facts.length ? { facts, sourceUrl: url } : null
}
