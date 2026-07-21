export const dynamic = "force-dynamic"

import { verifyToken } from "../../../../lib/auth"
import { readTable } from "../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const WINDOW_DAYS = 30

// GET — cross-references the site-wide Knowledge Hub search log
// (app/api/learn/search) against this dealer's own inventory and location,
// so a raw "what are people searching for" feed becomes two answerable
// questions instead: "should I stock more of what I already sell" and
// "what are buyers near me actually interested in."
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const [logs, inventory, users] = await Promise.all([
    readTable("search_queries"),
    readTable("inventory"),
    readTable("users"),
  ])

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = logs.filter(l => l.brand && new Date(l.createdAt) >= cutoff)

  const myInventory = inventory.filter(v => v.dealership === user.dealership)
  const myBrands = new Set(myInventory.map(v => (v.brand || "").toLowerCase()).filter(Boolean))

  const dealerUser = users.find(u => u.dealership === user.dealership && u.role === "dealer")

  const stockCounts = {}
  const nearCounts = {}
  for (const l of recent) {
    const brandKey = l.brand.toLowerCase()
    if (myBrands.has(brandKey)) {
      stockCounts[l.brand] = (stockCounts[l.brand] || 0) + 1
    }
    const matchesLocation =
      (dealerUser?.city && l.district && l.district === dealerUser.city) ||
      (dealerUser?.state && l.state && l.state === dealerUser.state)
    if (matchesLocation) {
      nearCounts[l.brand] = (nearCounts[l.brand] || 0) + 1
    }
  }

  const toSorted = (counts) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([brand, count]) => ({ brand, count }))

  return Response.json({
    success: true,
    windowDays: WINDOW_DAYS,
    totalSearches: recent.length,
    trendingInStock: toSorted(stockCounts),
    trendingNearYou: toSorted(nearCounts),
    hasLocation: !!(dealerUser?.city || dealerUser?.state),
  })
}
