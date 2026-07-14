export const dynamic = "force-dynamic"

import { hashPassword, generateToken, hashToken, buildCookieHeader, ok, err } from "../../../../lib/auth"
import { findUserByEmail, createUser, createSession, logLoginAttempt } from "../../../../lib/db"

// ── POST /api/oem/register ────────────────────────────────────────
// Self-registration for OEM manufacturers (Ather, Mahindra, etc.).
// Body: { name, email, password, phone, oemName }
// Creates a brand-new, isolated OEM network: oemId is derived from the
// manufacturer name, mirroring how /api/register derives a dealership id
// for self-registered dealers. Each OEM only ever sees dealers who either
// (a) were distributed that OEM's id at onboarding, or (b) it has sponsored
// — see oemCanAccess() in app/api/oem/route.js.
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, email, password, phone, oemName } = body

    const errors = {}
    if (!name?.trim())     errors.name    = "Full name is required"
    if (!oemName?.trim())  errors.oemName = "Manufacturer name is required"
    if (!email?.trim())    errors.email   = "Email is required"
    if (!password)         errors.password = "Password is required"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRegex.test(email.trim())) errors.email = "Enter a valid email"
    if (password && password.length < 8)         errors.password = "Minimum 8 characters"
    if (password && !/[A-Z]/.test(password))     errors.password = "Must include an uppercase letter"
    if (password && !/\d/.test(password))        errors.password = "Must include a number"

    if (Object.keys(errors).length) {
      return Response.json({ success: false, errors }, { status: 400 })
    }

    const emailClean = email.toLowerCase().trim()
    if (await findUserByEmail(emailClean)) {
      return Response.json({ success: false, errors: { email: "This email is already registered" } }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    // Derive a stable, unique OEM network id from the manufacturer name —
    // this becomes the `oemId` every dealer in this OEM's network shares,
    // and the `dealership` field on the OEM's own login (kept consistent
    // with how the JWT/session code reads OEM identity elsewhere).
    const nameForSlug = oemName.trim()
    const slug = nameForSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "oem"
    const oemId = `oem-${slug}-${Math.random().toString(36).slice(2, 6)}`

    const newUser = await createUser({
      email: emailClean,
      password_hash: passwordHash,
      role: "oem",
      name: name.trim(),
      phone: phone?.trim() || null,
      dealership: oemId, // OEM identity is carried in `dealership`, same field dealer/rep logins use
      oemId,
      oemName: nameForSlug,
      is_active: true,
      billingStatus: "trial",
    })

    const token = generateToken({ userId: newUser.id, email: emailClean, role: "oem", dealership: oemId })
    const tokenHash = hashToken(token)
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown"
    const userAgent = req.headers.get("user-agent") || "unknown"
    await createSession(newUser.id, tokenHash, ipAddress, userAgent)
    await logLoginAttempt(emailClean, ipAddress, true)

    const response = ok({
      user: { id: newUser.id, email: emailClean, role: "oem", name: name.trim(), dealership: oemId, oemId },
      token,
      autoLoggedIn: true,
    })
    response.headers.set("Set-Cookie", buildCookieHeader(token))
    return response

  } catch (error) {
    console.error("[/api/oem/register]", error.message)
    return err("Registration failed. Please try again.", 500)
  }
}
