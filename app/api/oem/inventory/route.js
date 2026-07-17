export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable } from "../../../../lib/store"
import { oemCanAccess } from "../route"

function getOEM(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const p = verifyToken(token)
    return p?.role === "oem" ? { ...p, oemId: p.dealership } : null
  } catch { return null }
}

// Legacy statuses fold into the tracker buckets: RESERVED was the old name
// for BOOKED; UNAVAILABLE is treated as dead stock.
function bucketOf(status) {
  if (status === "RESERVED") return "BOOKED"
  if (status === "UNAVAILABLE") return "DEAD_STOCK"
  return ["IN_STOCK", "BOOKED", "SOLD", "CANCELLED", "DEAD_STOCK"].includes(status) ? status : "IN_STOCK"
}

// GET /api/oem/inventory — network-wide inventory tracker across all
// accessible dealers: totals, per-dealer breakdown, cancellation/dead-stock
// reasons, and the vehicle list (metadata only — no image payloads).
export async function GET(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const [users, inventory] = await Promise.all([readTable("users"), readTable("inventory")])

  const network = users.filter(u => u.role === "dealer" && u.oemId === oem.oemId)
  const accessible = new Map(network.filter(d => oemCanAccess(d, oem.oemId)).map(d => [d.dealership, d.dealershipName || d.name]))

  const vehicles = inventory
    .filter(v => accessible.has(v.dealership))
    .map(v => ({
      id: v.id,
      dealership: v.dealership,
      dealerName: accessible.get(v.dealership),
      brand: v.brand, model: v.model, variant: v.variant || "",
      type: v.type, exShowroom: v.exShowroom || 0,
      status: bucketOf(v.status),
      rawStatus: v.status,
      statusReason: v.statusReason || "",
      updatedAt: v.updatedAt || v.createdAt || null,
    }))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

  const BUCKETS = ["IN_STOCK", "BOOKED", "SOLD", "CANCELLED", "DEAD_STOCK"]
  const summary = {}
  BUCKETS.forEach(s => { summary[s] = vehicles.filter(v => v.status === s).length })
  summary.TOTAL = vehicles.length

  // Per-dealer breakdown
  const perDealer = [...accessible.entries()].map(([dealership, businessName]) => {
    const mine = vehicles.filter(v => v.dealership === dealership)
    const row = { dealership, businessName, total: mine.length }
    BUCKETS.forEach(s => { row[s] = mine.filter(v => v.status === s).length })
    return row
  }).filter(r => r.total > 0).sort((a, b) => b.total - a.total)

  // Reason rollups — grouped case-insensitively, keep the first-seen casing
  const reasonRollup = (bucket) => {
    const map = {}
    vehicles.filter(v => v.status === bucket && v.statusReason).forEach(v => {
      const key = v.statusReason.toLowerCase().trim()
      if (!map[key]) map[key] = { reason: v.statusReason.trim(), count: 0, vehicles: [] }
      map[key].count++
      if (map[key].vehicles.length < 5) map[key].vehicles.push(`${v.brand} ${v.model} (${v.dealerName})`)
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }

  return ok({
    summary,
    perDealer,
    cancelReasons: reasonRollup("CANCELLED"),
    deadStockReasons: reasonRollup("DEAD_STOCK"),
    vehicles: vehicles.slice(0, 500),
    totalVehicles: vehicles.length,
  })
}
