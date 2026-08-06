export const dynamic = "force-dynamic"
export const maxDuration = 60

import { requireOrchestratorAuth } from "../../../../lib/orchestrator/auth.js"
import { fetchDataGovInFacts } from "../../../../lib/cte/sources/dataGovIn.js"
import { dedupeFacts, storeFacts } from "../../../../lib/cte/factLibrary.js"

// GET /api/cron/cte-ingest
//
// Runs every CTE source crawler, folds the results into deduplicated
// library entries, and stores them. This is the "build the library ahead
// of time" half of CTE that the design doc specified and that had never
// been built — so live queries fell through to an LLM, which defeats the
// entire point (an AI extracting facts at query time is just a slower,
// costlier version of the search the calling AI already does itself).
//
// Fully deterministic: no model is called anywhere in this path. Adding a
// source means writing another adapter in lib/cte/sources/ and listing it
// below — no prompt, no extraction step, no per-query cost.
//
// Auth-gated like every other orchestrator endpoint: this hits external
// APIs on a schedule and must not be anonymously triggerable in a loop.
export async function GET(req) {
  const authError = requireOrchestratorAuth(req)
  if (authError) return authError

  const started = Date.now()
  const sourceResults = []
  const allFacts = []

  // Each source is isolated — one failing source (expired key, portal
  // downtime, changed schema) must not stop the others from ingesting.
  const SOURCES = [
    { name: "data.gov.in", run: fetchDataGovInFacts },
  ]

  for (const source of SOURCES) {
    try {
      const { facts, errors } = await source.run()
      allFacts.push(...facts)
      sourceResults.push({
        source: source.name,
        factsFetched: facts.length,
        errors: errors?.length ? errors : undefined,
      })
    } catch (e) {
      sourceResults.push({ source: source.name, factsFetched: 0, fatalError: e.message })
    }
  }

  const entries = dedupeFacts(allFacts)
  const { stored, errors: storeErrors } = await storeFacts(entries)

  return Response.json({
    success: true,
    durationMs: Date.now() - started,
    sources: sourceResults,
    rawFactsFetched: allFacts.length,
    uniqueFactsAfterDedupe: entries.length,
    conflictsFound: entries.filter(e => e.has_conflict).length,
    corroboratedFacts: entries.filter(e => e.source_count > 1).length,
    stored,
    storeErrors,
  })
}
