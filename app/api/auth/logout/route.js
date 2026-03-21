export const dynamic = "force-dynamic"

import { extractToken, hashToken, clearCookieHeader, ok } from "../../../../lib/auth"
import { deleteSession } from "../../../../lib/db"

// ── POST /api/auth/logout ─────────────────────────────────────────
export async function POST(req) {
  try {
    const token = extractToken(req)

    if (token) {
      const tokenHash = hashToken(token)
      await deleteSession(tokenHash) // remove from DB so token is revoked
    }

    const response = ok({ message: "Logged out successfully" })
    response.headers.set("Set-Cookie", clearCookieHeader())
    return response

  } catch (error) {
    console.error("[/api/auth/logout] Error:", error.message)
    // Still clear cookie even if DB call fails
    const response = ok({ message: "Logged out" })
    response.headers.set("Set-Cookie", clearCookieHeader())
    return response
  }
}
