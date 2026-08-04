export const dynamic = "force-dynamic"

import { readTable } from "@/lib/store"
import { ensureDailyNewsRefresh, shouldTriggerDailyRefresh } from "@/lib/orchestrator/dailyRefresh"

// Public GET — published posts only, newest first, no bodies (list view).
export async function GET() {
  const all = await readTable("blog_posts")
  // Deduplicate by slug to ensure zero duplicate cards appear
  const seenSlugs = new Set()
  const published = []

  for (const p of all) {
    if (p.type === "knowledge") continue
    if (p.status && p.status !== "published") continue
    const key = (p.slug || "").toLowerCase().trim()
    if (!key || seenSlugs.has(key)) continue
    seenSlugs.add(key)
    const { body, ...rest } = p
    published.push(rest)
  }

  published.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))

  // Fire-and-forget background news refresh if stale (> 6 hours old).
  // Ensures the blog auto-updates even if Cloud Scheduler is paused.
  if (shouldTriggerDailyRefresh(all)) {
    ensureDailyNewsRefresh().catch(err =>
      console.error("[/api/blog] Background news refresh failed:", err.message)
    )
  }

  return Response.json({ success: true, posts: published, total: published.length })
}
