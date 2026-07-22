export const dynamic = "force-dynamic"
// Serverless-function timeout budget: discover ~15s (grounded search),
// research ~15s × N, write ~15s × N. Cloud Run gives us up to 300s.
export const maxDuration = 300

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth"
import { runDiscover } from "../../../../lib/orchestrator/discover"
import { runResearch } from "../../../../lib/orchestrator/research"
import { runWrite } from "../../../../lib/orchestrator/write"

// POST /api/orchestrator/run
// The one endpoint the cron actually hits. Runs discover → research → write
// in sequence with sensible per-stage batch caps so a single cron tick can't
// burn the whole Gemini daily quota in one go. If any stage crashes we still
// return the partial results — a mid-run failure shouldn't lose the work
// done by earlier stages.
//
// Body (optional): { discover: 10, research: 5, write: 3 }
// Auth: Bearer INTERNAL_API_SECRET
export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body = {}
  try { body = await req.json() } catch { /* optional */ }
  const discoverN = Number(body.discover) || 10
  const researchN = Number(body.research) || 5
  const writeN    = Number(body.write)    || 3

  const startedAt = new Date().toISOString()
  const summary = { startedAt, stages: {} }

  try {
    summary.stages.discover = await runDiscover({ count: discoverN })
  } catch (e) {
    summary.stages.discover = { error: e.message }
  }

  try {
    summary.stages.research = await runResearch({ count: researchN })
  } catch (e) {
    summary.stages.research = { error: e.message }
  }

  try {
    summary.stages.write = await runWrite({ count: writeN })
  } catch (e) {
    summary.stages.write = { error: e.message }
  }

  summary.completedAt = new Date().toISOString()
  return Response.json({ success: true, ...summary })
}
