export const dynamic = "force-dynamic"
export const maxDuration = 300

import { readTable } from "../../../../lib/store"
import { verifyToken } from "../../../../lib/auth"

// Server-side proxy so the /admin/orchestrator dashboard can hit the
// Bearer-protected orchestrator endpoints without exposing
// INTERNAL_API_SECRET to the browser. The dashboard sends the user's
// existing session token (founder/superadmin only); the proxy validates the
// role, then invokes the orchestrator function directly (no HTTP hop — same
// process, cheaper and works around Firebase's per-function auth boundary).
//
// Body: { action: "status" | "discover" | "research" | "write" | "run",
//         params?: {…} }

import { runDiscover } from "../../../../lib/orchestrator/discover"
import { runResearch } from "../../../../lib/orchestrator/research"
import { runWrite } from "../../../../lib/orchestrator/write"

async function requireFounderOrAdmin(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "").trim()
  if (!token) return { error: "Unauthorized", status: 401 }
  let claims
  try { claims = verifyToken(token) } catch { return { error: "Invalid token", status: 401 } }
  if (claims.role !== "founder" && claims.role !== "superadmin") {
    return { error: "Forbidden — founder/superadmin only", status: 403 }
  }
  return { user: claims }
}

async function status() {
  const topics = await readTable("orch_topics")
  topics.sort((a, b) => new Date(b.discoveredAt || 0) - new Date(a.discoveredAt || 0))
  const counts = { DISCOVERED: 0, RESEARCHED: 0, PUBLISHED: 0, FAILED: 0 }
  for (const t of topics) { if (counts[t.state] !== undefined) counts[t.state]++ }
  return {
    counts,
    total: topics.length,
    recent: topics.slice(0, 40).map(t => ({
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
    })),
    config: {
      writer: process.env.ORCH_WRITER || "gemini",
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
      claudeConfigured: !!process.env.CLAUDE_API_KEY,
    },
  }
}

export async function POST(req) {
  const authCheck = await requireFounderOrAdmin(req)
  if (authCheck.error) return Response.json({ error: authCheck.error }, { status: authCheck.status })

  let body = {}
  try { body = await req.json() } catch { /* body optional */ }
  const { action = "status", params = {} } = body

  try {
    switch (action) {
      case "status":
        return Response.json({ success: true, ...(await status()) })
      case "discover":
        return Response.json({ success: true, result: await runDiscover({ count: Number(params.count) || 10 }) })
      case "research":
        return Response.json({ success: true, result: await runResearch({ count: Number(params.count) || 5 }) })
      case "write":
        return Response.json({ success: true, result: await runWrite({ count: Number(params.count) || 3 }) })
      case "run": {
        const summary = { stages: {}, startedAt: new Date().toISOString() }
        try { summary.stages.discover = await runDiscover({ count: Number(params.discover) || 10 }) } catch (e) { summary.stages.discover = { error: e.message } }
        try { summary.stages.research = await runResearch({ count: Number(params.research) || 5 }) } catch (e) { summary.stages.research = { error: e.message } }
        try { summary.stages.write = await runWrite({ count: Number(params.write) || 3 }) } catch (e) { summary.stages.write = { error: e.message } }
        summary.completedAt = new Date().toISOString()
        return Response.json({ success: true, result: summary })
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    console.error("[orchestrator-proxy]", action, e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
