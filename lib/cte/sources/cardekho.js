/**
 * Source adapter: CarDekho (cardekho.com)
 *
 * DETERMINISTIC. No LLM. Fetches CarDekho price pages and extracts
 * structured pricing data from JSON-LD and meta tags.
 */

const BASE_URL = "https://www.cardekho.com"
const SOURCE_NAME = "CarDekho (cardekho.com)"
const UA = "EvCRM-CTE/1.0 (+https://evcrm.in)"

export function parseQuery(query) {
  const q = String(query || "").toLowerCase()
  const brands = [
    { match: /\bmg\b/, slug: "mg" },
    { match: /\btata\b/, slug: "tata" },
    { match: /\bhyundai\b/, slug: "hyundai" },
    { match: /\bmaruti\b|\bsuzuki\b/, slug: "maruti" },
    { match: /\bkia\b/, slug: "kia" },
    { match: /\bmahindra\b/, slug: "mahindra" },
    { match: /\brenault\b/, slug: "renault" },
    { match: /\bvolkswagen\b|\bvw\b/, slug: "volkswagen" },
    { match: /\bskoda\b/, slug: "skoda" },
    { match: /\bhonda\b/, slug: "honda" },
    { match: /\btoyota\b/, slug: "toyota" },
    { match: /\bjeep\b/, slug: "jeep" },
    { match: /\bniissan\b|\bnissan\b/, slug: "nissan" },
    { match: /\bcitroen\b/, slug: "citroen" },
    { match: /\bbmw\b/, slug: "bmw" },
    { match: /\bmercedes\b|\bbenz\b/, slug: "mercedes-benz" },
    { match: /\baudi\b/, slug: "audi" },
  ]

  let brand = null
  for (const b of brands) {
    if (b.match.test(q)) { brand = b.slug; break }
  }

  const model = q
    .replace(/price|on.road|ex.showroom|launch|india|mileage|range|ev|electric|car|variant|top|base|\d{4}/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .join("-")

  return { brand, model }
}

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
        if (item["@graph"]) {
          for (const node of item["@graph"]) {
            if (node["@type"] === type) blocks.push(node)
          }
        }
      }
    } catch { /* skip */ }
  }
  return blocks
}

export async function fetchCarDekhoPrice(query) {
  const { brand, model } = parseQuery(query)
  if (!brand || !model) return null

  // CarDekho URL pattern: /brand/brand-model-price.htm
  const url = `${BASE_URL}/${brand}/${brand}-${model}-price.htm`
  const html = await safeFetch(url)
  if (!html) return null

  const fetchedAt = new Date().toISOString()
  const facts = []

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

  return facts.length ? { facts, sourceUrl: url } : null
}
