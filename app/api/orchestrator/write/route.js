export const dynamic = "force-dynamic"

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth"
import { runWrite } from "../../../../lib/orchestrator/write"

// POST /api/orchestrator/write
// Body (optional): { count: 3 } — how many RESEARCHED topics to write into
// full articles and publish this call. Articles go into blog_posts with
// type="news" and appear at evcrm.in/blog/<slug>.
// Auth: Bearer INTERNAL_API_SECRET
export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body = {}
  try { body = await req.json() } catch { /* body optional */ }
  const count = Number(body.count) || 3

  try {
    const result = await runWrite({ count })
    return Response.json({ success: true, stage: "write", ...result })
  } catch (e) {
    return Response.json({ success: false, stage: "write", error: e.message }, { status: 500 })
  }
}
