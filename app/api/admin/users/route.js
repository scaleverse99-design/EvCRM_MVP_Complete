export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"
import { readTable, writeTable } from "../../../../lib/store"

async function requireFounder(req) {
  const token = extractToken(req)
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded || (decoded.role !== "superadmin" && decoded.role !== "founder")) return null

  const session = await findSession(hashToken(token))
  if (!session) return null

  return session.evcrm_users
}

// ── PATCH /api/admin/users — founder-only account controls ─────────
// Body: { id, is_active } — toggles active/inactive on any non-founder account.
export async function PATCH(req) {
  try {
    const admin = await requireFounder(req)
    if (!admin) return err("Unauthorized. Founder access required.", 401)

    const { id, is_active } = await req.json()
    if (!id) return err("User ID required.", 400)
    if (typeof is_active !== "boolean") return err("is_active must be true or false.", 400)

    const users = await readTable("users")
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return err("User not found.", 404)
    if (users[idx].role === "founder") return err("Founder accounts cannot be deactivated.", 403)

    users[idx] = { ...users[idx], is_active }
    await writeTable("users", users)

    return ok({ user: { id, is_active }, message: is_active ? "Account reactivated." : "Account deactivated." })

  } catch (error) {
    console.error("[PATCH /api/admin/users]", error.message)
    return err("Failed to update user.", 500)
  }
}
