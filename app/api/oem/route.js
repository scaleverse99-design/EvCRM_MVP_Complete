export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../lib/auth"
import { readTable, writeTable } from "../../../lib/store"

function getOEM(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const p = verifyToken(token)
    // OEM tokens carry the oemId in `dealership`
    return p?.role === "oem" ? { ...p, oemId: p.dealership } : null
  } catch { return null }
}

/* ── The two-tier OEM access rule ────────────────────────────────────
   1. OEM-distributed dealer  → full access (the CRM was handed to the
      dealer by the OEM as its exclusive network tool)
   2. Self-registered dealer  → NO access until the OEM sponsors
      (pays) that dealer's monthly subscription                       */
export function oemCanAccess(dealerUser, oemId) {
  if (dealerUser?.oemId !== oemId) return false
  return !!(dealerUser.oemDistributed || dealerUser.oemSponsored)
}

// ── GET /api/oem — network overview + escalations ──────────────────
export async function GET(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const [users, leads, requests, bookings] = await Promise.all([
    readTable("users"), readTable("leads"), readTable("service_requests"), readTable("bookings"),
  ])

  const network = users.filter(u => u.role === "dealer" && u.oemId === oem.oemId)
  const dealers = network.map(d => {
    const access = oemCanAccess(d, oem.oemId)
    const base = {
      dealership: d.dealership,
      name: d.name,
      email: d.email,
      oemDistributed: !!d.oemDistributed,
      oemSponsored: !!d.oemSponsored,
      access,
      billingStatus: d.billingStatus || "trial",
    }
    if (!access) return base // locked — no operational data leaves the API
    return {
      ...base,
      leads: leads.filter(l => l.dealership === d.dealership).length,
      bookings: bookings.filter(b => b.dealership === d.dealership).length,
      serviceOpen: requests.filter(r => r.dealership === d.dealership && r.status === "OPEN").length,
      serviceEscalated: requests.filter(r => r.dealership === d.dealership && r.status === "ESCALATED_OEM").length,
    }
  })

  // Escalations: only from dealers the OEM can access
  const accessible = new Set(network.filter(d => oemCanAccess(d, oem.oemId)).map(d => d.dealership))
  const escalations = requests
    .filter(r => accessible.has(r.dealership) && r.status === "ESCALATED_OEM")
    .sort((a, b) => new Date(b.escalatedAt || b.createdAt) - new Date(a.escalatedAt || a.createdAt))

  return ok({ oemId: oem.oemId, dealers, escalations })
}

// ── PATCH /api/oem ──────────────────────────────────────────────────
// { action:"sponsor", dealership }            → OEM pays the dealer's
//   monthly subscription; unlocks access to that dealer's data
// { action:"assign_agent", requestId, agent } → assign a service agent
//   to an escalated request
export async function PATCH(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const body = await req.json()
  const at = new Date().toISOString()

  if (body.action === "sponsor") {
    const users = await readTable("users")
    const idx = users.findIndex(u => u.role === "dealer" && u.dealership === body.dealership && u.oemId === oem.oemId)
    if (idx === -1) return err("Dealer not found in your network", 404)
    users[idx].oemSponsored = true
    users[idx].sponsoredBy = oem.oemId
    users[idx].sponsoredAt = at
    users[idx].billingStatus = "active_oem_sponsored"
    await writeTable("users", users)
    return ok({ sponsored: body.dealership })
  }

  if (body.action === "assign_agent") {
    if (!body.agent?.trim()) return err("Agent name required", 400)
    const users = await readTable("users")
    const requests = await readTable("service_requests")
    const idx = requests.findIndex(r => r.id === body.requestId)
    if (idx === -1) return err("Request not found", 404)
    const dealer = users.find(u => u.role === "dealer" && u.dealership === requests[idx].dealership)
    if (!oemCanAccess(dealer, oem.oemId)) return err("No access to this dealer", 403)

    requests[idx].oemAgent = body.agent.trim()
    requests[idx].oemAssignedAt = at
    requests[idx].timeline = requests[idx].timeline || []
    requests[idx].timeline.push({ at, event: `OEM assigned service agent: ${body.agent.trim()}`, by: oem.email || oem.sub })
    await writeTable("service_requests", requests)
    return ok({ request: requests[idx] })
  }

  return err("Unknown action", 400)
}
