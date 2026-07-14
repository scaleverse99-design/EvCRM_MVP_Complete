// ── app/api/dealer/attendance/route.js ───────────────────────────────
// Geo-tagged rep attendance on the app's own store (Supabase/local JSON),
// replacing the old direct-Firestore path that crashed in production
// (Firebase client keys are never shipped in the prod bundle).
//
// GET   → rep: own records; dealer/founder: all records for the dealership
// POST  { action:"punch_in",  lat, lng, accuracy } → creates today's record
// POST  { action:"punch_out", lat, lng }           → closes today's record
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

function getUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const today = () => new Date().toISOString().slice(0, 10)
const now12 = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })

// A rep's attendance identity: their rep record id when they have one,
// falling back to the login user id (dealers punching in for themselves).
const repKey = user => user.repId || user.sub

export async function GET(req) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let records = await readTable("attendance")
  if (user.role === "rep") {
    const me = repKey(user)
    records = records.filter(r => r.repId === me)
  } else {
    records = records.filter(r => r.dealership === user.dealership)
  }
  records.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  return NextResponse.json({ success: true, records })
}

export async function POST(req) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action, lat = null, lng = null, accuracy = null } = body
  const records = await readTable("attendance")
  const me = repKey(user)
  const todayRec = records.find(r => r.repId === me && r.date === today())

  if (action === "punch_in") {
    if (todayRec) return NextResponse.json({ error: "Already punched in today" }, { status: 409 })
    // JWT carries no display name — resolve it from the users table.
    const users = await readTable("users")
    const account = users.find(u => u.id === user.sub)
    const rec = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dealership: user.dealership,
      repId: me,
      repName: account?.name || user.email || "Rep",
      date: today(),
      punchIn: now12(),
      punchOut: null,
      lat, lng, accuracy,
      punchInAt: new Date().toISOString(),
      punchOutAt: null,
    }
    records.unshift(rec)
    await writeTable("attendance", records)
    return NextResponse.json({ success: true, record: rec })
  }

  if (action === "punch_out") {
    if (!todayRec) return NextResponse.json({ error: "No punch-in found for today" }, { status: 404 })
    if (todayRec.punchOut) return NextResponse.json({ error: "Already punched out today" }, { status: 409 })
    const idx = records.findIndex(r => r.id === todayRec.id)
    records[idx] = {
      ...todayRec,
      punchOut: now12(),
      punchOutLat: lat, punchOutLng: lng,
      punchOutAt: new Date().toISOString(),
    }
    await writeTable("attendance", records)
    return NextResponse.json({ success: true, record: records[idx] })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
