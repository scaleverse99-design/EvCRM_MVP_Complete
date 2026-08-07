import { NextResponse } from "next/server"
import { getMarketplaceVehicles } from "../../../../lib/marketplaceVehicles"

// Serves client-side filter changes on the showroom. The FIRST render is
// now done on the server (app/showroom/page.js and app/page.js call
// getMarketplaceVehicles directly), so this endpoint no longer decides
// whether the grid appears at all — only what happens after a user picks a
// filter. Both paths read the same loader so they cannot drift.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const data = await getMarketplaceVehicles({
    type: searchParams.get("type"),
    brand: searchParams.get("brand"),
    fuelType: searchParams.get("fuelType"),
    condition: searchParams.get("condition"),
    district: searchParams.get("district"),
    state: searchParams.get("state"),
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    minRange: searchParams.get("minRange"),
    dealership: searchParams.get("dealership"),
    tag: searchParams.get("tag"),
    q: searchParams.get("q"),
    sort: searchParams.get("sort"),
  })
  return NextResponse.json({ success: true, ...data })
}
