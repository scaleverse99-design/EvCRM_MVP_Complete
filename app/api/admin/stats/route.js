export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"
import { readTable } from "../../../../lib/store"

async function requireSuperadmin(req) {
  const token = extractToken(req)
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded || (decoded.role !== "superadmin" && decoded.role !== "founder")) return null

  const session = await findSession(hashToken(token))
  if (!session) return null

  return session.evcrm_users
}

// Same "trial then paid" pricing story as TrialBanner/billing.js.
const MRR_PER_DEALER = 3000

export async function GET(req) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) return err("Unauthorized. Superadmin access required.", 401)

    const users = await readTable("users")
    const dealers = users.filter(u => u.role === "dealer")
    const activeDealer = dealers.filter(u => u.is_active !== false).length
    const payingDealers = dealers.filter(u => u.billingStatus && u.billingStatus.startsWith("active")).length

    return ok({
      success: true,
      mrr: payingDealers * MRR_PER_DEALER,
      stats: {
        totalDealers: dealers.length,
        totalUsers: users.length,
        activeDealer,
      },
    })

  } catch (error) {
    console.error("[GET /api/admin/stats]", error.message)
    return err("Failed to fetch stats.", 500)
  }
}
