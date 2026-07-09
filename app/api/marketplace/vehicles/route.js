import { NextResponse } from "next/server"
import { readTable } from "../../../../lib/store"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const type       = searchParams.get("type")       // 2W | 4W | 3W
  const brand      = searchParams.get("brand")
  const district   = searchParams.get("district")
  const state      = searchParams.get("state")
  const minPrice   = searchParams.get("minPrice")
  const maxPrice   = searchParams.get("maxPrice")
  const minRange   = searchParams.get("minRange")
  const dealership = searchParams.get("dealership")
  const tag        = searchParams.get("tag")
  const q          = searchParams.get("q")           // free text search
  const sort       = searchParams.get("sort") || "default"

  const all = await readTable("inventory")
  let items = all.filter(v => v.status === "IN_STOCK")

  if (type)       items = items.filter(v => v.type === type)
  if (brand)      items = items.filter(v => v.brand.toLowerCase() === brand.toLowerCase())
  if (district)   items = items.filter(v => v.district?.toLowerCase() === district.toLowerCase())
  if (state)      items = items.filter(v => v.state?.toLowerCase() === state.toLowerCase())
  if (dealership) items = items.filter(v => v.dealership === dealership)
  if (tag)        items = items.filter(v => v.tags?.includes(tag))
  if (minPrice)   items = items.filter(v => v.exShowroom >= parseInt(minPrice))
  if (maxPrice)   items = items.filter(v => v.exShowroom <= parseInt(maxPrice))
  if (minRange)   items = items.filter(v => v.range >= parseInt(minRange))
  if (q) {
    const ql = q.toLowerCase()
    items = items.filter(v =>
      v.brand.toLowerCase().includes(ql) ||
      v.model.toLowerCase().includes(ql) ||
      v.variant?.toLowerCase().includes(ql) ||
      v.bodyType?.toLowerCase().includes(ql)
    )
  }

  if (sort === "price_asc")   items.sort((a,b) => a.exShowroom - b.exShowroom)
  if (sort === "price_desc")  items.sort((a,b) => b.exShowroom - a.exShowroom)
  if (sort === "range_desc")  items.sort((a,b) => b.range - a.range)
  if (sort === "rating_desc") items.sort((a,b) => b.rating - a.rating)

  // Aggregated filter options for the filter bar
  const brands    = [...new Set(all.map(v => v.brand))].sort()
  const districts = [...new Set(all.map(v => v.district).filter(Boolean))].sort()
  const types     = [...new Set(all.map(v => v.type))].sort()

  return NextResponse.json({ success: true, vehicles: items, total: items.length, filters: { brands, districts, types } })
}
