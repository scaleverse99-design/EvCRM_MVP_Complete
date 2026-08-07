/**
 * Shared loader for the public marketplace vehicle list.
 *
 * Extracted 2026-08-07 so the showroom page can render its grid on the
 * SERVER and the API route can keep serving the same data to client-side
 * filter changes — one implementation, no drift.
 *
 * ── Why this matters more than it looks ──────────────────────────────
 * The homepage IS the showroom, and it fetched this list in useEffect. So
 * the served HTML contained ZERO <img> tags and no vehicle content: the
 * largest element could not paint until the bundle loaded and this API
 * responded. Measured on production 2026-08-07 via PageSpeed:
 *
 *   Performance   44 mobile / 36 desktop
 *   CLS           0.282 mobile / 0.327 desktop  (fails; good is < 0.1)
 *
 * Desktop scoring BELOW mobile was the tell — desktop renders a wider grid,
 * so it does strictly more post-JS work. One root cause behind four
 * symptoms: low Performance, the desktop inversion, failing CLS, and the
 * malformed accessibility tree PageSpeed's Agentic Browsing category flags.
 */

import { readTable } from "./store"

/**
 * @param {object} [f] filter values (all optional, same names as the API's
 *   query params). Unknown/absent values are simply not applied.
 * @returns {Promise<{vehicles, total, filters}>}
 */
export async function getMarketplaceVehicles(f = {}) {
  const all = await readTable("inventory")

  // Exclude dummy/simulated stock and unverified listings. The images check
  // is deliberate: a listing with no real photo looks broken on the grid,
  // and an emoji placeholder is not a photo.
  let items = all.filter(v =>
    v.status === "IN_STOCK" &&
    !v.tags?.includes("SIMULATED_STOCK") &&
    !v.isDemo &&
    (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED") &&
    (Array.isArray(v.images) && v.images.length > 0 && typeof v.images[0] === "string" && v.images[0].startsWith("http"))
  )

  // Attach each vehicle's dealer storefront slug so consumer pages can route
  // visitors onward to the dealer's page on the main domain (the hub model:
  // external traffic lands on evcrm.in, then flows to the dealer surface).
  try {
    const users = await readTable("users")
    const slugByDealership = new Map(
      users.filter(u => u.role === "dealer" && u.dealerSubdomain).map(u => [u.dealership, u.dealerSubdomain])
    )
    items = items.map(v => ({ ...v, dealerSubdomain: slugByDealership.get(v.dealership) || null }))
  } catch (e) {
    console.error("[marketplaceVehicles] slug join failed:", e.message)
  }

  if (f.type)       items = items.filter(v => v.type === f.type)
  if (f.brand)      items = items.filter(v => v.brand.toLowerCase() === String(f.brand).toLowerCase())
  if (f.fuelType)   items = items.filter(v => (v.fuelType || "Electric").toLowerCase() === String(f.fuelType).toLowerCase())
  if (f.condition)  items = items.filter(v => (v.condition || "new").toLowerCase() === String(f.condition).toLowerCase())
  if (f.district)   items = items.filter(v => v.district?.toLowerCase() === String(f.district).toLowerCase())
  if (f.state)      items = items.filter(v => v.state?.toLowerCase() === String(f.state).toLowerCase())
  if (f.dealership) items = items.filter(v => v.dealership === f.dealership)
  if (f.tag)        items = items.filter(v => v.tags?.includes(f.tag))
  if (f.minPrice)   items = items.filter(v => v.exShowroom >= parseInt(f.minPrice))
  if (f.maxPrice)   items = items.filter(v => v.exShowroom <= parseInt(f.maxPrice))
  if (f.minRange)   items = items.filter(v => v.range >= parseInt(f.minRange))
  if (f.q) {
    const ql = String(f.q).toLowerCase()
    items = items.filter(v =>
      v.brand.toLowerCase().includes(ql) ||
      v.model.toLowerCase().includes(ql) ||
      v.variant?.toLowerCase().includes(ql) ||
      v.bodyType?.toLowerCase().includes(ql)
    )
  }

  const sort = f.sort || "default"
  if (sort === "price_asc")   items.sort((a, b) => a.exShowroom - b.exShowroom)
  if (sort === "price_desc")  items.sort((a, b) => b.exShowroom - a.exShowroom)
  if (sort === "range_desc")  items.sort((a, b) => b.range - a.range)
  if (sort === "rating_desc") items.sort((a, b) => b.rating - a.rating)

  // Filter-bar options come from the UNFILTERED set on purpose — otherwise
  // picking a brand would remove every other brand from the dropdown.
  const brands    = [...new Set(all.map(v => v.brand))].sort()
  const districts = [...new Set(all.map(v => v.district).filter(Boolean))].sort()
  const types     = [...new Set(all.map(v => v.type))].sort()

  return { vehicles: items, total: items.length, filters: { brands, districts, types } }
}
