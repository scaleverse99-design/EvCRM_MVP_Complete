/**
 * CTE fact library — the actual point of CTE.
 *
 * Crawlers (lib/cte/sources/*.js) fetch raw data from real sources ahead
 * of time. This module normalises those rows into one common shape,
 * deduplicates them, records when independent sources agree or conflict,
 * and stores the result. The MCP server then answers from this library —
 * a deterministic lookup, zero marginal cost, same answer every time.
 *
 * NO LLM IN THIS PATH. That is the design, not an implementation detail:
 * if a model does the extraction at query time, CTE is just a slower,
 * costlier proxy for the search the calling AI can already do itself.
 * The value only exists because the cleaning happened in advance.
 *
 * Deduplication contract
 * ----------------------
 * Two facts are THE SAME FACT when they describe the same metric, for the
 * same geography, over the same period, at the same scope. That tuple is
 * the signature. When a second source produces a fact with an existing
 * signature it does not create a row — it corroborates (or contradicts)
 * the one already there:
 *
 *   same signature + same value  -> corroborated, sourceCount++
 *   same signature + diff value  -> conflict recorded, BOTH values kept
 *
 * A conflict is never silently resolved by picking one. Indian vehicle
 * data conflates fiscal/calendar years, dispatches vs registrations, and
 * nameplate vs powertrain constantly — averaging across a conflict is how
 * this data goes wrong. Surfacing the disagreement is the correct answer.
 */

import { getSupabaseAdmin } from "../supabaseAdmin.js"

/**
 * Deterministic signature for a fact. Lowercased, punctuation-stripped,
 * whitespace-collapsed so trivial formatting differences between sources
 * ("Andhra Pradesh" vs "andhra  pradesh") collapse to one key — while
 * genuinely different periods or scopes stay separate.
 */
export function factSignature({ metric, geography, period, scope }) {
  const norm = (s) => String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return [norm(metric), norm(geography), norm(period), norm(scope)].join("|")
}

/**
 * Folds a batch of raw source facts into deduplicated library entries.
 * Pure function — no I/O, fully testable, same input same output.
 */
export function dedupeFacts(rawFacts) {
  const bySignature = new Map()

  for (const f of rawFacts) {
    const signature = factSignature(f)
    const existing = bySignature.get(signature)

    if (!existing) {
      bySignature.set(signature, {
        signature,
        metric: f.metric,
        value: f.value,
        unit: f.unit,
        period: f.period,
        geography: f.geography,
        scope: f.scope,
        sources: [{ name: f.sourceName, url: f.sourceUrl, datasetId: f.sourceDatasetId, value: f.value }],
        source_count: 1,
        has_conflict: false,
        conflicting_values: [],
        fetched_at: f.fetchedAt,
      })
      continue
    }

    // Same source repeated in one batch (duplicate row) — ignore, don't
    // inflate the corroboration count with a source agreeing with itself.
    const alreadyFromThisSource = existing.sources.some(s => s.datasetId === f.sourceDatasetId)
    if (alreadyFromThisSource) continue

    existing.sources.push({ name: f.sourceName, url: f.sourceUrl, datasetId: f.sourceDatasetId, value: f.value })
    existing.source_count = existing.sources.length

    if (f.value !== existing.value) {
      existing.has_conflict = true
      const known = new Set([existing.value, ...existing.conflicting_values])
      if (!known.has(f.value)) existing.conflicting_values.push(f.value)
    }
  }

  return [...bySignature.values()]
}

/** Upserts library entries into Supabase. Returns counts, never throws on partial failure. */
export async function storeFacts(entries) {
  const sb = getSupabaseAdmin()
  // Always report failures under the same `errors` key the caller reads —
  // a mismatched key here means a config problem surfaces as a silent
  // `stored: 0`, which is the exact failure mode commit 04f3a1a fixed for
  // the Places guard: a guard that won't say why it blocked sends
  // debugging in the wrong direction.
  if (!sb) return { stored: 0, errors: ["Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing or placeholder)"] }
  if (!entries.length) return { stored: 0 }

  const rows = entries.map(e => ({
    signature: e.signature,
    metric: e.metric,
    value: e.value,
    unit: e.unit,
    period: e.period,
    geography: e.geography,
    scope: e.scope,
    sources: e.sources,
    source_count: e.source_count,
    has_conflict: e.has_conflict,
    conflicting_values: e.conflicting_values,
    fetched_at: e.fetched_at,
  }))

  let stored = 0
  const errors = []
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await sb.from("cte_facts").upsert(chunk, { onConflict: "signature" })
    if (error) errors.push(error.message)
    else stored += chunk.length
  }

  return { stored, errors: errors.length ? errors : undefined }
}

/**
 * Looks up facts from the library. Deterministic filtering only — no
 * scoring, no model, no fuzzy ranking that could reorder results
 * unpredictably between identical calls.
 */
export async function queryFacts({ metric, geography, limit = 20 } = {}) {
  const sb = getSupabaseAdmin()
  if (!sb) return []

  let q = sb.from("cte_facts").select("*")
  if (metric) q = q.eq("metric", metric)
  if (geography) q = q.ilike("geography", `%${geography}%`)

  const { data, error } = await q.order("value", { ascending: false }).limit(limit)
  if (error) {
    console.warn("[factLibrary] query failed:", error.message)
    return []
  }
  return data || []
}
