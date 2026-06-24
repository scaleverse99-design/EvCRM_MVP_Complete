export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../../lib/auth"
import { findSession } from "../../../../../lib/db"
import supabaseAdmin from "../../../../../lib/db"

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

    const { data, error } = await supabaseAdmin
      .from("evcrm_users")
      .select("id, email, role, name, phone, dealership, city, is_active, last_login, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return ok({ success: true, users: data })

  } catch (error) {
    console.error("[GET /api/admin/users/all]", error.message)
    return err("Failed to fetch users.", 500)
  }
}
