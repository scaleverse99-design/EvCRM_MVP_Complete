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

// Validate email format
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Validate phone (India: 10 digits; tolerates +91/91/0 prefixes — Excel often
// stores "+919886600171" as the NUMBER 919886600171, so strip digit prefixes too)
function isValidPhone(phone) {
  if (!phone) return false
  const digits = phone.toString().replace(/\D/g, "")
  const ten = digits.length > 10 ? digits.slice(-10) : digits
  const prefix = digits.slice(0, digits.length - 10)
  if (digits.length > 10 && prefix !== "91" && prefix !== "0" && prefix !== "091") return false
  return ten.length === 10 && /^[6-9]\d{9}$/.test(ten)
}

// Normalize phone to 10 digits
function normalizePhone(phone) {
  if (!phone) return ""
  return phone.toString().replace(/\D/g, "").slice(-10)
}

// Parse file (Excel or CSV)
function parseFile(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error("No sheets found in file")

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet)
    return rows
  } catch (e) {
    throw new Error(`Failed to parse file: ${e.message}`)
  }
}

// Column name aliases (case-insensitive)
const COLUMN_ALIASES = {
  name: ["name", "dealer name", "business name", "dealership name"],
  email: ["email", "dealer email", "owner email"],
  phone: ["phone", "contact phone", "dealer phone", "owner phone"],
  city: ["city", "location", "city name"],
  state: ["state", "region", "state name"],
  // Include the camelCase header names too — our own downloadable template uses
  // "businessName"/"ownerName" headers, which the spaced aliases didn't match
  // (verified live: those columns silently imported as empty).
  businessName: ["businessname", "business name", "company name", "dealership name"],
  ownerName: ["ownername", "owner name", "proprietor", "owner", "proprietor name"],
  ownerPhone: ["ownerphone", "owner phone", "proprietor phone", "owner contact"],
}

// Fuzzy fallbacks for real-world contact exports whose headers don't match
// any exact alias (e.g. "Phone Number", "Public Display Name", "Mobile No.")
const FUZZY_HINTS = {
  phone: ["phone", "mobile", "whatsapp", "contact no"],
  name: ["name"],
  email: ["mail"],
  city: ["city", "location"],
  state: ["state", "region"],
}

// Normalize row headers: exact alias match first, then fuzzy contains-match
function normalizeRow(row) {
  const normalized = {}
  const headers = Object.keys(row)
  const used = new Set()

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const headerKey = headers.find(h =>
      !used.has(h) && aliases.some(alias => h.toLowerCase().trim() === alias.toLowerCase())
    )
    if (headerKey) {
      normalized[key] = row[headerKey]
      used.add(headerKey)
    }
  }

  for (const [key, hints] of Object.entries(FUZZY_HINTS)) {
    if (normalized[key] !== undefined) continue
    const headerKey = headers.find(h => {
      if (used.has(h)) return false
      const k = h.toLowerCase().trim()
      return hints.some(hint => k.includes(hint))
    })
    if (headerKey) {
      normalized[key] = row[headerKey]
      used.add(headerKey)
    }
  }

  return normalized
}

// Validate a single row.
// Email OR phone is enough to onboard: with an email we send the verification
// link by mail; with only a phone the OEM sends the link via WhatsApp and the
// dealer types their email (and password) on the verification page themselves.
// City/state are optional at import — the dealer fills them at verification.
function validateRow(row, index, existingEmails, existingPhones) {
  const errors = []

  const email = row.email ? row.email.toString().trim() : ""
  const hasPhone = row.phone && isValidPhone(row.phone)

  if (email) {
    if (!isValidEmail(email)) {
      errors.push("Invalid email format")
    } else if (existingEmails.has(email.toLowerCase())) {
      errors.push("Email already registered in EvCRM")
    }
  } else if (!hasPhone) {
    errors.push(row.phone ? "Invalid phone format (expected 10 digits) and no email" : "Needs an email or a phone number")
  }

  if (hasPhone && existingPhones.has(normalizePhone(row.phone))) {
    errors.push("Phone already registered in EvCRM")
  }

  // Name is NOT required — WhatsApp-style exports have no display name for
  // unsaved contacts. A placeholder is used and the dealer corrects it on the
  // verification page (the name field is editable there).

  return errors
}

