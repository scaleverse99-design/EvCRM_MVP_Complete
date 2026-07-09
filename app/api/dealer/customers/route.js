import { NextResponse } from "next/server"
import path from "path"
import { verifyToken } from "../../../../lib/auth"
import { readJson, writeJson } from "../../../../lib/marketplace"

const FILE = path.join(process.cwd(), "data", "customers.json")

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// GET: dealer's own customers
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const all = await readJson(FILE)
  const customers = dealership ? all.filter(c => c.dealership === dealership) : all
  return NextResponse.json({ success: true, customers, total: customers.length })
}

// POST: manually add a customer
export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["dealer", "founder", "superadmin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const dealership = user.dealership || body.dealership

  const customer = {
    id: `cust_${Date.now()}`,
    dealership,
    name: body.name || "",
    phone: body.phone || "",
    email: body.email || "",
    vehicle: body.vehicle || "",
    vehicleId: body.vehicleId || null,
    bookingId: body.bookingId || null,
    leadId: body.leadId || null,
    purchaseDate: body.purchaseDate || new Date().toISOString(),
    purchaseAmount: body.purchaseAmount || 0,
    serviceReminders: body.serviceReminders || [],
    createdAt: new Date().toISOString(),
  }

  const customers = await readJson(FILE)
  customers.unshift(customer)
  await writeJson(FILE, customers)

  return NextResponse.json({ success: true, customer })
}

// PATCH: update customer details, or add/complete a service reminder
// body: { id, ...fields } OR { id, addReminder: {type, dueDate} } OR { id, completeReminderId }
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, addReminder, completeReminderId, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const customers = await readJson(FILE)
  const idx = customers.findIndex(c => c.id === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (user.role === "dealer" && customers[idx].dealership !== user.dealership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (addReminder) {
    customers[idx].serviceReminders = customers[idx].serviceReminders || []
    customers[idx].serviceReminders.push({
      id: `svc_${Date.now()}`,
      type: addReminder.type || "Service",
      dueDate: addReminder.dueDate,
      done: false,
    })
  } else if (completeReminderId) {
    customers[idx].serviceReminders = (customers[idx].serviceReminders || []).map(r =>
      r.id === completeReminderId ? { ...r, done: true } : r
    )
  } else {
    customers[idx] = { ...customers[idx], ...updates }
  }
  customers[idx].updatedAt = new Date().toISOString()
  await writeJson(FILE, customers)

  return NextResponse.json({ success: true, customer: customers[idx] })
}
