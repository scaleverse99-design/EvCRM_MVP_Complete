export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, err, ok } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"

// ── GET /api/auth/me ─────────────────────────────────────────────
// Called on page load to check if user is authenticated
export async function GET(req) {
  try {
    const token = extractToken(req)
    if (!token) return err("Not authenticated", 401)

    const decoded = verifyToken(token)
    if (!decoded)  return err("Token expired. Please log in again.", 401)

    const tokenHash = hashToken(token)
    const session   = await findSession(tokenHash)

    if (!session) return err("Session expired. Please log in again.", 401)

    const user = session.evcrm_users
    if (!user?.is_active) return err("Account disabled.", 403)

    return ok({
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        name:       user.name,
        dealership: user.dealership,
        dealerCategory: user.dealerCategory || "EV",
        phone:      user.phone || "",
        ...(user.repId ? { repId: user.repId } : {}),
        opsmanager_url: process.env.OPSMANAGER_URL,
        opsmanager_token: process.env.OPSMANAGER_TOKEN,
        // Billing — trialStartDate falls back to account creation date for
        // dealer rows created before this field existed.
        trialStartDate:         user.trialStartDate || user.created_at,
        billingStatus:          user.billingStatus || "trial",
        mandateStatus:          user.mandateStatus || "none",
        razorpayCustomerId:     user.razorpayCustomerId || null,
        razorpaySubscriptionId: user.razorpaySubscriptionId || null,
      }
    })

  } catch (error) {
    console.error("[/api/auth/me] Error:", error.message)
    return err("Authentication check failed", 500)
  }
}
