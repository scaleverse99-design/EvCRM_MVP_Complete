export const dynamic = "force-dynamic"

import { extractToken, verifyToken, hashToken, ok, err } from "../../../../lib/auth"
import { findSession } from "../../../../lib/db"
import { readTable, writeTable } from "../../../../lib/store"

const VALID_ROLES = ["dealer", "rep", "oem", "superadmin"]

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
// Body: { id, is_active? } — toggles active/inactive
// Body: { id, role }      — changes role (dealer | rep | oem | superadmin)
// Both fields can be combined in one request.
export async function PATCH(req) {
  try {
    const admin = await requireFounder(req)
    if (!admin) return err("Unauthorized. Founder access required.", 401)

    const body = await req.json()
    const { id, is_active, role } = body
    if (!id) return err("User ID required.", 400)

    if (is_active === undefined && role === undefined)
      return err("Provide is_active or role to update.", 400)

    const users = await readTable("users")
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return err("User not found.", 404)
    if (users[idx].role === "founder") return err("Founder accounts cannot be modified.", 403)

    if (typeof is_active === "boolean") {
      users[idx] = { ...users[idx], is_active }
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role))
        return err(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`, 400)
      users[idx] = { ...users[idx], role }
    }

    await writeTable("users", users)

    return ok({
      user: {
        id,
        ...(is_active !== undefined ? { is_active } : {}),
        ...(role ? { role } : {}),
      },
      message: role
        ? `Role updated to "${role}" successfully.`
        : (is_active ? "Account reactivated." : "Account deactivated."),
    })

  } catch (error) {
    console.error("[PATCH /api/admin/users]", error.message)
    return err("Failed to update user.", 500)
  }
}
