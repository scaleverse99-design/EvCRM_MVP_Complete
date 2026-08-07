/**
 * Demand Engine — tracks query hit counts and auto-promotes answers
 * from temporary cache to permanent Supabase DB based on demand.
 *
 * RULES:
 *   hit_count >= HIGH_DEMAND_THRESHOLD → save to Supabase DB (permanent)
 *   hit_count <  HIGH_DEMAND_THRESHOLD → keep in RAM cache (temporary)
 *   LOW demand that becomes HIGH demand → auto-promote to DB
 *
 * No LLM. Pure arithmetic and DB writes.
 */

import { getSupabaseAdmin } from "../supabaseAdmin.js"

const HIGH_DEMAND_THRESHOLD = 10    // queries/day before saving to DB permanently
const LOW_DEMAND_TTL_MS = 3 * 24 * 60 * 60 * 1000  // 3 days in RAM cache
const DEMAND_TABLE = "auto_index"   // Supabase table for permanent storage

// In-process demand tracker — survives across requests on same instance
// key: signature, value: { count, firstSeen, lastSeen, result }
const DEMAND_TRACKER = new Map()

function signature(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .sort()
    .join("_")
    .slice(0, 120)
}

/**
 * Records a query hit and promotes to DB if demand crosses threshold.
 * Returns true if promoted to DB this call.
 */
export async function recordDemand(query, result) {
  const sig = signature(query)
  const now = Date.now()

  const existing = DEMAND_TRACKER.get(sig) || { count: 0, firstSeen: now, result }
  const updated = { ...existing, count: existing.count + 1, lastSeen: now, result }
  DEMAND_TRACKER.set(sig, updated)

  // Auto-promote to permanent DB when threshold crossed
  if (updated.count === HIGH_DEMAND_THRESHOLD) {
    try {
      const sb = getSupabaseAdmin()
      await sb.from(DEMAND_TABLE).upsert({
        signature: sig,
        original_query: String(query).slice(0, 500),
        facts: result?.facts || result?.consensus ? [result.consensus || result] : [],
        sources: result?.sourcesQueried || [],
        hit_count: updated.count,
        promoted_at: new Date().toISOString(),
        last_served_at: new Date().toISOString(),
      }, { onConflict: "signature" })
      console.log(`[demandEngine] promoted "${query}" to permanent DB at ${updated.count} hits`)
      return true
    } catch (e) {
      console.warn("[demandEngine] DB promotion failed:", e.message)
    }
  }

  // If already in DB, bump hit count (fire-and-forget)
  if (updated.count > HIGH_DEMAND_THRESHOLD) {
    try {
      const sb = getSupabaseAdmin()
      sb.rpc("bump_auto_index_hit", { sig }).catch(() => {})
    } catch { /* ignore */ }
  }

  return false
}

/**
 * Checks the demand tracker cache for a recent answer.
 * Returns the cached result if found and fresh, or null.
 */
export function getDemandCached(query) {
  const sig = signature(query)
  const entry = DEMAND_TRACKER.get(sig)
  if (!entry?.result) return null
  // Serve from demand cache for up to LOW_DEMAND_TTL_MS
  if (Date.now() - entry.lastSeen > LOW_DEMAND_TTL_MS) return null
  return entry.result
}

/**
 * Checks the permanent Supabase DB for a previously promoted answer.
 * Returns the stored result or null.
 */
export async function getFromDb(query) {
  const sig = signature(query)
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(DEMAND_TABLE)
      .select("facts, sources, promoted_at")
      .eq("signature", sig)
      .single()
    if (error || !data) return null
    // Update last served timestamp (fire-and-forget)
    sb.from(DEMAND_TABLE)
      .update({ last_served_at: new Date().toISOString() })
      .eq("signature", sig)
      .then(() => {})
      .catch(() => {})
    return { facts: data.facts, sources: data.sources, fromDb: true, asOf: data.promoted_at }
  } catch {
    return null
  }
}
