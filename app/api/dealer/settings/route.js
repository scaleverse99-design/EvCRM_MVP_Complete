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
  marketplaceAutoAssign: "round_robin", // round_robin | specific | off — how paid marketplace leads get assigned
  marketplaceRepId: "", // when marketplaceAutoAssign === "specific", the rep who receives every marketplace lead
  pipelineStages: ["NEW", "WARM", "HOT", "QUOTED", "CLOSED", "LOST"],
  whatsappTemplates: null, // null = use the built-in WA_REPLY_MAP defaults
  oemIntegrations: {}, // { tata: {enabled:false}, ather: {enabled:false}, mahindra: {enabled:false} } — reserved for OEM phase
}

// Self-registration (app/api/register/route.js) only ever created a `users`
// row for a new dealer, never a matching row in the separate `dealers`
// table that this route (and everything else keyed by dealership id) reads
// from. That left every self-registered dealer's Settings tab permanently
// stuck on "Loading settings…" (app/dealer/page.js SettingsSection bails
// out to that placeholder whenever `!settings`, and a 404 here left
// `settings` null forever). Rather than require a backfill for accounts
// already affected, self-heal by creating a minimal default row the first
// time it's needed, using whatever the owner's own account already has.
async function ensureDealerRow(dealership) {
  const dealers = await readTable("dealers")
  let dealer = dealers.find(d => d.id === dealership)
  if (dealer) return dealer

  const users = await readTable("users")
  const owner = users.find(u => u.dealership === dealership && u.role === "dealer")

  dealer = {
    id: dealership,
    name: owner?.dealershipName || owner?.name || "My Dealership",
    address: "",
    state: "",
    district: owner?.city || "",
    whatsapp: owner?.phone || "",
    gstNumber: "",
    createdAt: new Date().toISOString(),
  }
  dealers.push(dealer)
  await writeTable("dealers", dealers)
  return dealer
}

// GET: dealership profile + settings (with sensible defaults merged in)
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")
  if (!dealership) return NextResponse.json({ error: "No dealership on this account" }, { status: 400 })

  const dealer = await ensureDealerRow(dealership)

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
      marketplaceAutoAssign: dealer.marketplaceAutoAssign ?? DEFAULT_SETTINGS.marketplaceAutoAssign,
      marketplaceRepId: dealer.marketplaceRepId ?? DEFAULT_SETTINGS.marketplaceRepId,
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
  if (!dealership) return NextResponse.json({ error: "No dealership on this account" }, { status: 400 })

  await ensureDealerRow(dealership)

  const dealers = await readTable("dealers")
  const idx = dealers.findIndex(d => d.id === dealership)
  if (idx === -1) return NextResponse.json({ error: "Dealership not found" }, { status: 404 })

  const { dealership: _drop, ...updates } = body
  dealers[idx] = { ...dealers[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeTable("dealers", dealers)

  return NextResponse.json({ success: true, settings: dealers[idx] })
}
