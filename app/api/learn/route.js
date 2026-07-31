export const dynamic = "force-dynamic"

import { readTable } from "@/lib/store"
import { ensureDailyNewsRefresh, shouldTriggerDailyRefresh } from "@/lib/orchestrator/dailyRefresh"

const CATEGORIES = ["EV Fundamentals", "ICE Fundamentals", "Buying Guides", "Tech Trends"]

// Public GET — published knowledge-hub articles, grouped by category.
// Separate content type from the per-model blog_posts (type:"knowledge"
// vs the default model-hub articles) sharing the same table/schema-free
// jsonb structure.
export async function GET() {
  const all = await readTable("blog_posts")
  const knowledge = all
    .filter(p => p.status === "published" && p.type === "knowledge")
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .map(({ body, ...rest }) => rest)

  // Fire-and-forget background news refresh if stale (> 6 hours old).
  if (shouldTriggerDailyRefresh(all)) {
    ensureDailyNewsRefresh().catch(err =>
      console.error("[/api/learn] Background news refresh failed:", err.message)
    )
  }

  // Group by category for the /learn hero grid
  const byCategory = {}
  CATEGORIES.forEach(cat => {
    byCategory[cat] = knowledge.filter(p => p.category === cat)
  })
  const uncategorized = knowledge.filter(p => !CATEGORIES.includes(p.category))
  if (uncategorized.length > 0) {
    byCategory["Other Guides"] = uncategorized
  }

  return Response.json({
    success: true,
    articles: knowledge,
    total: knowledge.length,
    byCategory,
    categories: Object.keys(byCategory).filter(cat => byCategory[cat].length > 0),
  })
}
