export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../../lib/auth"
import { readTable, writeTable } from "../../../../../lib/store"
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

function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "").slice(-10)
}

// POST /api/oem/bulk-import/confirm — Create accounts ONLY. No emails are
// sent here (sending 2K emails inside one request blew past Cloud Run's
// timeout → HTTP 502). The OEM sends onboarding emails afterwards from
// My Network → Pending Verification (checkbox selection, batched), or uses
// the per-dealer WhatsApp/copy-link actions.
export async function POST(req) {
  const oem = getOEM(req)
  if (!oem) return err("Unauthorized", 401)

  try {
    const body = await req.json()
    const { importId } = body
    if (!importId) return err("Import ID required", 400)

    const bulkImports = await readTable("bulk_imports").catch(() => [])
    const importData = bulkImports.find(i => i.id === importId && i.oemId === oem.oemId)
    if (!importData) return err("Import not found or expired", 404)
    if (importData.status !== "preview_ready") return err("Import already processed or invalid", 400)

    const users = await readTable("users")
    const existingEmails = new Set(users.map(u => (u.email || "").toLowerCase()).filter(Boolean))
    const existingPhones = new Set(users.map(u => normalizePhone(u.phone)).filter(p => p.length === 10))

    const oemUser = users.find(u => u.role === "oem" && u.dealership === oem.oemId)
    const oemName = oemUser?.dealershipName || oemUser?.name || "EvCRM"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"

    const failed = []
    const accountsCreated = []
    let createdCount = 0

    // One bcrypt hash of a discarded random secret, shared by every pending
    // account. Nobody knows this password, so the accounts simply can't log in
    // until the dealer sets their own at verification. Hashing per-account
    // (2K+ × ~70ms) blew past Cloud Run's request timeout.
    const lockedHash = await bcryptjs.hash(`locked-${Date.now()}-${Math.random().toString(36)}`, 10)

    for (const row of importData.preview) {
      const email = (row.email || "").toLowerCase()
      const phone = normalizePhone(row.phone)

      if (email && existingEmails.has(email)) {
        failed.push({ email, name: row.name, error: "Email already registered" })
        continue
      }
      if (!email && phone && existingPhones.has(phone)) {
        failed.push({ email: `📞 ${phone}`, name: row.name, error: "Phone already registered" })
        continue
      }

      try {
        const dealership = `${oem.oemId}-d${Date.now().toString(36)}${createdCount}`

        // 7 days: phone-flow links are forwarded manually over WhatsApp by the
        // OEM's team, which takes longer than automated email delivery.
        const verificationToken = jwt.sign(
          { email, dealership, oemId: oem.oemId, type: "dealer_verification" },
          process.env.JWT_SECRET || "dev-secret",
          { expiresIn: "7d" }
        )
        const expiryTime = new Date()
        expiryTime.setDate(expiryTime.getDate() + 7)

        const newUser = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          role: "dealer",
          email,
          // login reads password_hash — NOT "password" (that field is ignored)
          password_hash: lockedHash,
          name: row.name,
          dealership,
          dealershipName: row.businessName || row.name,
          phone,
          city: row.city || "",
          state: row.state || "",
          ownerName: row.ownerName || "",
          oemId: oem.oemId,
          oemDistributed: true,
          oemSponsored: false,
          is_active: true, // login rejects any account without this flag
          status: "pending_verification",
          verificationToken,
          verificationTokenExpiry: expiryTime.toISOString(),
          billingStatus: "trial",
          trialStartDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
        users.push(newUser)

        const verifyUrl = `${appUrl}/dealer/verify-profile?token=${verificationToken}`
        let waUrl = null

        if (phone) {
          const waText = `Hi ${row.name}! ${oemName} has set up your EvCRM dealer account. Please verify your details and set your password here (link valid 7 days): ${verifyUrl}`
          waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`
        }

        accountsCreated.push({
          name: row.name,
          email: email || null,
          phone: phone || null,
          dealership,
          verifyUrl,
          waUrl,
        })

        createdCount++
        if (email) existingEmails.add(email)
        if (phone) existingPhones.add(phone)
      } catch (e) {
        failed.push({ email: email || phone, name: row.name, error: e.message })
      }
    }

    // One write at the end — 2K+ row-by-row writes of the whole users table
    // would be brutal with the current whole-table store
    await writeTable("users", users)

    const updatedBulkImports = bulkImports.map(i =>
      i.id === importId ? { ...i, preview: [], status: "completed", completedAt: new Date().toISOString(), created: createdCount, failed: failed.length } : i
    )
    await writeTable("bulk_imports", updatedBulkImports).catch(() => {})

    return ok({
      success: true,
      importId,
      summary: {
        requested: importData.preview.length,
        created: createdCount,
        failed: failed.length,
        withEmail: accountsCreated.filter(a => a.email).length,
        phoneOnly: accountsCreated.filter(a => !a.email).length,
      },
      accounts: accountsCreated,
      failedAccounts: failed.slice(0, 10),
      message: `Created ${createdCount} dealer accounts. No emails were sent yet — go to My Network → Pending Verification, select dealers and click "Send Onboard Email" (or use the WhatsApp buttons / CSV).`,
    })
  } catch (e) {
    return err(`Failed to confirm import: ${e.message}`, 500)
  }
}
