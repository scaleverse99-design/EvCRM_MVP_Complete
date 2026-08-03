import { getCityPricePairs } from "../../lib/masterCatalog"

// ── /price/sitemap.xml ─────────────────────────────────────────────
// Dynamic sitemap for all model-x-city programmatic on-road price pages.
export const dynamic = "force-dynamic"

export default function sitemap() {
  const baseUrl = "https://evcrm.in"
  const now = new Date().toISOString()

  const pairs = getCityPricePairs()

  return pairs.map(p => ({
    url: `${baseUrl}/price/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))
}
