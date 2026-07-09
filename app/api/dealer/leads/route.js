import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let leads = await readTable("leads")
  if (dealership) leads = leads.filter(l => l.dealership === dealership)

  // Sort by created_at descending
  leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return NextResponse.json({ success: true, leads })
}

export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const leads = await readTable("leads")

  const newLead = {
    id: `lead_${Date.now()}`,
    dealership: body.dealership || "hyd-d01",
    name: body.name || "",
    phone: body.phone || "",
    vehicle: body.vehicle || "",
    status: "NEW",
    source: "direct_dashboard",
    source_context: "default",
    amount: 0,
    next_followup: null,
    created_at: new Date().toISOString()
  }

  leads.push(newLead)
  await writeTable("leads", leads)

  return NextResponse.json({ success: true, lead: newLead })
}

export async function PATCH(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  const leads = await readTable("leads")
  const idx = leads.findIndex(l => l.id === id)
  if (idx === -1) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  leads[idx] = { ...leads[idx], ...updates }
  await writeTable("leads", leads)

  return NextResponse.json({ success: true, lead: leads[idx] })
}
