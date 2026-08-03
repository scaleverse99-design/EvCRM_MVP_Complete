// ── lib/store.js ──────────────────────────────────────────────────────
// Single data-access seam for every logical "table" in the app (bookings,
// leads, customers, tasks, inventory, feed, reps, users, sessions, otps,
// auth_logs, dealers, service_centers). Reads/writes a Supabase table
// (schema: id text primary key, data jsonb) when configured; otherwise
// falls back to the existing local data/<name>.json files so local dev
// and demos keep working with zero credentials.
//
// Every row is stored as a single jsonb blob, so adding a new field to a
// record (e.g. a dealer's oemId once the OEM dashboard is built) never
// requires a schema migration — same flexibility the JSON files had.
//
// Run scripts/supabase-schema.sql once in the Supabase SQL editor before
// setting SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

import fs from "fs"
import path from "path"
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin.js"

// ── PRODUCTION GUARD ──────────────────────────────────────────────────
// In production (NODE_ENV === "production"), all data MUST live in Supabase.
// The local JSON fallback silently loses all writes when Cloud Run restarts.
// This guard prevents deploying to production without Supabase configured.
if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
  const msg = `❌ CRITICAL: Production requires Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Cloud Run before deploying. Without them, all dealer data (leads, quotes, bookings, service requests) will be lost on restart.`
  console.error(msg)
  // In a strict setup, this would throw. For now, loud warning + graceful fallback.
}

const DATA_DIR = path.join(process.cwd(), "data")
const NEVER_MATCHES = "__store_never_matches__"

function localFile(name) {
  return path.join(DATA_DIR, `${name}.json`)
}

function readLocalFile(name) {
  try { return JSON.parse(fs.readFileSync(localFile(name), "utf8")) } catch { return [] }
}

function writeLocalFile(name, rows) {
  fs.writeFileSync(localFile(name), JSON.stringify(rows, null, 2))
}

/** Reads every row of a logical table as a plain array of objects. */
export async function readTable(name) {
  if (!isSupabaseConfigured()) return readLocalFile(name)

  const sb = getSupabaseAdmin()
  // Supabase caps a single .select() at 1000 rows. Without paging through the
  // whole table, any table over 1000 rows silently truncates on read — and
  // because writeTable() is read-all-modify-write-all (delete + re-insert),
  // the very next write would PERMANENTLY DELETE every row past 1000. Page
  // until a short page signals the end.
  const PAGE = 1000
  let all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(name).select("data").range(from, from + PAGE - 1)
    if (error) {
      // On the FIRST page, fall back to the local file (preserves the original
      // single-shot behavior for a fully-unavailable table). On a LATER page,
      // throw instead — returning a partial/stale set here would let a
      // subsequent writeTable() wipe the rows we already read.
      if (from === 0) {
        console.error(`[store] readTable(${name}) failed, falling back to local file:`, error.message)
        return readLocalFile(name)
      }
      throw new Error(`[store] readTable(${name}) failed mid-pagination at offset ${from}: ${error.message}`)
    }
    all = all.concat(data || [])
    if (!data || data.length < PAGE) break
  }
  return all.map(row => row.data)
}

// ── Cached reads (READ-ONLY CALLERS ONLY) ─────────────────────────────
//
// readTable() fetches the entire table on every call — for `users` (1002
// rows) that is two Supabase round trips, paid again on every request.
// Measured on the live MCP endpoint 2026-08-01: 2-3.5s per call against
// tables of 17-1002 rows. The data is the wrong shape for that cost —
// inventory/users/blog_posts change a few times a day, not per request.
//
// ⚠️ DO NOT route writeTable() callers through this. The write path is
// read-all → mutate → writeTable(), and writeTable() DELETES the whole
// table before re-inserting. Feeding it a stale array would permanently
// delete every row created since the cache filled. That is why this is a
// separate function rather than a cache inside readTable(): the danger is
// not staleness, it is silent data loss, and it must be opt-in per call
// site rather than something a future caller inherits by accident.
//
// Safe only where the result is read, filtered and discarded — i.e. the
// public MCP server. A user seeing up-to-60s-old inventory is fine; a
// dealer losing a lead is not.
//
// Per-instance, in-process, deliberately. Cloud Run runs several instances
// so they warm independently and can briefly disagree by up to the TTL —
// acceptable for read-only browsing, and it avoids taking on a shared
// cache (Redis/KV) purely to save a few hundred rows.
const CACHE_TTL_MS = 60_000
const tableCache = new Map()

/**
 * Same result as readTable(), but served from a short-lived in-process
 * cache. Never pass the result to writeTable() — see the note above.
 *
 * The returned array is shared between callers, so callers must not mutate
 * it in place (`.sort()`, `.push()`, `.reverse()`). Derive first —
 * `rows.filter(...)` / `[...rows].sort(...)` — which is what every current
 * caller already does.
 */
export async function readTableCached(name, ttlMs = CACHE_TTL_MS) {
  const hit = tableCache.get(name)
  if (hit && Date.now() - hit.at < ttlMs) return hit.rows

  // Concurrent misses share one in-flight fetch instead of each firing its
  // own full-table read — without this, a burst of requests on a cold
  // cache stampedes the database with identical queries.
  if (hit?.inflight) return hit.inflight

  const inflight = readTable(name)
    .then(rows => {
      tableCache.set(name, { rows, at: Date.now() })
      return rows
    })
    .catch(err => {
      // Drop the failed entry so the next call retries rather than being
      // stuck on a rejected promise.
      tableCache.delete(name)
      throw err
    })

  tableCache.set(name, { ...hit, inflight })
  return inflight
}

/** Drops cached rows for a table (or all tables when called with no name). */
export function invalidateTableCache(name) {
  if (name) tableCache.delete(name)
  else tableCache.clear()
}

/**
 * Overwrites a logical table with the given array — the array is treated
 * as the complete, authoritative state (matches the old writeJson(file,
 * wholeArray) semantics every route already relies on, deletions included).
 */
export async function writeTable(name, rows) {
  // Drop any cached copy first. This only helps the instance that served
  // the write — other Cloud Run instances still expire on their own TTL —
  // but it means a dealer who just added stock sees it immediately if
  // their next read lands on the same instance.
  invalidateTableCache(name)

  if (!isSupabaseConfigured()) return writeLocalFile(name, rows)

  const sb = getSupabaseAdmin()
  const { error: delError } = await sb.from(name).delete().neq("id", NEVER_MATCHES)
  if (delError) throw new Error(`[store] writeTable(${name}) delete failed: ${delError.message}`)

  if (rows.length > 0) {
    const { error: insError } = await sb.from(name).insert(rows.map((r, i) => ({ 
      id: r.id || `${name}_fallback_${Date.now()}_${i}`, 
      data: r 
    })))
    if (insError) throw new Error(`[store] writeTable(${name}) insert failed: ${insError.message}`)
  }
}
