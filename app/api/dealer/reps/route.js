export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { verifyToken, hashPassword } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// Only a dealer/founder may create or manage rep logins — closed
// provisioning, so a dealer's data is only ever touched by that dealer
// and the reps the dealer personally creates.
function isManager(user) {
  return user && ["dealer", "founder", "superadmin"].includes(user.role)
}

const REP_COLORS = ["#059669", "#2563EB", "#7C3AED", "#F97316", "#DB2777", "#0891B2"]

// ── GET /api/dealer/reps — list reps (enriched with login status) ──
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const [repsRaw, users, leads] = await Promise.all([
    readTable("reps"), readTable("users"), readTable("leads"),
  ])

  let reps = repsRaw
  if (dealership) reps = reps.filter(r => r.dealership === dealership)

  // Keep the base fields the dashboard already reads (id/name/color/status)
  // and add login info for the Team management view.
  reps = reps.map(r => {
    const account = users.find(u => u.role === "rep" && u.repId === r.id)
    const myLeads = leads.filter(l => l.assignedRep === r.id)
    return {
      ...r,
      email: account?.email || r.email || "",
      hasLogin: !!account,
      active: account ? account.is_active !== false : false,
      lastLogin: account?.last_login || null,
      leads: myLeads.length,
      closed: myLeads.filter(l => l.status === "CLOSED").length,
    }
  })

  reps.sort((a, b) => (b.rate || 0) - (a.rate || 0))
  return NextResponse.json({ success: true, reps })
}

// ── POST /api/dealer/reps — create a rep + (optionally) their login ─
// Body: { name, phone, email?, password? }
// If email+password are supplied, a scoped rep login is provisioned so the
// rep can sign in on their own phone and work only their assigned leads.
export async function POST(req) {
  const user = await getUser(req)
  if (!isManager(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const dealership = user.dealership || body.dealership
  const name = (body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const email = (body.email || "").toLowerCase().trim()
  const password = body.password || ""
  const wantsLogin = !!email || !!password

  const [reps, users] = await Promise.all([readTable("reps"), readTable("users")])

  if (wantsLogin) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required to give the rep a login" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }
    if (users.some(u => u.email === email)) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 })
    }
  }

  const now = new Date().toISOString()
  const repId = `rep_${Date.now()}`
  const color = REP_COLORS[reps.filter(r => r.dealership === dealership).length % REP_COLORS.length]

  const rep = {
    id: repId, dealership, name,
    phone: body.phone || "", email,
    rate: 0, leads: 0, closed: 0,
    status: "offline", active: true, color,
    createdAt: now,
  }
  reps.push(rep)
  await writeTable("reps", reps)

  if (wantsLogin) {
    users.push({
      id: `user_${Date.now()}`,
      email, name, phone: body.phone || "",
      password_hash: await hashPassword(password),
      role: "rep",
      repId,
      dealership,
      is_active: true,
      created_by: user.email || user.sub,
      created_at: now,
      last_login: null,
    })
    await writeTable("users", users)
  }

  return NextResponse.json({ success: true, rep: { ...rep, hasLogin: wantsLogin, active: true } })
}

// ── PATCH /api/dealer/reps ─────────────────────────────────────────
// Rep-record edits: { id, ...updates }
// Login control:    { id, action: "deactivate"|"reactivate"|"reset_password", password? }
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, action, password, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const reps = await readTable("reps")
  const idx = reps.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (user.role === "dealer" && reps[idx].dealership !== user.dealership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Login-account actions (manager only)
  if (action) {
    if (!isManager(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const users = await readTable("users")
    const uidx = users.findIndex(u => u.role === "rep" && u.repId === id)
    if (uidx === -1) return NextResponse.json({ error: "This rep has no login account" }, { status: 404 })

    if (action === "deactivate")      users[uidx].is_active = false
    else if (action === "reactivate") users[uidx].is_active = true
    else if (action === "reset_password") {
      if ((password || "").length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      users[uidx].password_hash = await hashPassword(password)
    } else return NextResponse.json({ error: "Unknown action" }, { status: 400 })

    await writeTable("users", users)
    return NextResponse.json({ success: true, id, active: users[uidx].is_active !== false })
  }

  // Plain rep-record field edits
  reps[idx] = { ...reps[idx], ...updates }
  await writeTable("reps", reps)
  return NextResponse.json({ success: true, rep: reps[idx] })
}