// GET /api/oem/bulk-import/template — download sample Excel template
export async function GET(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  // Return a simple CSV template in the response
  const template = `name,email,phone,city,state,businessName,ownerName,ownerPhone
Raj Motors,raj@rajmotors.com,9876543210,Mumbai,Maharashtra,Raj Motors Pvt Ltd,Rajesh Kumar,9876543210
Volt EV,volt@voltev.com,9123456789,Pune,Maharashtra,Volt EV Motors,Vikas Patel,9123456789`

  return new Response(template, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="dealer-template.csv"',
    },
  })
}

// POST /api/oem/bulk-import — Parse & validate file, return preview
export async function POST(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file) return err("No file uploaded", 400)

    // Validate file type — check the extension as well as the MIME, because
    // browsers report an empty type for .xlsx when no spreadsheet app is
    // registered (common on Windows without Office).
    const allowedMimes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.ms-excel"]
    const okExt = /\.(xlsx|xls|csv)$/i.test(file.name || "")
    if (!allowedMimes.includes(file.type) && !okExt) {
      return err("Please upload an Excel (.xlsx) or CSV file", 400)
    }

    // Check file size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return err("File is too large (max 5 MB)", 400)
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const rows = parseFile(buffer)

    if (rows.length === 0) {
      return err("File contains no data rows", 400)
    }

    // Existing emails AND phones to check duplicates (phone-only rows are
    // deduped by phone since they have no email yet)
    const users = await readTable("users")
    const existingEmails = new Set(users.map(u => (u.email || "").toLowerCase()).filter(Boolean))
    const existingPhones = new Set(users.map(u => normalizePhone(u.phone)).filter(p => p.length === 10))

    // Validate each row
    const preview = []
    const errorDetails = []
    let validCount = 0
    let duplicateCount = 0
    let errorCount = 0

    rows.forEach((row, idx) => {
      const normalized = normalizeRow(row)
      const rowNum = idx + 2 // Excel rows start at 2 (row 1 is header)
      const errors = validateRow(normalized, rowNum, existingEmails, existingPhones)

      if (errors.length === 0) {
        validCount++
        const email = normalized.email ? normalized.email.toString().toLowerCase().trim() : ""
        const phone = normalizePhone(normalized.phone)
        // Track within-file duplicates too
        if (email) existingEmails.add(email)
        if (phone.length === 10) existingPhones.add(phone)
        const cleanName = normalized.name ? normalized.name.toString().trim() : ""
        preview.push({
          name: cleanName || (phone ? `Dealer ${phone}` : email.split("@")[0]),
          email,
          phone,
          city: normalized.city ? normalized.city.toString().trim() : "",
          state: normalized.state ? normalized.state.toString().trim() : "",
          businessName: normalized.businessName ? normalized.businessName.toString().trim() : "",
          ownerName: normalized.ownerName ? normalized.ownerName.toString().trim() : "",
          status: "ok",
        })
      } else {
        if (errors.some(e => e.includes("already registered"))) {
          duplicateCount++
        } else {
          errorCount++
          errorDetails.push({
            row: rowNum,
            email: normalized.email || "(no email)",
            name: normalized.name || "(no name)",
            errors: errors.join("; "),
          })
        }
      }
    })

    // Generate import ID
    const importId = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    // Store import metadata in a temporary location (session or DB)
    // For now, we'll store in a temporary store that gets cleared after confirm
    const bulkImports = await readTable("bulk_imports").catch(() => [])
    bulkImports.push({
      id: importId,
      oemId: oem.oemId,
      fileName: file.name,
      totalRows: rows.length,
      validRows: validCount,
      duplicates: duplicateCount,
      errorRows: errorCount,
      // The FULL validated list — the confirm step iterates this. (Was capped
      // at 100, which silently dropped everything past the first 100 accounts.)
      preview,
      status: "preview_ready",
      createdAt: new Date().toISOString(),
    })
    await writeTable("bulk_imports", bulkImports).catch(() => {})

    return ok({
      success: true,
      importId,
      summary: {
        totalRows: rows.length,
        validRows: validCount,
        duplicates: duplicateCount,
        errors: errorCount,
      },
      preview: preview.slice(0, 20), // Return first 20 for UI
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
      fullErrorCount: errorDetails.length,
    })
  } catch (e) {
    return err(`Failed to process file: ${e.message}`, 400)
  }
}
