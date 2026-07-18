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
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin"

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

/**
 * Overwrites a logical table with the given array — the array is treated
 * as the complete, authoritative state (matches the old writeJson(file,
 * wholeArray) semantics every route already relies on, deletions included).
 */
export async function writeTable(name, rows) {
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
