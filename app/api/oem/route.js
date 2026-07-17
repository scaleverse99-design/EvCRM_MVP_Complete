export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../lib/auth"
import { readTable, writeTable } from "../../../lib/store"
import { sendOEMSponsorshipEmail, sendBulkImportVerificationEmail } from "../../../lib/email"
import jwt from "jsonwebtoken"

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

const MRR_PER_DEALER = 3000

// ── GET /api/oem — network overview, feedback, stock requests, trends ──
export async function GET(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const [users, leads, serviceRequests, bookings, quotes, inventory, stockRequests] = await Promise.all([
    readTable("users"), readTable("leads"), readTable("service_requests"), readTable("bookings"),
    readTable("quotes"), readTable("inventory"), readTable("stock_requests"),
  ])

  const network = users.filter(u => u.role === "dealer" && u.oemId === oem.oemId)
  const accessible = new Set(network.filter(d => oemCanAccess(d, oem.oemId)).map(d => d.dealership))

  const dealers = network.map(d => {
    const access = oemCanAccess(d, oem.oemId)
    const base = {
      dealership: d.dealership,
      name: d.name,
      email: d.email,
      phone: d.phone || "",
      businessName: d.dealershipName || d.name,
      oemDistributed: !!d.oemDistributed,
      oemSponsored: !!d.oemSponsored,
      access,
      billingStatus: d.billingStatus || "trial",
      subscriptionCost: (d.billingStatus || "").startsWith("active") ? MRR_PER_DEALER : 0,
      // Bulk-imported dealers who haven't opened their verification link yet —
      // the UI lists these separately with resend actions
      pendingVerification: d.status === "pending_verification",
      verificationTokenExpiry: d.status === "pending_verification" ? d.verificationTokenExpiry || null : null,
    }
    if (!access) return base // locked — no operational data leaves the API

    const dealerLeads = leads.filter(l => l.dealership === d.dealership)
    const closed = dealerLeads.filter(l => l.status === "CLOSED").length
    return {
      ...base,
      leads: dealerLeads.length,
      closed,
      conversionRate: dealerLeads.length ? Math.round((closed / dealerLeads.length) * 100) : 0,
      bookings: bookings.filter(b => b.dealership === d.dealership).length,
      serviceOpen: serviceRequests.filter(r => r.dealership === d.dealership && r.status === "OPEN").length,
      serviceEscalated: serviceRequests.filter(r => r.dealership === d.dealership && r.status === "ESCALATED_OEM").length,
    }
  })

  // Escalations: only from dealers the OEM can access
  const escalations = serviceRequests
    .filter(r => accessible.has(r.dealership) && r.status === "ESCALATED_OEM")
    .sort((a, b) => new Date(b.escalatedAt || b.createdAt) - new Date(a.escalatedAt || a.createdAt))

  // Quote rejections — customers who declined a quote, with their stated reason(s)
  const quoteRejections = quotes
    .filter(q => accessible.has(q.dealership) && q.customerResponse === "not_agreed")
    .map(q => ({
      id: q.id, dealership: q.dealership, dealerName: q.dealerName,
      customerName: q.customerName, vehicleName: q.vehicleName,
      rejectionReasons: q.rejectionReasons || [], customerFeedback: q.customerFeedback || "",
      createdAt: q.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50)

  // Rep comments — recent notes logged against leads, across accessible dealers
  const repComments = leads
    .filter(l => accessible.has(l.dealership) && Array.isArray(l.notes) && l.notes.length)
    .flatMap(l => l.notes.map(n => ({
      dealership: l.dealership, leadName: l.name, vehicle: l.vehicle,
      text: n.text, channel: n.channel, author: n.author, at: n.created_at,
    })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 50)

  // Stock requests raised by dealers against this OEM
  const myStockRequests = stockRequests
    .filter(r => r.oemId === oem.oemId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Leads across accessible dealers — the OEM's inside sales team calls these
  // to verify genuine interest before routing the customer to the dealer showroom.
  const oemLeads = leads
    .filter(l => accessible.has(l.dealership))
    .map(l => ({
      id: l.id, dealership: l.dealership,
      dealerName: (() => { const d = network.find(d => d.dealership === l.dealership); return d?.dealershipName || d?.name || l.dealership })(),
      name: l.name, phone: l.phone, vehicle: l.vehicle, status: l.status,
      insideSalesAgent: l.insideSalesAgent || null, insideSalesAssignedAt: l.insideSalesAssignedAt || null,
      oemVerified: !!l.oemVerified, oemVerifiedAt: l.oemVerifiedAt || null,
      createdAt: l.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100)

  // Location trends — vehicle demand by state, from accessible dealers' bookings
  const invById = new Map(inventory.map(v => [v.id, v]))
  const trendMap = {}
  bookings.filter(b => accessible.has(b.dealership)).forEach(b => {
    const v = invById.get(b.vehicleId)
    const state = v?.state || "Unknown"
    const model = `${v?.brand || ""} ${v?.model || b.vehicleName || ""}`.trim()
    const key = `${state}||${model}`
    trendMap[key] = (trendMap[key] || 0) + 1
  })
  const locationTrends = Object.entries(trendMap)
    .map(([key, count]) => { const [state, model] = key.split("||"); return { state, model, count } })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  return ok({ oemId: oem.oemId, dealers, escalations, quoteRejections, repComments, stockRequests: myStockRequests, locationTrends, leads: oemLeads })
}

// ── PATCH /api/oem ──────────────────────────────────────────────────
// { action:"sponsor", dealership }               → OEM pays the dealer's
//   monthly subscription; unlocks access to that dealer's data
// { action:"assign_agent", requestId, agent }    → assign a service agent
//   to an escalated request
// { action:"update_stock_request", requestId, status } → PENDING/APPROVED/FULFILLED/REJECTED
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

    // Informational email — doesn't block sponsorship if it fails
    try {
      const oemUser = users.find(u => u.role === "oem" && u.dealership === oem.oemId)
      const dealer = users[idx]
      const joinedAt = new Date(dealer.trialStartDate || dealer.createdAt || at)
      const daysUsingCRM = Math.max(0, Math.floor((new Date(at) - joinedAt) / (1000 * 60 * 60 * 24)))
      await sendOEMSponsorshipEmail({
        to: dealer.email,
        dealerName: dealer.name,
        oemName: oemUser?.oemName || oemUser?.name || "your OEM partner",
        daysUsingCRM,
      })
    } catch (emailErr) {
      console.error("[oem/sponsor] sponsorship email failed:", emailErr.message)
    }

    return ok({ sponsored: body.dealership })
  }

  // Regenerate a pending dealer's verification link (7 days) without
  // re-uploading anything. Emails it automatically when the account has an
  // email; always returns verifyUrl + waUrl so the UI can offer WhatsApp/copy.
  if (body.action === "resend_verification") {
    const users = await readTable("users")
    const idx = users.findIndex(u => u.role === "dealer" && u.dealership === body.dealership && u.oemId === oem.oemId)
    if (idx === -1) return err("Dealer not found in your network", 404)
    const dealer = users[idx]
    if (dealer.status !== "pending_verification") return err("This dealer is already verified", 400)

    const verificationToken = jwt.sign(
      { email: dealer.email || "", dealership: dealer.dealership, oemId: oem.oemId, type: "dealer_verification" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    )
    const expiryTime = new Date()
    expiryTime.setDate(expiryTime.getDate() + 7)
    users[idx] = { ...dealer, verificationToken, verificationTokenExpiry: expiryTime.toISOString(), verificationResentAt: at }
    await writeTable("users", users)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"
    const verifyUrl = `${appUrl}/dealer/verify-profile?token=${verificationToken}`
    const oemUser = users.find(u => u.role === "oem" && u.dealership === oem.oemId)
    const oemName = oemUser?.dealershipName || oemUser?.name || "EvCRM"

    let emailSent = false
    if (dealer.email) {
      try {
        await sendBulkImportVerificationEmail({
          email: dealer.email, dealerName: dealer.name, businessName: dealer.dealershipName || dealer.name,
          ownerName: dealer.ownerName || "", phone: dealer.phone, city: dealer.city, state: dealer.state,
          verificationToken, oemName,
        })
        emailSent = true
      } catch (e) {
        console.error("[oem/resend_verification] email failed:", e.message)
      }
    }

    const waUrl = dealer.phone
      ? `https://wa.me/91${dealer.phone}?text=${encodeURIComponent(`Hi ${dealer.name}! ${oemName} has set up your EvCRM dealer account. Please verify your details and set your password here (link valid 7 days): ${verifyUrl}`)}`
      : null

    return ok({ resent: true, emailSent, verifyUrl, waUrl, expiresAt: expiryTime.toISOString() })
  }

  // Send onboarding/verification emails to a batch of selected pending
  // dealers (each gets a fresh 7-day token). Capped per call — the UI loops
  // batches so a 2K-dealer send never hits the request timeout that killed
  // the old confirm-step auto-send.
  if (body.action === "send_onboard_emails") {
    const requested = Array.isArray(body.dealerships) ? body.dealerships.slice(0, 50) : []
    if (!requested.length) return err("No dealers selected", 400)

    const users = await readTable("users")
    const oemUser = users.find(u => u.role === "oem" && u.dealership === oem.oemId)
    const oemName = oemUser?.dealershipName || oemUser?.name || "EvCRM"

    const results = []
    for (const dealership of requested) {
      const idx = users.findIndex(u => u.role === "dealer" && u.dealership === dealership && u.oemId === oem.oemId)
      if (idx === -1) { results.push({ dealership, sent: false, error: "not found" }); continue }
      const d = users[idx]
      if (d.status !== "pending_verification") { results.push({ dealership, sent: false, error: "already verified" }); continue }
      if (!d.email) { results.push({ dealership, sent: false, error: "no email — use WhatsApp" }); continue }

      const verificationToken = jwt.sign(
        { email: d.email, dealership, oemId: oem.oemId, type: "dealer_verification" },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "7d" }
      )
      const expiryTime = new Date()
      expiryTime.setDate(expiryTime.getDate() + 7)
      users[idx] = { ...d, verificationToken, verificationTokenExpiry: expiryTime.toISOString(), verificationResentAt: at }

      try {
        await sendBulkImportVerificationEmail({
          email: d.email, dealerName: d.name, businessName: d.dealershipName || d.name,
          ownerName: d.ownerName || "", phone: d.phone, city: d.city, state: d.state,
          verificationToken, oemName,
        })
        results.push({ dealership, sent: true })
      } catch (e) {
        results.push({ dealership, sent: false, error: e.message })
      }
    }

    await writeTable("users", users)
    return ok({
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      results,
    })
  }

  // Delete a bulk-imported dealer that never verified — for cleaning up test
  // imports or dead contacts. Refuses anything already verified/active, so an
  // account with real activity can never be removed this way.
  if (body.action === "remove_pending") {
    const users = await readTable("users")
    const idx = users.findIndex(u => u.role === "dealer" && u.dealership === body.dealership && u.oemId === oem.oemId)
    if (idx === -1) return err("Dealer not found in your network", 404)
    if (users[idx].status !== "pending_verification") return err("Only pending-verification dealers can be removed", 400)
    const removed = users.splice(idx, 1)[0]
    await writeTable("users", users)
    return ok({ removed: removed.dealership, name: removed.name })
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

  if (body.action === "assign_inside_sales") {
    if (!body.agent?.trim()) return err("Agent name required", 400)
    const users = await readTable("users")
    const leads = await readTable("leads")
    const idx = leads.findIndex(l => l.id === body.leadId)
    if (idx === -1) return err("Lead not found", 404)
    const dealer = users.find(u => u.role === "dealer" && u.dealership === leads[idx].dealership)
    if (!oemCanAccess(dealer, oem.oemId)) return err("No access to this dealer's leads", 403)

    leads[idx].insideSalesAgent = body.agent.trim()
    leads[idx].insideSalesAssignedAt = at
    await writeTable("leads", leads)
    return ok({ lead: leads[idx] })
  }

  if (body.action === "verify_lead") {
    const users = await readTable("users")
    const leads = await readTable("leads")
    const idx = leads.findIndex(l => l.id === body.leadId)
    if (idx === -1) return err("Lead not found", 404)
    const dealer = users.find(u => u.role === "dealer" && u.dealership === leads[idx].dealership)
    if (!oemCanAccess(dealer, oem.oemId)) return err("No access to this dealer's leads", 403)

    leads[idx].oemVerified = !!body.verified
    leads[idx].oemVerifiedAt = body.verified ? at : null
    await writeTable("leads", leads)
    return ok({ lead: leads[idx] })
  }

  if (body.action === "update_stock_request") {
    if (!["APPROVED", "FULFILLED", "REJECTED"].includes(body.status)) return err("Invalid status", 400)
    const requests = await readTable("stock_requests")
    const idx = requests.findIndex(r => r.id === body.requestId)
    if (idx === -1) return err("Request not found", 404)
    if (requests[idx].oemId !== oem.oemId) return err("No access to this request", 403)

    requests[idx].status = body.status
    requests[idx].resolvedAt = at
    await writeTable("stock_requests", requests)
    return ok({ request: requests[idx] })
  }

  return err("Unknown action", 400)
}
