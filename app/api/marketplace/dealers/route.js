import { NextResponse } from "next/server"
import { readTable } from "../../../../lib/store"

// ── GET /api/marketplace/dealers?category=ICE ─────────────────────────
// Public, minimal dealer directory — used by the "Sell Your Car" form on
// the main marketplace (unlike the dealer storefront, which already knows
// which single dealer it belongs to) so a seller can pick who to sell to.
// Only ever returns name/city/slug — never phone/email/other account data.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")

  const users = await readTable("users")
  let dealers = users.filter(u => u.role === "dealer" && u.is_active !== false && u.dealershipName)
  if (category) dealers = dealers.filter(u => (u.dealerCategory || "EV") === category)

  const list = dealers
    .map(u => ({ dealership: u.dealership, dealershipName: u.dealershipName, city: u.city || "", dealerSubdomain: u.dealerSubdomain || null }))
    .sort((a, b) => a.dealershipName.localeCompare(b.dealershipName))

  return NextResponse.json({ success: true, dealers: list, total: list.length })
}
