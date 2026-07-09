import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let reps = await readTable("reps")
  if (dealership) reps = reps.filter(r => r.dealership === dealership)

  reps.sort((a, b) => (b.rate || 0) - (a.rate || 0))

  return NextResponse.json({ success: true, reps })
}

// POST: add a sales rep to the team (10.2 Team Management)
export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["dealer", "founder", "superadmin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const dealership = user.dealership || body.dealership
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const reps = await readTable("reps")
  const colors = ["#059669", "#2563EB", "#7C3AED", "#F97316", "#DB2777"]
  const rep = {
    id: `rep_${Date.now()}`,
    dealership,
    name: body.name.trim(),
    phone: body.phone || "",
    email: body.email || "",
    rate: 0,
    leads: 0,
    closed: 0,
    status: "online",
    active: true,
    color: colors[reps.length % colors.length],
    createdAt: new Date().toISOString(),
  }
  reps.push(rep)
  await writeTable("reps", reps)

  return NextResponse.json({ success: true, rep })
}

// PATCH: update or deactivate a rep (deactivate keeps historical lead data intact)
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const reps = await readTable("reps")
  const idx = reps.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (user.role === "dealer" && reps[idx].dealership !== user.dealership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  reps[idx] = { ...reps[idx], ...updates }
  await writeTable("reps", reps)

  return NextResponse.json({ success: true, rep: reps[idx] })
}
