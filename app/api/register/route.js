export const dynamic = "force-dynamic"

import { hashPassword, generateToken, hashToken, buildCookieHeader, ok, err } from "../../../lib/auth"
import { createSession, logLoginAttempt } from "../../../lib/db"
import { sendWelcomeEmail } from "../../../lib/email"
import supabaseAdmin from "../../../lib/db"

// ── POST /api/register ────────────────────────────────────────────
// Self-registration for dealers and sales reps
// Body: { name, email, password, role, phone, dealership, city }
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, email, password, role, phone, dealership, city } = body

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

    // ── Insert user ───────────────────────────────────────────────
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("evcrm_users")
      .insert({
        email:         emailClean,
        password_hash: passwordHash,
        role,
        name:          name.trim(),
        phone:         phone?.trim() || null,
        dealership:    dealership?.trim() || null,
        city:          city?.trim() || null,
        is_active:     role === "rep" ? true : false, // dealers need admin approval
      })
      .select()
      .single()

    if (insertError) throw insertError

    // ── Send welcome email ────────────────────────────────────────
    try {
      await sendWelcomeEmail({
        to:           emailClean,
        name:         name.trim(),
        role,
        tempPassword: password,
      })
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message)
      // Don't fail registration if email fails
    }

    // ── Auto-login for reps, pending approval for dealers ─────────
    if (role === "rep") {
      const token     = generateToken({ userId:newUser.id, email:emailClean, role, dealership })
      const tokenHash = hashToken(token)
      const ipAddress = req.headers.get("x-forwarded-for") || "unknown"
      const userAgent = req.headers.get("user-agent") || "unknown"
      await createSession(newUser.id, tokenHash, ipAddress, userAgent)
      await logLoginAttempt(emailClean, ipAddress, true)

      const response = ok({ user:{ id:newUser.id, email:emailClean, role, name:name.trim() }, autoLoggedIn:true })
      response.headers.set("Set-Cookie", buildCookieHeader(token))
      return response
    }

    // Dealers need admin approval
    return ok({
      user:         { id:newUser.id, email:emailClean, role, name:name.trim() },
      autoLoggedIn: false,
      message:      "Registration successful! Your account is pending approval. You'll receive an email once approved.",
    })

  } catch (error) {
    console.error("[/api/register]", error.message)
    return err("Registration failed. Please try again.", 500)
  }
}
