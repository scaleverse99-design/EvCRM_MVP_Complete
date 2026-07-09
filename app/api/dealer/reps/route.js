import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable } from "../../../../lib/store"

export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let reps = await readTable("reps")
  if (dealership) reps = reps.filter(r => r.dealership === dealership)

  reps.sort((a, b) => (b.rate || 0) - (a.rate || 0))

  return NextResponse.json({ success: true, reps })
}
