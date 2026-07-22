export const dynamic = "force-dynamic"

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth"
import { runResearch } from "../../../../lib/orchestrator/research"

// POST /api/orchestrator/research
// Body (optional): { count: 5 } — how many DISCOVERED topics to research this call
// Auth: Bearer INTERNAL_API_SECRET
export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body = {}
  try { body = await req.json() } catch { /* body optional */ }
  const count = Number(body.count) || 5

  try {
    const result = await runResearch({ count })
    return Response.json({ success: true, stage: "research", ...result })
  } catch (e) {
    return Response.json({ success: false, stage: "research", error: e.message }, { status: 500 })
  }
}
