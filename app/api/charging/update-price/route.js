import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DB_PATH = path.join(process.cwd(), "data", "user_tariff_updates.json")

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8")
      return JSON.parse(raw || "{}")
    }
  } catch (e) {
    console.warn("Failed to load user tariff updates db:", e)
  }
  return {}
}

function saveDb(db) {
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8")
    return true
  } catch (e) {
    console.warn("Failed to save user tariff updates db:", e)
    return false
  }
}

export async function GET(req) {
  const db = loadDb()
  return NextResponse.json({ success: true, updates: db })
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { stationId, stationName, newPrice, status, notes } = body

    if (!stationId || !newPrice) {
      return NextResponse.json({ success: false, error: "stationId and newPrice are required" }, { status: 400 })
    }

    const db = loadDb()
    const existing = db[stationId] || { count: 0, notesList: [] }

    const updated = {
      price: newPrice.trim(),
      status: status || "Operational",
      lastUpdated: new Date().toISOString().split("T")[0],
      count: (existing.count || 0) + 1,
      notes: notes ? notes.trim() : existing.notes || "",
      verifiedByCommunity: true
    }

    db[stationId] = updated
    saveDb(db)

    return NextResponse.json({
      success: true,
      message: "Tariff price successfully updated!",
      update: updated
    })
  } catch (err) {
    console.error("Error updating price:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
