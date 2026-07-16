export const dynamic = "force-dynamic"

import { hashPassword, generateToken, hashToken, buildCookieHeader, ok, err, verifyToken } from "../../../../lib/auth"
import { findUserByEmail, createUser, createSession, logLoginAttempt } from "../../../../lib/db"
import { readTable, writeTable } from "../../../../lib/store"

function getOEM(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const p = verifyToken(token)
    return p?.role === "oem" ? { ...p, oemId: p.dealership } : null
  } catch { return null }
}

// ── POST /api/oem/onboard-dealer ────────────────────────────────────
// This is the "OEM distributes the CRM" flow: unlike self-registration
// (app/api/register), a dealer onboarded here is marked oemDistributed
// from day one — full network access for this OEM immediately, no
// "sponsor" step needed. A temp password is generated and returned once
// so the OEM can hand it to the dealer (never re-shown after this call).
export async function POST(req) {
  try {
    const oem = getOEM(req)
    if (!oem) return err("Unauthorized. OEM access required.", 401)

    const body = await req.json()
    const { businessName, ownerName, email, phone, city, state } = body

    const errors = {}
    if (!businessName?.trim()) errors.businessName = "Dealership business name is required"
    if (!ownerName?.trim())    errors.ownerName    = "Owner name is required"
    if (!email?.trim())        errors.email        = "Email is required"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email.trim())) errors.email = "Enter a valid email"

    if (Object.keys(errors).length) {
      return Response.json({ success: false, errors }, { status: 400 })
    }

    const emailClean = email.toLowerCase().trim()
    const existing = await findUserByEmail(emailClean)
    if (existing) {
      // If this is an independent dealer not yet tied to any OEM network, link them
      // into this OEM's network (still locked/self-registered — Sponsor unlocks access)
      // so the OEM can sponsor instead of onboarding a duplicate account.
      let canSponsor = false
      if (existing.role === "dealer" && (!existing.oemId || existing.oemId === oem.oemId)) {
        if (!existing.oemId) {
          const users = await readTable("users")
          const idx = users.findIndex(u => u.id === existing.id)
          if (idx !== -1) {
            users[idx].oemId = oem.oemId
            await writeTable("users", users)
          }
        }
        canSponsor = true
      }
      return Response.json({
        success: false,
        errors: { email: "This email is already registered" },
        duplicate: {
          role: existing.role,
          dealership: existing.role === "dealer" ? existing.dealership : null,
          businessName: existing.dealershipName || existing.name || null,
          canSponsor,
        },
      }, { status: 409 })
    }

    const nameForSlug = businessName.trim()
    const slug = nameForSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "dealer"
    const dealershipId = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    const tempPassword = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4).toUpperCase() + "9"
    const passwordHash = await hashPassword(tempPassword)

    const newUser = await createUser({
      email: emailClean,
      password_hash: passwordHash,
      role: "dealer",
      name: ownerName.trim(),
      phone: phone?.trim() || null,
      dealership: dealershipId,
      dealershipName: nameForSlug,
      city: city?.trim() || null,
      state: state?.trim() || null,
      is_active: true,
      trialStartDate: new Date().toISOString(),
      billingStatus: "trial",
      oemId: oem.oemId,
      oemDistributed: true, // full access immediately — this dealer came FROM the OEM, not self-registered
    })

    // Log this as a real login attempt so auth_logs/lockout counters stay consistent,
    // but don't auto-login the OEM as the new dealer — the OEM stays in their own session.
    await logLoginAttempt(emailClean, req.headers.get("x-forwarded-for") || "unknown", true)

    return ok({
      dealer: { id: newUser.id, email: emailClean, name: ownerName.trim(), dealership: dealershipId, businessName: nameForSlug },
      tempPassword,
      message: "Dealer onboarded with full network access. Share these credentials — the password is shown only once.",
    })

  } catch (error) {
    console.error("[/api/oem/onboard-dealer]", error.message)
    return err("Failed to onboard dealer. Please try again.", 500)
  }
}
