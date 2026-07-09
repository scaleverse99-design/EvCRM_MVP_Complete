// ── app/api/dealer/settings/route.js ─────────────────────────────────
// Module 10: Dealer Settings & Configuration. Settings belong to the
// dealership itself (data/dealers.json), not the individual login account,
// since multiple reps/logins under one dealership share the same config.

import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const DEFAULT_SETTINGS = {
  gstNumber: "",
  logo: "",
  workingHours: { start: "09:00", end: "19:00", daysOff: [] },
  notificationPrefs: { newLead: true, testDriveBooked: true, dealClosed: true, overdueFollowup: true },
  routingRule: "manual", // manual | round_robin | lowest_workload | specialisation
  pipelineStages: ["NEW", "WARM", "HOT", "QUOTED", "CLOSED", "LOST"],
  whatsappTemplates: null, // null = use the built-in WA_REPLY_MAP defaults
  oemIntegrations: {}, // { tata: {enabled:false}, ather: {enabled:false}, mahindra: {enabled:false} } — reserved for OEM phase
}

// GET: dealership profile + settings (with sensible defaults merged in)
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const dealers = await readTable("dealers")
  const dealer = dealers.find(d => d.id === dealership)
  if (!dealer) return NextResponse.json({ error: "Dealership not found" }, { status: 404 })

  return NextResponse.json({
    success: true,
    settings: {
      id: dealer.id,
      name: dealer.name,
      address: dealer.address || "",
      state: dealer.state || "",
      district: dealer.district || "",
      whatsapp: dealer.whatsapp || "",
      gstNumber: dealer.gstNumber ?? DEFAULT_SETTINGS.gstNumber,
      logo: dealer.logo ?? DEFAULT_SETTINGS.logo,
      workingHours: dealer.workingHours ?? DEFAULT_SETTINGS.workingHours,
      notificationPrefs: dealer.notificationPrefs ?? DEFAULT_SETTINGS.notificationPrefs,
      routingRule: dealer.routingRule ?? DEFAULT_SETTINGS.routingRule,
      pipelineStages: dealer.pipelineStages ?? DEFAULT_SETTINGS.pipelineStages,
      whatsappTemplates: dealer.whatsappTemplates ?? DEFAULT_SETTINGS.whatsappTemplates,
      oemIntegrations: dealer.oemIntegrations ?? DEFAULT_SETTINGS.oemIntegrations,
    },
  })
}

// PATCH: update any subset of settings fields
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["dealer", "founder", "superadmin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const dealership = user.dealership || body.dealership

  const dealers = await readTable("dealers")
  const idx = dealers.findIndex(d => d.id === dealership)
  if (idx === -1) return NextResponse.json({ error: "Dealership not found" }, { status: 404 })

  const { dealership: _drop, ...updates } = body
  dealers[idx] = { ...dealers[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeTable("dealers", dealers)

  return NextResponse.json({ success: true, settings: dealers[idx] })
}
