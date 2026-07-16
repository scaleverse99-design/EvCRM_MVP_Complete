export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import * as XLSX from "xlsx"

function getOEM(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const p = verifyToken(token)
    return p?.role === "oem" ? { ...p, oemId: p.dealership } : null
  } catch { return null }
}

// Keep last 10 digits — normalizes "+91 98866 00171", "09886600171", etc.
function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "").slice(-10)
}

// Fuzzy header detection: works with any contact-export style file
// (e.g. "Phone Number" / "Public Display Name" / "comments " with a trailing space).
function detectColumns(headers) {
  const find = (...words) => headers.find(h => {
    const k = h.toLowerCase().trim()
    return words.some(w => k.includes(w))
  })
  return {
    phone: find("phone", "mobile", "contact no", "whatsapp"),
    name: find("name"),
    notes: find("comment", "note", "remark", "feedback", "status"),
    email: find("email", "mail"),
    city: find("city", "location"),
    state: find("state", "region"),
  }
}

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "NOT_INTERESTED"]

// GET /api/oem/prospects — list this OEM's prospects
export async function GET(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const prospects = (await readTable("prospects"))
    .filter(p => p.oemId === oem.oemId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const counts = {}
  STATUSES.forEach(s => { counts[s] = prospects.filter(p => p.status === s).length })

  return ok({ prospects, counts, total: prospects.length })
}

// POST /api/oem/prospects — upload a contacts file, import rows directly.
// Prospects are just a call list (no accounts, no emails sent), so unlike
// bulk-import there is no preview/confirm step — rows land immediately.
export async function POST(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!file) return err("No file uploaded", 400)
    if (file.size > 5 * 1024 * 1024) return err("File is too large (max 5 MB)", 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    let rows
    try {
      const wb = XLSX.read(buffer, { type: "buffer" })
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    } catch (e) {
      return err(`Could not read file: ${e.message}`, 400)
    }
    if (!rows.length) return err("File contains no data rows", 400)

    const cols = detectColumns(Object.keys(rows[0]))
    if (!cols.phone) return err(`No phone column found. Detected headers: ${Object.keys(rows[0]).join(", ")}`, 400)

    const prospects = await readTable("prospects")
    const existingPhones = new Set(prospects.filter(p => p.oemId === oem.oemId).map(p => p.phone))

    const at = new Date().toISOString()
    let added = 0, skippedDuplicate = 0, skippedInvalid = 0

    for (const row of rows) {
      const phone = normalizePhone(row[cols.phone])
      if (phone.length !== 10) { skippedInvalid++; continue }
      if (existingPhones.has(phone)) { skippedDuplicate++; continue }
      existingPhones.add(phone)
      prospects.push({
        id: `pros-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        oemId: oem.oemId,
        phone,
        name: cols.name ? String(row[cols.name] || "").trim() : "",
        notes: cols.notes ? String(row[cols.notes] || "").trim() : "",
        email: cols.email ? String(row[cols.email] || "").trim() : "",
        city: cols.city ? String(row[cols.city] || "").trim() : "",
        state: cols.state ? String(row[cols.state] || "").trim() : "",
        status: "NEW",
        sourceFile: file.name,
        createdAt: at,
      })
      added++
    }

    await writeTable("prospects", prospects)

    return ok({
      success: true,
      summary: { totalRows: rows.length, added, skippedDuplicate, skippedInvalid },
      detectedColumns: { phone: cols.phone, name: cols.name || null, notes: cols.notes || null, email: cols.email || null },
    })
  } catch (e) {
    return err(`Import failed: ${e.message}`, 500)
  }
}

// PATCH /api/oem/prospects — { id, status?, notes?, email? } update one prospect
export async function PATCH(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  const body = await req.json()
  if (!body.id) return err("Prospect id required", 400)
  if (body.status && !STATUSES.includes(body.status)) return err("Invalid status", 400)

  const prospects = await readTable("prospects")
  const idx = prospects.findIndex(p => p.id === body.id && p.oemId === oem.oemId)
  if (idx === -1) return err("Prospect not found", 404)

  if (body.status !== undefined) prospects[idx].status = body.status
  if (body.notes !== undefined) prospects[idx].notes = String(body.notes)
  if (body.email !== undefined) prospects[idx].email = String(body.email).trim()
  prospects[idx].updatedAt = new Date().toISOString()

  await writeTable("prospects", prospects)
  return ok({ success: true, prospect: prospects[idx] })
}
