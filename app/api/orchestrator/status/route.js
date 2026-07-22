export const dynamic = "force-dynamic"

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth"
import { readTable } from "../../../../lib/store"

// GET /api/orchestrator/status
// Dashboard payload: queue counts by state, recent topics with their
// current stage, and the last 10 published articles (with URLs) for quick
// eyeballing. Same auth as the write endpoints — no world-readable dump of
// what's in the queue.
export async function GET(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  const topics = await readTable("orch_topics")
  topics.sort((a, b) => new Date(b.discoveredAt || 0) - new Date(a.discoveredAt || 0))

  const counts = { DISCOVERED: 0, RESEARCHED: 0, PUBLISHED: 0, FAILED: 0 }
  for (const t of topics) {
    if (counts[t.state] !== undefined) counts[t.state]++
  }

  const recent = topics.slice(0, 40).map(t => ({
    id: t.id,
    topic: t.topic,
    category: t.category,
    state: t.state,
    sourceUrl: t.sourceUrl,
    publisher: t.publisher,
    discoveredAt: t.discoveredAt,
    publishedAt: t.publishedAt,
    articleSlug: t.articleSlug,
    articleUrl: t.articleSlug ? `https://evcrm.in/blog/${t.articleSlug}` : null,
    error: t.error || null,
  }))

  return Response.json({
    success: true,
    counts,
    total: topics.length,
    recent,
    config: {
      writer: process.env.ORCH_WRITER || "gemini",
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
      claudeConfigured: !!process.env.CLAUDE_API_KEY,
    },
  })
}
