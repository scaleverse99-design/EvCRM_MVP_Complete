export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const AUTO_ESCALATE_MS = 48 * 60 * 60 * 1000 // 48 hours

async function getSettings(dealership) {
  const all = await readTable("service_settings")
  return all.find(s => s.id === dealership) || { id: dealership, autoEscalateOEM: false }
}

// ── GET /api/dealer/service — requests for this dealership ─────────
// Lazily enforces the 48h auto-escalation rule on read: any OPEN
// request the dealer hasn't responded to within 48h gets escalated to
// the OEM automatically (when the dealer has enabled the option).
export async function GET(req) {
  const user = getUser(req)
  if (!user) return err("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const settings = await getSettings(dealership)
  const requests = await readTable("service_requests")
  let changed = false

  if (settings.autoEscalateOEM) {
    const now = Date.now()
    for (const r of requests) {
      if (r.dealership === dealership && r.status === "OPEN" && !r.respondedAt &&
          now - new Date(r.createdAt).getTime() > AUTO_ESCALATE_MS) {
        const at = new Date().toISOString()
        r.status = "ESCALATED_OEM"
        r.escalatedAt = at
        r.escalatedBy = "auto"
        r.timeline = r.timeline || []
        r.timeline.push({ at, event: "Auto-escalated to OEM — dealer did not respond within 48 hours", by: "system" })
        changed = true
      }
    }
    if (changed) await writeTable("service_requests", requests)
  }

  const mine = requests
    .filter(r => r.dealership === dealership)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return ok({ requests: mine, settings: { autoEscalateOEM: !!settings.autoEscalateOEM } })
}

// ── PATCH /api/dealer/service ───────────────────────────────────────
// { id, action: "respond" | "resolve" | "escalate", note? }
// { action: "toggle_auto_escalate", enabled }
export async function PATCH(req) {
  const user = getUser(req)
  if (!user) return err("Unauthorized", 401)

  const body = await req.json()
  const dealership = user.dealership || body.dealership
  const by = user.email || user.sub
  const at = new Date().toISOString()

  if (body.action === "toggle_auto_escalate") {
    const all = await readTable("service_settings")
    const idx = all.findIndex(s => s.id === dealership)
    const row = { id: dealership, autoEscalateOEM: !!body.enabled, updatedAt: at }
    if (idx === -1) all.push(row); else all[idx] = { ...all[idx], ...row }
    await writeTable("service_settings", all)
    return ok({ settings: { autoEscalateOEM: !!body.enabled } })
  }

  const requests = await readTable("service_requests")
  const idx = requests.findIndex(r => r.id === body.id && r.dealership === dealership)
  if (idx === -1) return err("Request not found", 404)
  const r = requests[idx]
  r.timeline = r.timeline || []

  if (body.action === "respond") {
    if (!r.respondedAt) { r.respondedAt = at; r.respondedBy = by }
    r.status = "IN_PROGRESS"
    r.timeline.push({ at, event: body.note ? `Dealer responded: ${body.note}` : "Dealer responded — working on the issue", by })

  } else if (body.action === "resolve") {
    if (!r.respondedAt) { r.respondedAt = at; r.respondedBy = by }
    r.status = "RESOLVED"
    r.resolvedAt = at
    r.timeline.push({ at, event: body.note ? `Resolved: ${body.note}` : "Issue resolved", by })

  } else if (body.action === "escalate") {
    // Dealer forwards to the OEM for service booking / faster escalation
    if (!r.respondedAt) { r.respondedAt = at; r.respondedBy = by }
    r.status = "ESCALATED_OEM"
    r.escalatedAt = at
    r.escalatedBy = by
    r.oemNote = body.note || ""
    r.timeline.push({ at, event: body.note ? `Escalated to OEM: ${body.note}` : "Escalated to OEM for service booking", by })

  } else {
    return err("Unknown action", 400)
  }

  await writeTable("service_requests", requests)
  return ok({ request: r })
}
