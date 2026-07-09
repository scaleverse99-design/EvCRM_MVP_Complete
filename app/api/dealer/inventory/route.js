import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// GET: dealer's own inventory
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const inv = await readTable("inventory")
  const items = dealership ? inv.filter(v => v.dealership === dealership) : inv
  return NextResponse.json({ success:true, inventory:items, total:items.length })
}

// POST: add new vehicle to inventory
export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })
  if (!["dealer","founder","superadmin"].includes(user.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 })

  const body = await req.json()
  const dealership = user.dealership || body.dealership

  const item = {
    id:          `inv_${Date.now()}`,
    dealership,
    dealerName:  body.dealerName || user.name,
    brand:       body.brand,
    model:       body.model,
    variant:     body.variant || "",
    type:        body.type || "4W",
    bodyType:    body.bodyType || "Sedan",
    year:        body.year || new Date().getFullYear(),
    km:          body.km || 0,
    condition:   body.km > 0 ? "used" : "new",
    color:       body.color || "",
    range:       body.range || 0,
    batteryCapacity: body.batteryCapacity || "",
    topSpeed:    body.topSpeed || 0,
    exShowroom:  body.exShowroom || 0,
    emi:         body.emi || 0,
    tokenAmount: 1000,
    status:      body.status || "IN_STOCK",
    images:      body.images || ["🚗"],
    features:    body.features || [],
    tags:        body.tags || [],
    state:       body.state || "",
    district:    body.district || "",
    rating:      0,
    reviews:     0,
    createdAt:   new Date().toISOString()
  }

  const inv = await readTable("inventory")
  inv.unshift(item)
  await writeTable("inventory", inv)

  return NextResponse.json({ success:true, item })
}

// PATCH: update vehicle status / details
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 })

  const inv = await readTable("inventory")
  const idx = inv.findIndex(v => v.id === id)
  if (idx === -1) return NextResponse.json({ error:"Not found" }, { status:404 })

  // Dealers can only edit their own inventory
  if (user.role === "dealer" && inv[idx].dealership !== user.dealership) {
    return NextResponse.json({ error:"Forbidden" }, { status:403 })
  }

  inv[idx] = { ...inv[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeTable("inventory", inv)

  return NextResponse.json({ success:true, item:inv[idx] })
}

// DELETE: remove vehicle
export async function DELETE(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 })

  let inv = await readTable("inventory")
  const target = inv.find(v => v.id === id)
  if (!target) return NextResponse.json({ error:"Not found" }, { status:404 })
  if (user.role === "dealer" && target.dealership !== user.dealership) return NextResponse.json({ error:"Forbidden" }, { status:403 })

  inv = inv.filter(v => v.id !== id)
  await writeTable("inventory", inv)
  return NextResponse.json({ success:true })
}
