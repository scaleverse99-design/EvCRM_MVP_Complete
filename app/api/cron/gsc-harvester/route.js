export const dynamic = "force-dynamic"

import { harvestGoogleQueriesAndGenerate } from "../../../../lib/orchestrator/gscHarvester.js"
import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth.js"

// GET or POST /api/cron/gsc-harvester
// Endpoint triggered by Google Search Console webhook or scheduled cron.
export async function GET(req) {
  try {
    const res = await harvestGoogleQueriesAndGenerate()
    return Response.json({
      success: true,
      message: "Google Search Engine query harvest completed",
      ...res
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  let body = {}
  try { body = await req.json() } catch { /* optional */ }

  const queries = Array.isArray(body.queries) ? body.queries : []

  try {
    const res = await harvestGoogleQueriesAndGenerate(queries)
    return Response.json({
      success: true,
      message: "Custom Google Search queries harvested and published",
      ...res
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
