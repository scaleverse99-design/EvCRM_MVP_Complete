export const dynamic = "force-dynamic"

import { generateOTP, hashOTP, err, ok } from "../../../../lib/auth"
import { findUserByEmail, createOTP, countRecentFailedAttempts } from "../../../../lib/db"
import { sendOTPEmail } from "../../../../lib/email"

// ── POST /api/auth/request-otp ────────────────────────────────────
// Body: { email }
// Sends a 6-digit OTP to the registered email for password reset
export async function POST(req) {
  try {
    const { email } = await req.json()

    if (!email) return err("Email is required", 400)

    const emailClean = email.toLowerCase().trim()
    const ipAddress  = req.headers.get("x-forwarded-for") || "unknown"

    // ── Rate limit: max 3 OTP requests per email per 15 min ───────
    const { emailCount } = await countRecentFailedAttempts(emailClean, ipAddress)
    if (emailCount >= 10) {
      return err("Too many requests. Please wait 15 minutes.", 429)
    }

    // ── Find user — give same response whether found or not ───────
    // This prevents email enumeration attacks
    const user = await findUserByEmail(emailClean)

    if (!user) {
      // Still return 200 — attacker cannot learn if email exists
      return ok({
        message: "If this email is registered, an OTP has been sent."
      })
    }

    // ── Generate secure 6-digit OTP ───────────────────────────────
    const otp     = generateOTP()
    const otpHash = await hashOTP(otp)

    // ── Store hashed OTP in DB (valid for 15 minutes) ─────────────
    await createOTP(emailClean, otpHash, "password_reset")

    // ── Send styled HTML email ────────────────────────────────────
    await sendOTPEmail({
      to:             user.email,
      name:           user.name,
      otp,
      expiryMinutes:  15,
    })

    console.log(`[OTP] Sent to ${emailClean}`)

    return ok({
      message: "If this email is registered, an OTP has been sent."
    })

  } catch (error) {
    console.error("[/api/auth/request-otp] Error:", error.message)
    return err("Failed to send OTP. Please try again.", 500)
  }
}
