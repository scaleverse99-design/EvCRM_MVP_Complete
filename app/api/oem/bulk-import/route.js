export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import XLSX from "xlsx"

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

// Validate phone (India: 10 digits, may have +91 prefix)
function isValidPhone(phone) {
  if (!phone) return false
  const cleaned = phone.toString().replace(/^\+91/, "").replace(/\D/g, "")
  return cleaned.length === 10 && /^\d{10}$/.test(cleaned)
}

// Normalize phone to 10 digits
function normalizePhone(phone) {
  if (!phone) return ""
  return phone.toString().replace(/^\+91/, "").replace(/\D/g, "").slice(-10)
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
  businessName: ["business name", "company name", "dealership name"],
  ownerName: ["owner name", "proprietor", "owner", "proprietor name"],
  ownerPhone: ["owner phone", "proprietor phone", "owner contact"],
}

// Normalize row headers (find aliased column names)
function normalizeRow(row) {
  const normalized = {}
  const headers = Object.keys(row)

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const headerKey = headers.find(h =>
      aliases.some(alias => h.toLowerCase() === alias.toLowerCase())
    )
    if (headerKey) {
      normalized[key] = row[headerKey]
    }
  }

  return normalized
}

// Validate a single row
function validateRow(row, index, existingEmails) {
  const errors = []

  if (!row.email || !row.email.toString().trim()) {
    errors.push("Missing email")
  } else if (!isValidEmail(row.email.toString().trim())) {
    errors.push("Invalid email format")
  } else if (existingEmails.has(row.email.toString().toLowerCase().trim())) {
    errors.push("Email already registered in EvCRM")
  }

  if (!row.name || !row.name.toString().trim()) {
    errors.push("Missing dealer/business name")
  }

  if (!row.city || !row.city.toString().trim()) {
    errors.push("Missing city")
  }

  if (!row.state || !row.state.toString().trim()) {
    errors.push("Missing state")
  }

  if (row.phone && !isValidPhone(row.phone)) {
    errors.push("Invalid phone format (expected 10 digits)")
  }

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

    // Validate file type
    const allowedMimes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.ms-excel"]
    if (!allowedMimes.includes(file.type) && !file.name.endsWith(".csv")) {
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

    // Get existing emails to check duplicates
    const users = await readTable("users")
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()))

    // Validate each row
    const preview = []
    const errorDetails = []
    let validCount = 0
    let duplicateCount = 0
    let errorCount = 0

    rows.forEach((row, idx) => {
      const normalized = normalizeRow(row)
      const rowNum = idx + 2 // Excel rows start at 2 (row 1 is header)
      const errors = validateRow(normalized, rowNum, existingEmails)

      if (errors.length === 0) {
        validCount++
        preview.push({
          name: normalized.name.toString().trim(),
          email: normalized.email.toString().toLowerCase().trim(),
          phone: normalizePhone(normalized.phone),
          city: normalized.city.toString().trim(),
          state: normalized.state.toString().trim(),
          businessName: normalized.businessName ? normalized.businessName.toString().trim() : "",
          ownerName: normalized.ownerName ? normalized.ownerName.toString().trim() : "",
          status: "ok",
        })
      } else {
        if (errors.includes("Email already registered in EvCRM")) {
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
      fileContent: buffer.toString("base64"),
      totalRows: rows.length,
      validRows: validCount,
      duplicates: duplicateCount,
      errorRows: errorCount,
      preview: preview.slice(0, 100), // Store first 100 for preview
      fullData: rows, // Store original rows for confirm step
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
