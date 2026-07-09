import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import fs from "fs"
import path from "path"

const REPS_FILE = path.join(process.cwd(), "data", "reps.json")

function readReps() {
  try { return JSON.parse(fs.readFileSync(REPS_FILE, "utf8")) } catch { return [] }
}

export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let reps = readReps()
  if (dealership) reps = reps.filter(r => r.dealership === dealership)

  reps.sort((a, b) => (b.rate || 0) - (a.rate || 0))

  return NextResponse.json({ success: true, reps })
}
