export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../../lib/store"
import { verifyToken } from "../../../../lib/auth"

// ── PATCH /api/dealer/sell-car-toggle ────────────────────────────────
// Lets a Used Car Dealer turn their storefront's public "Sell Your Car"
// button on/off. Defaults to OFF (see app/api/register/route.js — new
// dealers never get sellCarEnabled set) so no dealer sees this feature
// on their public page unless they explicitly opt in themselves.
// Body: { dealership, sellCarEnabled }
export async function PATCH(req) {
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== "dealer") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { dealership, sellCarEnabled } = body

    if (!dealership || decoded.dealership !== dealership) {
      return Response.json({ error: "Dealer not found or unauthorized" }, { status: 403 })
    }

    const users = await readTable("users")
    const dealer = users.find(u => u.dealership === dealership && u.role === "dealer")
    if (!dealer) {
      return Response.json({ error: "Dealer not found" }, { status: 404 })
    }

    const updated = users.map(u =>
      u.dealership === dealership && u.role === "dealer" ? { ...u, sellCarEnabled: !!sellCarEnabled } : u
    )
    await writeTable("users", updated)

    return Response.json({ success: true, sellCarEnabled: !!sellCarEnabled })
  } catch (error) {
    console.error("[/api/dealer/sell-car-toggle]", error.message)
    return Response.json({ error: "Failed to update setting: " + error.message }, { status: 500 })
  }
}
