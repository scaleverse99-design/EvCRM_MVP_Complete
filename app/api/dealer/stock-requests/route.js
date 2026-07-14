export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

function getUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// GET: a dealer's own restock requests (also reachable by their reps, read-only)
export async function GET(req) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requests = (await readTable("stock_requests"))
    .filter(r => r.dealership === user.dealership)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ success: true, requests })
}

// POST: dealer/rep raises a restock request against their OEM's network.
// The request is stamped with the dealer's oemId so the right OEM sees it —
// a dealer with no oemId (fully independent) simply can't raise one.
export async function POST(req) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["dealer", "rep"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { vehicleModel, variant, quantity, note } = body
  if (!vehicleModel?.trim()) return NextResponse.json({ error: "Vehicle model is required" }, { status: 400 })
  if (!quantity || quantity < 1) return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 })

  const users = await readTable("users")
  const dealerAccount = users.find(u => u.role === "dealer" && u.dealership === user.dealership)
  if (!dealerAccount?.oemId) return NextResponse.json({ error: "Your dealership isn't linked to an OEM network yet" }, { status: 400 })

  const requests = await readTable("stock_requests")
  const request = {
    id: `stkreq_${Date.now()}`,
    dealership: user.dealership,
    oemId: dealerAccount.oemId,
    dealerName: dealerAccount.dealershipName || dealerAccount.name,
    vehicleModel: vehicleModel.trim(),
    variant: variant?.trim() || "",
    quantity: Number(quantity),
    note: note?.trim() || "",
    status: "PENDING",
    requestedBy: user.email || user.sub,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  }
  requests.unshift(request)
  await writeTable("stock_requests", requests)

  return NextResponse.json({ success: true, request })
}
