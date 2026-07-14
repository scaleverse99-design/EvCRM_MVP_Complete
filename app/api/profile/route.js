export const dynamic = "force-dynamic"

import { extractToken, verifyToken, err, ok } from "../../../lib/auth"
import { readTable, writeTable } from "../../../lib/store"

export async function GET(req) {
  try {
    const token = extractToken(req)
    if (!token) return err("Not authenticated", 401)

    const decoded = verifyToken(token)
    if (!decoded) return err("Token expired. Please log in again.", 401)

    const users = await readTable("users")
    const user = users.find(u => u.id === decoded.sub)
    if (!user) return err("User not found", 404)

    return ok({
      success: true,
      profile: {
        name: user.name || "",
        phone: user.phone || "",
        dealership: user.dealership || "",
        location: user.location || "",
      }
    })
  } catch (error) {
    console.error("[/api/profile] GET error:", error)
    return err("Failed to retrieve profile", 500)
  }
}

export async function PATCH(req) {
  try {
    const token = extractToken(req)
    if (!token) return err("Not authenticated", 401)

    const decoded = verifyToken(token)
    if (!decoded) return err("Token expired. Please log in again.", 401)

    const { name, phone, dealership, location } = await req.json()

    const users = await readTable("users")
    const idx = users.findIndex(u => u.id === decoded.sub)
    if (idx === -1) return err("User not found", 404)

    const user = users[idx]
    users[idx] = {
      ...user,
      name: name || user.name || "",
      phone: phone || user.phone || "",
      ...(user.role === "dealer" ? { dealership: dealership || user.dealership || "", location: location || user.location || "" } : {}),
    }

    await writeTable("users", users)
    return ok({ success: true })
  } catch (error) {
    console.error("[/api/profile] PATCH error:", error)
    return err("Failed to update profile", 500)
  }
}
