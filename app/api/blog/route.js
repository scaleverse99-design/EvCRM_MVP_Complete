export const dynamic = "force-dynamic"

import { readTable } from "@/lib/store"
import { ensureDailyNewsRefresh, shouldTriggerDailyRefresh } from "@/lib/orchestrator/dailyRefresh"

// Public GET — published posts only, newest first, no bodies (list view).
export async function GET() {
  const all = await readTable("blog_posts")
  const published = all
    .filter(p => p.status === "published" && p.type !== "knowledge")
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .map(({ body, ...rest }) => rest)

  // Fire-and-forget background news refresh if stale (> 6 hours old).
  // Ensures the blog auto-updates even if Cloud Scheduler is paused.
  if (shouldTriggerDailyRefresh(all)) {
    ensureDailyNewsRefresh().catch(err =>
      console.error("[/api/blog] Background news refresh failed:", err.message)
    )
  }

  return Response.json({ success: true, posts: published, total: published.length })
}
