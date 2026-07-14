export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../../lib/auth"
import { findSession } from "../../../../../lib/db"
import { readTable } from "../../../../../lib/store"

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

    const users = (await readTable("users"))
      .map(({ password_hash, ...u }) => u) // never ship password hashes to the client
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    return ok({ success: true, users })

  } catch (error) {
    console.error("[GET /api/admin/users/all]", error.message)
    return err("Failed to fetch users.", 500)
  }
}
