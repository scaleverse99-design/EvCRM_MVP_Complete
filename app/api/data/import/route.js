import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

// POST /api/data/import — bulk lead import (CSV/Excel via ImportModal.js).
//
// This is the actual mechanism for "attach EvCRM to leads from CarDekho,
// CarWale, etc." — those platforms don't offer API access to a competing
// CRM (no marketplace does, for anyone), but every dealer panel on those
// sites lets a dealer export THEIR OWN leads as CSV/Excel. This endpoint
// is what turns that export into real leads inside EvCRM.
//
// The frontend (ImportModal.js) already called this route — it just
// didn't exist. Matches the exact lead schema /api/dealer/leads/route.js
// POST uses, so imported leads behave identically to any other lead
// (assignable, status-trackable, follow-up-able).
export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { dealership, records } = body

  if (!dealership) return NextResponse.json({ error: "dealership is required" }, { status: 400 })
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "No records to import" }, { status: 400 })
  }

  const leads = await readTable("leads")
  const existingPhones = new Set(
    leads.filter(l => l.dealership === dealership).map(l => l.phone).filter(Boolean)
  )

  const imported = []
  let skippedDuplicate = 0
  let skippedNoPhone = 0

  for (const r of records) {
    const phone = String(r.phone || "").replace(/\D/g, "").slice(-10)
    const name = String(r.name || "").trim()

    if (!phone) { skippedNoPhone++; continue }
    if (existingPhones.has(phone)) { skippedDuplicate++; continue }

    const newLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dealership,
      name: name || "Unknown",
      phone,
      email: "",
      city: "",
      vehicle: String(r.vehicle || "").trim(),
      status: "NEW",
      source: r.source || "bulk_import",
      source_context: "csv_import",
      amount: 0,
      notes: [],
      next_followup: null,
      created_at: new Date().toISOString(),
    }

    imported.push(newLead)
    existingPhones.add(phone) // guard against duplicate rows within the same file
  }

  if (imported.length) {
    await writeTable("leads", [...leads, ...imported])
  }

  return NextResponse.json({
    success: true,
    importedCount: imported.length,
    skippedDuplicate,
    skippedNoPhone,
    totalRows: records.length,
  })
}
