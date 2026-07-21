import { readTable } from "./store"

// Turn a title into a URL-safe slug. A short random suffix guarantees
// uniqueness without a collision-check round-trip (two "Maruti Ertiga
// Review 2026" posts must not clobber each other's URL).
export function slugify(title) {
  const base = (title || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "post"
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

// Given a post's matchModels (e.g. ["Ertiga", "Maruti XL6"]), return the
// live, publicly-visible inventory that matches — this is what powers the
// "Buy {model} from dealers near you" block under each article, and the
// whole point of the SEO→conversion flow. Matches on brand/model substring,
// case-insensitive. Author's own dealership floats to the top, then others
// (so "direct dealers nearby" shows the broadest real supply). Each row is
// enriched with the dealer's storefront slug for the link-through.
export async function matchInventoryForModels(models, authorDealership = null, limit = 12) {
  const wanted = (Array.isArray(models) ? models : [])
    .map(m => String(m || "").trim().toLowerCase())
    .filter(Boolean)
  if (wanted.length === 0) return []

  const [inv, users] = await Promise.all([readTable("inventory"), readTable("users")])
  const slugByDealership = new Map(
    users.filter(u => u.role === "dealer" && u.dealerSubdomain).map(u => [u.dealership, u.dealerSubdomain])
  )

  const visible = inv.filter(v =>
    v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")
  )

  const matched = visible.filter(v => {
    const hay = `${v.brand || ""} ${v.model || ""} ${v.variant || ""}`.toLowerCase()
    return wanted.some(w => hay.includes(w))
  })

  matched.sort((a, b) => {
    if (authorDealership) {
      if (a.dealership === authorDealership && b.dealership !== authorDealership) return -1
      if (b.dealership === authorDealership && a.dealership !== authorDealership) return 1
    }
    return (a.exShowroom || 0) - (b.exShowroom || 0) // cheapest first — "at low price"
  })

  return matched.slice(0, limit).map(v => ({
    id: v.id,
    brand: v.brand,
    model: v.model,
    variant: v.variant,
    type: v.type,
    fuelType: v.fuelType,
    exShowroom: v.exShowroom,
    images: Array.isArray(v.images) ? v.images.filter(i => typeof i === "string" && i.startsWith("http")).slice(0, 1) : [],
    dealerName: v.dealerName,
    district: v.district,
    state: v.state,
    dealerSubdomain: slugByDealership.get(v.dealership) || null,
  }))
}
