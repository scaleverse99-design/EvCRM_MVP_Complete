import { getActiveDripUrls } from "../../lib/dripPublisher.js"

// ── /price/sitemap.xml ─────────────────────────────────────────────
// Dynamic sitemap dripping 2,000 Google-approved articles daily.
export const dynamic = "force-dynamic"

export default function sitemap() {
  const now = new Date().toISOString()
  const activeUrls = getActiveDripUrls()

  return activeUrls.map(url => ({
    url,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))
}
