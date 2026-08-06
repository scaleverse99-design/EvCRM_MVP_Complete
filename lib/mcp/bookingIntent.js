/**
 * Booking intents — how a public, unauthenticated MCP server can offer a
 * write tool without letting anyone on the internet create bookings.
 *
 * ── The problem ──────────────────────────────────────────────────────
 * evcrm.in/api/mcp is deliberately public: requiring an API key would kill
 * adoption and defeat the whole point of being citable by AI assistants.
 * But a `book_test_drive` tool on a public endpoint means any caller can
 * write straight into a dealer's CRM. Rate limiting only slows that down.
 *
 * ── The resolution ───────────────────────────────────────────────────
 * The AI never creates a booking. It creates an INTENT: a signed, expiring
 * description of a booking that does not exist yet. The tool returns a
 * confirmation URL, and a human must open it and submit before anything is
 * written.
 *
 * So the worst an abusive caller achieves is generating URLs nobody opens.
 * No dealer is contacted, no lead is created, no CRM row appears.
 *
 * This also solves a second problem that has nothing to do with abuse: a
 * model can easily read "I like the Nexon" as intent to book. Requiring a
 * human to confirm actual name, phone and date means a misread costs a
 * wasted link rather than a bogus appointment a dealer drives out to.
 *
 * ── Single-use without a new table ───────────────────────────────────
 * Each intent carries a jti. On confirmation the created booking stores it,
 * so a replayed token finds the existing booking and returns it rather than
 * creating a duplicate. Idempotent, and no schema change.
 */

import jwt from "jsonwebtoken"
import crypto from "crypto"

const SECRET = process.env.JWT_SECRET

// Short enough that a leaked link is near-useless, long enough for a person
// to finish a conversation with an assistant and then act on it.
const INTENT_TTL_MINUTES = Number(process.env.MCP_INTENT_TTL_MINUTES || 30)

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"

/**
 * Signs an intent. Deliberately carries only what the confirmation page
 * needs to re-derive the booking — never a name or phone number, so the
 * URL itself holds no personal data even if it is shared or logged.
 *
 * @returns {{token: string, url: string, expiresAt: string}}
 */
export function createBookingIntent({ vehicleId, preferredDate = null, source = "mcp" }) {
  if (!SECRET) throw new Error("JWT_SECRET not configured")
  if (!vehicleId) throw new Error("vehicleId is required")

  const jti = crypto.randomUUID()
  const expiresIn = INTENT_TTL_MINUTES * 60

  const token = jwt.sign(
    { kind: "booking_intent", vehicleId, preferredDate, source, jti },
    SECRET,
    { expiresIn }
  )

  return {
    token,
    url: `${SITE}/book/confirm?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }
}

/**
 * Verifies an intent token.
 *
 * `kind` is checked explicitly: JWT_SECRET also signs login sessions, so
 * without it a valid auth token would be accepted here as a booking intent.
 *
 * @returns {{ok: true, intent} | {ok: false, reason: string}}
 */
export function verifyBookingIntent(token) {
  if (!SECRET) return { ok: false, reason: "JWT_SECRET not configured" }
  if (!token) return { ok: false, reason: "missing token" }

  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch (e) {
    return { ok: false, reason: e.name === "TokenExpiredError" ? "This booking link has expired — please ask again." : "invalid token" }
  }

  if (payload?.kind !== "booking_intent") return { ok: false, reason: "not a booking intent" }
  if (!payload.vehicleId) return { ok: false, reason: "malformed intent" }

  return { ok: true, intent: payload }
}

export const INTENT_TTL = INTENT_TTL_MINUTES
