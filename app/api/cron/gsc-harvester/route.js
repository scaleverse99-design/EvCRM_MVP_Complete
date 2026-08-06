export const dynamic = "force-dynamic"

import { harvestGoogleQueriesAndGenerate } from "../../../../lib/orchestrator/gscHarvester.js"
import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth.js"
import { readTable } from "../../../../lib/store.js"

const MAX_QUERIES_PER_RUN = 8

// GET or POST /api/cron/gsc-harvester
// Endpoint triggered by scheduled cron (GitHub Actions, curl -H Authorization).
//
// GET used to call harvestGoogleQueriesAndGenerate() with zero arguments,
// which silently falls back to 6 hardcoded example queries baked into
// gscHarvester.js — meaning every scheduled run regenerated content for the
// same 6 examples forever instead of ever touching the real
// search_console_queries table populated by
// scripts/fetch-search-console-queries.js. That table is the actual "what
// are real users typing into Google that finds us" signal; this endpoint
// existed but was never wired to it. Fixed: pull the highest-impression
// real queries and feed those in. GET also had no auth — GitHub Actions
// cron can send an Authorization header via curl same as any POST caller,
// so there's no reason this stayed open while every other orchestrator
// endpoint requires the shared secret.
export async function GET(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  try {
    const scQueries = await readTable("search_console_queries").catch(() => [])

    if (!scQueries.length) {
      return Response.json({
        success: true,
        message: "No Search Console data yet — run scripts/fetch-search-console-queries.js first. Not falling back to example queries (that was the bug being fixed here).",
        harvested: 0,
      })
    }

    // High impressions = real demand; prioritizing low-CTR-but-high-impression
    // queries first would target the actual content-gap case (we rank but the
    // page doesn't satisfy the query), but harvestGoogleQueriesAndGenerate
    // already skips queries an existing published article covers — so simple
    // impression-desc is enough to always work the biggest real signal first.
    const topQueries = scQueries
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, MAX_QUERIES_PER_RUN)
      .map(q => q.query)

    const res = await harvestGoogleQueriesAndGenerate(topQueries)
    return Response.json({
      success: true,
      message: `Harvested ${topQueries.length} real Search Console queries (by impressions).`,
      queriesUsed: topQueries,
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
