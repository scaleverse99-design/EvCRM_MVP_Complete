import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

async function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  let quotes = await readTable("quotes")
  if (dealership) quotes = quotes.filter(q => q.dealership === dealership)
  quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ success: true, quotes })
}

export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const dealership = user.dealership || body.dealership

  const quote = {
    id:             `quote_${Date.now()}`,
    dealership,
    quoteId:        body.quoteId || `EV-${Date.now().toString(36).toUpperCase().slice(-4)}`,
    leadId:         body.leadId || null,
    customerName:   body.customerName || "",
    customerPhone:  body.customerPhone || "",
    vehicleName:    body.vehicleName || "",
    exShowroom:     body.exShowroom || 0,
    fameSubsidy:    body.fameSubsidy || 0,
    stateSubsidy:   body.stateSubsidy || 0,
    dealerDiscount: body.dealerDiscount || 0,
    registration:   body.registration || 0,
    accessories:    body.accessories || 0,
    netPrice:       body.netPrice || 0,
    offer:          body.offer || "",
    validityDays:   body.validityDays || 7,
    dealerName:     body.dealerName || "",
    dealerPhone:    body.dealerPhone || "",
    dealerCity:     body.dealerCity || "",
    // receipt stored as { name, type, data } — data is base64 for small files
    receipt:        body.receipt || null,
    sentVia:        [],
    createdBy:      user.email || user.sub,
    createdAt:      new Date().toISOString(),
  }

  const quotes = await readTable("quotes")
  quotes.unshift(quote)
  await writeTable("quotes", quotes)

  return NextResponse.json({ success: true, quote })
}

export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const quotes = await readTable("quotes")
  const idx = quotes.findIndex(q => q.id === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  quotes[idx] = { ...quotes[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeTable("quotes", quotes)

  return NextResponse.json({ success: true, quote: quotes[idx] })
}
