export const dynamic = "force-dynamic"

import { hashPassword, generateToken, hashToken, buildCookieHeader, ok, err } from "../../../lib/auth"
import { createSession, logLoginAttempt } from "../../../lib/db"
import { sendWelcomeEmail } from "../../../lib/email"
import supabaseAdmin from "../../../lib/db"
import { RESERVED_SLUGS } from "../../../lib/reservedSlugs"
import { readTable, writeTable } from "../../../lib/store"

// ── POST /api/register ────────────────────────────────────────────
// Self-registration for dealers and sales reps
// Body: { name, email, password, role, phone, dealership, city }
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, email, password, role, phone, dealership, city } = body
    const dealerCategory = ["EV", "ICE"].includes(body.dealerCategory) ? body.dealerCategory : "EV"

    // ── Validation ────────────────────────────────────────────────
    const errors = {}
    if (!name?.trim())        errors.name       = "Full name is required"
    if (!email?.trim())       errors.email      = "Email is required"
    if (!password)            errors.password   = "Password is required"
    if (!role)                errors.role       = "Role is required"
    if (role === "dealer" && !dealership?.trim()) errors.dealership = "Dealership name is required"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email.trim())) errors.email = "Enter a valid email"

    if (password && password.length < 8)          errors.password = "Minimum 8 characters"
    if (password && !/[A-Z]/.test(password))      errors.password = "Must include an uppercase letter"
    if (password && !/\d/.test(password))         errors.password = "Must include a number"

    if (!["dealer","rep"].includes(role))         errors.role = "Invalid role"

    if (Object.keys(errors).length) {
      return Response.json({ success:false, errors }, { status:400 })
    }

    const emailClean = email.toLowerCase().trim()

    // ── Check email not already registered ────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("evcrm_users")
      .select("id")
      .eq("email", emailClean)
      .single()

    if (existing) {
      return Response.json({ success:false, errors:{ email:"This email is already registered" } }, { status:409 })
    }

    // ── Hash password ─────────────────────────────────────────────
    const passwordHash = await hashPassword(password)

    // Generate a stable, unique dealership id from the business/dealership
    // name so every dealer's data is scoped to their own key. (The signup
    // form doesn't send a dealership id, only a name — derive one here.)
    const nameForSlug = (dealership || name || "dealer").trim()
    const slug = nameForSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "dealer"
    const dealershipId = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    // Generate unique subdomain for dealer (e.g., "ramdealers" from "Ram Dealers")
    // Read all users to check subdomain uniqueness (store.js handles pagination)
    let dealerSubdomain = slug
    let subdomain = dealerSubdomain
    let counter = 1

    try {
      const { data: allUsers } = await supabaseAdmin
        .from("evcrm_users")
        .select("data")

      const existingSubdomains = allUsers?.map(u => u.data?.dealerSubdomain?.toLowerCase()) || []

      while (existingSubdomains.includes(subdomain.toLowerCase()) || RESERVED_SLUGS.has(subdomain.toLowerCase())) {
        subdomain = `${dealerSubdomain}${counter}`
        counter++
      }
    } catch (e) {
      // If subdomain check fails, continue with generated slug
      console.warn("Subdomain uniqueness check failed, using generated slug", e.message)
    }

    dealerSubdomain = subdomain

    // ── Insert user ───────────────────────────────────────────────
    // Self-serve trial: dealers are activated immediately (the 30-day trial
    // + billing system gates them later). No manual approval step.
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("evcrm_users")
      .insert({
        email:         emailClean,
        password_hash: passwordHash,
        role,
        name:          name.trim(),
        phone:         phone?.trim() || null,
        dealership:    role === "dealer" ? dealershipId : (dealership?.trim() || null),
        dealershipName: role === "dealer" ? nameForSlug : null,
        dealerCategory: role === "dealer" ? dealerCategory : null,
        dealerSubdomain: role === "dealer" ? dealerSubdomain : null,
        city:          city?.trim() || null,
        is_active:     true,
        trialStartDate: new Date().toISOString(),
        billingStatus:  "trial",
      })
      .select()
      .single()

    if (insertError) throw insertError

    // ── Create matching `dealers` table row ─────────────────────────
    // Everything keyed by dealership id (Settings, storefronts, etc.)
    // reads from this separate table, not from `users` — without this row
    // a dealer's own Settings tab 404s forever. Best-effort: registration
    // must still succeed even if this write fails (mirrors the welcome
    // email's try/catch below); GET /api/dealer/settings self-heals a
    // missing row anyway, so this isn't a hard dependency.
    if (role === "dealer") {
      try {
        const dealers = await readTable("dealers")
        dealers.push({
          id: dealershipId,
          name: nameForSlug,
          address: "",
          state: "",
          district: city?.trim() || "",
          whatsapp: phone?.trim() || "",
          gstNumber: "",
          createdAt: new Date().toISOString(),
        })
        await writeTable("dealers", dealers)
      } catch (dealerRowErr) {
        console.error("Failed to create dealers row:", dealerRowErr.message)
      }
    }

    // ── Send welcome email ────────────────────────────────────────
    try {
      await sendWelcomeEmail({
        to:           emailClean,
        name:         name.trim(),
        role,
        tempPassword: password,
        dealerCategory: newUser.dealerCategory,
      })
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message)
      // Don't fail registration if email fails
    }

    // ── Auto-login (both dealers and reps) ────────────────────────
    // Return the token in the BODY too — Firebase Hosting strips Set-Cookie
    // from function responses, so the client saves it to localStorage.
    const token     = generateToken({ userId:newUser.id, email:emailClean, role, dealership:newUser.dealership })
    const tokenHash = hashToken(token)
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown"
    const userAgent = req.headers.get("user-agent") || "unknown"
    await createSession(newUser.id, tokenHash, ipAddress, userAgent)
    await logLoginAttempt(emailClean, ipAddress, true)

    const response = ok({
      user: { id:newUser.id, email:emailClean, role, name:name.trim(), dealership:newUser.dealership },
      token,
      autoLoggedIn: true,
    })
    response.headers.set("Set-Cookie", buildCookieHeader(token))
    return response

  } catch (error) {
    console.error("[/api/register]", error.message)
    return err("Registration failed. Please try again.", 500)
  }
}
