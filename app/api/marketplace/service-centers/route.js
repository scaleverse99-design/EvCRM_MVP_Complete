import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const FILE = path.join(process.cwd(), "data", "service_centers.json")

function read() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")) } catch { return [] } }

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const brand    = searchParams.get("brand")
  const district = searchParams.get("district")
  const state    = searchParams.get("state")

  let items = read()
  if (brand)    items = items.filter(s => s.brands?.some(b => b.toLowerCase().includes(brand.toLowerCase())))
  if (district) items = items.filter(s => s.district?.toLowerCase() === district.toLowerCase())
  if (state)    items = items.filter(s => s.state?.toLowerCase() === state.toLowerCase())

  items.sort((a,b) => (b.rating||0) - (a.rating||0))

  const all       = read()
  const districts = [...new Set(all.map(s => s.district).filter(Boolean))].sort()
  const brands    = [...new Set(all.flatMap(s => s.brands||[]))].sort()
  const states    = [...new Set(all.map(s => s.state).filter(Boolean))].sort()

  return NextResponse.json({ success: true, centers: items, total: items.length, filters: { districts, brands, states } })
}
