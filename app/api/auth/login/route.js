export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import {
  hashPassword, verifyPassword, generateToken,
  hashToken, buildCookieHeader, ok, err
} from "../../../../lib/auth"
import {
  findUserByEmail, updateLastLogin, createSession,
  logLoginAttempt, countRecentFailedAttempts
} from "../../../../lib/db"

// ── POST /api/auth/login ──────────────────────────────────────────
// Body: { email, password, role? }
// Returns: { success, user } + sets HttpOnly cookie
export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password, role: selectedRole } = body

    // ── 1. Basic input validation ─────────────────────────────────
    if (!email || !password) {
      return err("Email and password are required", 400)
    }

    const emailClean = email.toLowerCase().trim()
    const ipAddress  = req.headers.get("x-forwarded-for") ||
                       req.headers.get("x-real-ip") ||
                       "unknown"

    // ── 2. Rate limit check (guarded against store/db issues) ─────
    let emailCount = 0
    let ipCount = 0
    try {
      const counts = await countRecentFailedAttempts(emailClean, ipAddress)
      emailCount = counts.emailCount || 0
      ipCount = counts.ipCount || 0
    } catch (e) {
      console.warn("[/api/auth/login] rate limit check fallback:", e.message)
    }

    if (emailCount >= 5) {
      return err("Too many failed attempts for this email. Try again in 15 minutes.", 429)
    }
    if (ipCount >= 10) {
      return err("Too many login attempts from your location. Try again in 15 minutes.", 429)
    }

    // ── 3. Find user ──────────────────────────────────────────────
    let user = null
    try {
      user = await findUserByEmail(emailClean)
    } catch (dbErr) {
      console.error("[/api/auth/login] findUserByEmail error:", dbErr.message)
    }

    if (!user) {
      try { await logLoginAttempt(emailClean, ipAddress, false) } catch {}
      return err("Invalid email or password", 401)
    }

    // ── 3b. Validate role matches selected portal ─────────────────
    // Note: 'dealer' role covers both EV dealer and Used Car Dealer tiles.
    // 'founder' and 'superadmin' are the same portal under two different
    // role strings (same equivalence already used by the /admin route guard
    // and /api/admin/founder-overview) — the Founder tile always sends
    // selectedRole:"superadmin", so an account stored as role:"founder"
    // must match it too, or every founder account gets rejected here.
    const isFounderPortalMatch = (selectedRole === "superadmin" || selectedRole === "founder")
      && (user.role === "superadmin" || user.role === "founder")
    if (selectedRole && user.role !== selectedRole && !(selectedRole === "dealer" && user.role === "dealer") && !isFounderPortalMatch) {
      const actualPortal = user.role === "oem" ? "OEM Partner" : user.role === "rep" ? "Sales Rep" : (user.role === "superadmin" || user.role === "founder") ? "Founder" : "Dealer"
      try { await logLoginAttempt(emailClean, ipAddress, false) } catch {}
      return err(`Wrong portal selected. This account is a ${actualPortal} account — please select the '${actualPortal}' tab to sign in.`, 403)
    }

    // ── 4. Check account is active ────────────────────────────────
    if (!user.is_active) {
      try { await logLoginAttempt(emailClean, ipAddress, false) } catch {}
      return err("This account has been disabled. Contact your dealer admin.", 403)
    }

    // ── 5. Verify password using bcrypt ───────────────────────────
    const passwordMatch = await verifyPassword(password, user.password_hash)

    if (!passwordMatch) {
      try { await logLoginAttempt(emailClean, ipAddress, false) } catch {}

      const remaining = 5 - (emailCount + 1)
      const hint = remaining > 0
        ? ` ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`
        : " Account is now locked for 15 minutes."

      return err(`Invalid email or password.${hint}`, 401)
    }

    // ── 6. Generate JWT ───────────────────────────────────────────
    const token = generateToken({
      userId:     user.id,
      email:      user.email,
      role:       user.role,
      dealership: user.dealership,
      ...(user.repId ? { repId: user.repId } : {}),
    })

    const tokenHash = hashToken(token)

    // ── 7. Store session in DB ────────────────────────────────────
    const userAgent = req.headers.get("user-agent") || "unknown"
    try {
      await createSession(user.id, tokenHash, ipAddress, userAgent)
    } catch (sessErr) {
      console.warn("[/api/auth/login] session log fallback:", sessErr.message)
    }

    // ── 8. Update last login ──────────────────────────────────────
    try {
      await updateLastLogin(user.id)
      await logLoginAttempt(emailClean, ipAddress, true)
    } catch (logErr) {
      console.warn("[/api/auth/login] login log fallback:", logErr.message)
    }

    // ── 9. Set secure HttpOnly cookie ────────────────────────────
    const response = ok({
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        name:       user.name,
        dealership: user.dealership,
        ...(user.repId ? { repId: user.repId } : {}),
      }
    })

    response.headers.set("Set-Cookie", buildCookieHeader(token))
    return response

  } catch (error) {
    console.error("[/api/auth/login] Critical Error:", error.message)
    return err("An unexpected error occurred. Please try again.", 500)
  }
}
