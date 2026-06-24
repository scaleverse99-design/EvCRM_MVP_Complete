export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"
import supabaseAdmin from "../../../../lib/db"

async function requireSuperadmin(req) {
  const token = extractToken(req)
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded || (decoded.role !== "superadmin" && decoded.role !== "founder")) return null

  const session = await findSession(hashToken(token))
  if (!session) return null

  return session.evcrm_users
}

export async function GET(req) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) return err("Unauthorized. Superadmin access required.", 401)

    // Query platform stats
    const { count: totalDealers } = await supabaseAdmin
      .from("evcrm_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "dealer")

    const { count: totalUsers } = await supabaseAdmin
      .from("evcrm_users")
      .select("*", { count: "exact", head: true })

    const { count: activeDealer } = await supabaseAdmin
      .from("evcrm_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "dealer")
      .eq("is_active", true)

    // Mock MRR for now or calculate from subscriptions if table exists
    const mrr = totalDealers * 4999 // Assume 4999 MRR per dealer

    return ok({
      success: true,
      mrr,
      stats: {
        totalDealers: totalDealers || 0,
        totalUsers: totalUsers || 0,
        activeDealer: activeDealer || 0
      }
    })

  } catch (error) {
    console.error("[GET /api/admin/stats]", error.message)
    return err("Failed to fetch stats.", 500)
  }
}
