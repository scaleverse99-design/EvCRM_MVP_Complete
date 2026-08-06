export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"
import { SEARCH_BOTS } from "../../../../lib/cte/aiCrawlers"

// Node runtime, called from middleware.js (Edge runtime) via
// event.waitUntil — this is a real cost/effort split, not a formality: the
// Supabase write needs a runtime middleware doesn't reliably have, so
// middleware only detects and fans out; this route is what actually
// persists. Internal-secret gated so only our own middleware can write here
// — a page hit is cheap, but the table's value depends on it only holding
// genuine detections.

export async function POST(req) {
  const secret = req.headers.get("x-internal-secret")
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return Response.json({ ok: false }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const bot = String(body?.bot || "")
  const path = String(body?.path || "").slice(0, 300)

  // Reject anything not in the known list — defense in depth even though
  // this is internal-secret gated, so the table can never hold a name that
  // didn't come from lib/cte/aiCrawlers.js's own detector.
  if (!(bot in SEARCH_BOTS) || !path) {
    return Response.json({ ok: false }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  if (!sb) return Response.json({ ok: false }, { status: 200 }) // never error out over a missing table/config

  const { error } = await sb.rpc("bump_bot_hit", { p_bot: bot, p_path: path })
  if (error) console.warn("[bot-hit] write failed:", error.message)

  return Response.json({ ok: !error })
}
