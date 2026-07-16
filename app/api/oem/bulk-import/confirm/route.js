export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import { sendBulkImportVerificationEmail } from "../../../../lib/email"
import jwt from "jsonwebtoken"
import bcryptjs from "bcryptjs"

function getOEM(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const p = verifyToken(token)
    return p?.role === "oem" ? { ...p, oemId: p.dealership } : null
  } catch { return null }
}

// Generate a random 10-char alphanumeric string
function generateTempPassword() {
  return Math.random().toString(36).slice(2, 12)
}

// Generate a unique dealership slug
function generateDealershipId(oemId, businessName, index) {
  const baseSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 20)
  return `${oemId}-d${index}`
}

// POST /api/oem/bulk-import/confirm — Create accounts & send emails
export async function POST(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  try {
    const body = await req.json()
    const { importId } = body

    if (!importId) return err("Import ID required", 400)

    // Retrieve stored import data
    const bulkImports = await readTable("bulk_imports").catch(() => [])
    const importData = bulkImports.find(i => i.id === importId && i.oemId === oem.oemId)

    if (!importData) return err("Import not found or expired", 404)
    if (importData.status !== "preview_ready") return err("Import already processed or invalid", 400)

    // Re-validate data (in case DB changed since preview)
    const users = await readTable("users")
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()))

    // Get OEM details for email
    const oemUser = users.find(u => u.role === "oem" && u.dealership === oem.oemId)
    const oemName = oemUser?.dealershipName || oemUser?.name || "EvCRM"

    // Process valid rows and create accounts
    const created = []
    const failed = []
    const accountsCreated = []

    let createdCount = 0
    for (let idx = 0; idx < importData.preview.length; idx++) {
      const row = importData.preview[idx]

      // Skip if email already registered (double-check)
      if (existingEmails.has(row.email.toLowerCase())) {
        failed.push({
          email: row.email,
          name: row.name,
          error: "Email already registered",
        })
        continue
      }

      try {
        // Generate unique dealership ID
        const dealership = generateDealershipId(oem.oemId, row.businessName || row.name, createdCount + 1)

        // Generate temp password
        const tempPassword = generateTempPassword()
        const hashedPassword = await bcryptjs.hash(tempPassword, 10)

        // Generate verification token (expires in 24 hours)
        const verificationToken = jwt.sign(
          {
            email: row.email,
            dealership,
            oemId: oem.oemId,
            type: "dealer_verification",
          },
          process.env.JWT_SECRET || "dev-secret",
          { expiresIn: "24h" }
        )

        const expiryTime = new Date()
        expiryTime.setHours(expiryTime.getHours() + 24)

        // Create user record
        const newUser = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          role: "dealer",
          email: row.email.toLowerCase(),
          password: hashedPassword,
          name: row.name,
          dealership,
          dealershipName: row.businessName || row.name,
          phone: row.phone,
          city: row.city,
          state: row.state,
          oemId: oem.oemId,
          oemDistributed: true,
          oemSponsored: false,
          status: "pending_verification",
          verificationToken,
          verificationTokenExpiry: expiryTime.toISOString(),
          billingStatus: "trial",
          trialStartDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        // Add to users table
        const updatedUsers = [...users, newUser]
        await writeTable("users", updatedUsers)

        // Send verification email
        try {
          await sendBulkImportVerificationEmail({
            email: row.email,
            dealerName: row.name,
            businessName: row.businessName || row.name,
            ownerName: row.ownerName || "",
            phone: row.phone,
            city: row.city,
            state: row.state,
            verificationToken,
            oemName,
          })
        } catch (emailErr) {
          console.error(`Email send failed for ${row.email}:`, emailErr.message)
          // Continue anyway - email failure shouldn't block account creation
        }

        created.push({
          email: row.email,
          name: row.name,
          dealership,
        })

        accountsCreated.push({
          email: row.email,
          dealership,
          tempPassword, // Return for OEM's records (they should save this somewhere)
          verificationTokenExpiry: expiryTime.toISOString(),
        })

        createdCount++
        existingEmails.add(row.email.toLowerCase())
      } catch (e) {
        failed.push({
          email: row.email,
          name: row.name,
          error: e.message,
        })
      }
    }

    // Update import status
    const updatedBulkImports = bulkImports.map(i =>
      i.id === importId ? { ...i, status: "completed", completedAt: new Date().toISOString(), created: createdCount, failed: failed.length } : i
    )
    await writeTable("bulk_imports", updatedBulkImports).catch(() => {})

    return ok({
      success: true,
      importId,
      summary: {
        requested: importData.preview.length,
        created: createdCount,
        failed: failed.length,
      },
      accounts: accountsCreated.slice(0, 50), // Return first 50 for display
      failedAccounts: failed.slice(0, 10),
      message: `Successfully created ${createdCount} dealer accounts. Verification emails have been sent.`,
    })
  } catch (e) {
    return err(`Failed to confirm import: ${e.message}`, 500)
  }
}
