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
// Body: { email, password }
// Returns: { success, user } + sets HttpOnly cookie
export async function POST(req) {
  try {
    const body = await req.json()
    const { email, password } = body

    // ── 1. Basic input validation ─────────────────────────────────
    if (!email || !password) {
      return err("Email and password are required", 400)
    }

    const emailClean = email.toLowerCase().trim()
    const ipAddress  = req.headers.get("x-forwarded-for") ||
                       req.headers.get("x-real-ip") ||
                       "unknown"

    // ── 2. Rate limit check ───────────────────────────────────────
    // Block after 5 failed attempts from same email or 10 from same IP
    const { emailCount, ipCount } = await countRecentFailedAttempts(emailClean, ipAddress)

    if (emailCount >= 5) {
      return err("Too many failed attempts for this email. Try again in 15 minutes.", 429)
    }
    if (ipCount >= 10) {
      return err("Too many login attempts from your location. Try again in 15 minutes.", 429)
    }

    // ── 3. Find user ──────────────────────────────────────────────
    const user = await findUserByEmail(emailClean)

    if (!user) {
      // Log failed attempt but give vague error (security best practice)
      await logLoginAttempt(emailClean, ipAddress, false)
      return err("Invalid email or password", 401)
    }

    // ── 4. Check account is active ────────────────────────────────
    if (!user.is_active) {
      await logLoginAttempt(emailClean, ipAddress, false)
      return err("This account has been disabled. Contact your dealer admin.", 403)
    }

    // ── 5. Verify password using bcrypt ───────────────────────────
    const passwordMatch = await verifyPassword(password, user.password_hash)

    if (!passwordMatch) {
      await logLoginAttempt(emailClean, ipAddress, false)

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
      repId:      user.repId,   // present only for sales-rep accounts
    })

    const tokenHash = hashToken(token)

    // ── 7. Store session in DB ────────────────────────────────────
    const userAgent = req.headers.get("user-agent") || "unknown"
    await createSession(user.id, tokenHash, ipAddress, userAgent)

    // ── 8. Update last login ──────────────────────────────────────
    await updateLastLogin(user.id)
    await logLoginAttempt(emailClean, ipAddress, true)

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
    console.error("[/api/auth/login] Error:", error.message)
    return err("An unexpected error occurred. Please try again.", 500)
  }
}
