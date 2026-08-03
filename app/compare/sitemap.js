import { getComparisonPairs } from "../../lib/masterCatalog"

// ── /compare/sitemap.xml ─────────────────────────────────────────────
// Dynamic sitemap for all model-vs-model programmatic comparison pages.
export const dynamic = "force-dynamic"

export default function sitemap() {
  const baseUrl = "https://evcrm.in"
  const now = new Date().toISOString()

  const pairs = getComparisonPairs()

  return pairs.map(p => ({
    url: `${baseUrl}/compare/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))
}
