export const dynamic = "force-dynamic"

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth"
import { runDiscover } from "../../../../lib/orchestrator/discover"

// POST /api/orchestrator/discover
// Body (optional): { count: 10 } — how many trending topics to ask Gemini for
// Auth: Bearer INTERNAL_API_SECRET
export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body = {}
  try { body = await req.json() } catch { /* body optional */ }
  const count = Number(body.count) || 10

  try {
    const result = await runDiscover({ count })
    return Response.json({ success: true, stage: "discover", ...result })
  } catch (e) {
    return Response.json({ success: false, stage: "discover", error: e.message }, { status: 500 })
  }
}
