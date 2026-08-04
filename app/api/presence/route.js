export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

// Real live-visitor count.
//
// Replaces a badge that rendered `85 + Math.floor(Math.random() * 65)` as
// "N people actively viewing right now" on 1,344 /price/ pages and every
// /blog/ page. Manufactured social proof shown to buyers is the thing
// India's CCPA dark-patterns guidelines (2023) call false urgency, and it
// sat directly against the goal of being a source people can check.
//
// Now it counts actual open pages. If the real number is small, the badge
// hides itself (see components/common/LiveVisitorBadge.js) — showing
// nothing is honest, showing an invented number is not.
//
// PRIVACY: session_id is a random value the client keeps in sessionStorage
// for the life of the tab. No IP, no user id, no cookie, no page history.
// Rows are deleted after 5 minutes by the same function that writes them.

const WINDOW_SECONDS = 90   // "active" = seen within this window
const MAX_BODY = 512

export async function POST(req) {
  const sb = getSupabaseAdmin()
  if (!sb) return Response.json({ count: null }, { status: 200 })

  let body
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY) return Response.json({ count: null }, { status: 413 })
    body = JSON.parse(raw)
  } catch {
    return Response.json({ count: null }, { status: 400 })
  }

  // The session id comes from the client, so treat it as untrusted input:
  // bound its length and character set rather than writing it to a primary
  // key unchecked.
  const session = String(body?.sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
  if (session.length < 8) return Response.json({ count: null }, { status: 400 })

  const path = String(body?.path || "").slice(0, 200)
  const city = String(body?.city || "").slice(0, 80)

  const { data, error } = await sb.rpc("heartbeat_presence", {
    p_session: session,
    p_path: path,
    p_city: city,
    p_window: WINDOW_SECONDS,
  })

  if (error) {
    // Never fail the page over a decorative counter. null means "unknown",
    // and the badge renders nothing rather than guessing.
    console.warn("[presence] heartbeat failed:", error.message)
    return Response.json({ count: null }, { status: 200 })
  }

  return Response.json({ count: Number(data) || 0 }, { headers: { "Cache-Control": "no-store" } })
}
