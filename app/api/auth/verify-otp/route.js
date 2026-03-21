export const dynamic = "force-dynamic"

import { verifyOTP, err, ok } from "../../../../lib/auth"
import {
  findUserByEmail, findOTP,
  incrementOTPAttempts, markOTPUsed
} from "../../../../lib/db"

const MAX_OTP_ATTEMPTS = 5

// ── POST /api/auth/verify-otp ─────────────────────────────────────
// Body: { email, otp }
// Returns: { success, verified: true } — after this call /reset-password
export async function POST(req) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return err("Email and OTP are required", 400)
    }
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return err("OTP must be a 6-digit number", 400)
    }

    const emailClean = email.toLowerCase().trim()

    // ── Check user exists ─────────────────────────────────────────
    const user = await findUserByEmail(emailClean)
    if (!user) return err("Invalid request", 400) // vague intentionally

    // ── Find active OTP from DB ───────────────────────────────────
    const otpRecord = await findOTP(emailClean, "password_reset")

    if (!otpRecord) {
      return err("OTP has expired or does not exist. Please request a new one.", 400)
    }

    // ── Check attempt count ───────────────────────────────────────
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await markOTPUsed(otpRecord.id) // invalidate after too many tries
      return err("Too many incorrect attempts. Please request a new OTP.", 429)
    }

    // ── Verify OTP using bcrypt ───────────────────────────────────
    const isValid = await verifyOTP(otp, otpRecord.otp_hash)

    if (!isValid) {
      const attempts = await incrementOTPAttempts(otpRecord.id)
      const remaining = MAX_OTP_ATTEMPTS - attempts
      return err(
        remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many incorrect attempts. Please request a new OTP.",
        400
      )
    }

    // ── OTP is correct — mark as used so it can't be reused ───────
    await markOTPUsed(otpRecord.id)

    // Return a short-lived verification token the client uses
    // to call /reset-password without re-entering OTP
    // In production: use a signed token or store in session
    return ok({
      verified: true,
      email:    emailClean,
      message:  "OTP verified. You can now reset your password."
    })

  } catch (error) {
    console.error("[/api/auth/verify-otp] Error:", error.message)
    return err("Verification failed. Please try again.", 500)
  }
}
