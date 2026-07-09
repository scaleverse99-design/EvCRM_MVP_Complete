import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import fs from "fs"
import path from "path"

const FEED_FILE = path.join(process.cwd(), "data", "feed.json")
const LEADS_FILE = path.join(process.cwd(), "data", "leads.json")

function readFeed() {
  try { return JSON.parse(fs.readFileSync(FEED_FILE, "utf8")) } catch { return [] }
}

function writeFeed(feed) {
  fs.writeFileSync(FEED_FILE, JSON.stringify(feed, null, 2))
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
}

export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let feed = readFeed()
  if (dealership) feed = feed.filter(f => f.dealership === dealership)

  feed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  feed = feed.slice(0, 5)

  return NextResponse.json({ success: true, feed })
}

export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const feed = readFeed()

  const newEvent = {
    id: `feed_${Date.now()}`,
    dealership: body.dealership || "hyd-d01",
    type: body.type || "EVENT",
    label: body.label || "EVENT",
    msg: body.msg || "",
    sub: body.sub || "",
    icon: body.icon || "✦",
    color: body.color || "#2563EB",
    actionLabel: body.actionLabel || "View",
    created_at: new Date().toISOString()
  }

  feed.unshift(newEvent)
  writeFeed(feed)

  return NextResponse.json({ success: true, event: newEvent })
}
