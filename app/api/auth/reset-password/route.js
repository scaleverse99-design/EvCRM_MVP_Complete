import { hashPassword, err, ok } from "../../../../lib/auth"
import { findUserByEmail, updateUserPassword } from "../../../../lib/db"
import { sendPasswordResetConfirmation } from "../../../../lib/email"

const MIN_PASSWORD_LENGTH = 8

// ── POST /api/auth/reset-password ────────────────────────────────
// Body: { email, newPassword, confirmPassword }
// Should only be called AFTER /verify-otp returns verified: true
// In production: add a signed reset token for extra security
export async function POST(req) {
  try {
    const { email, newPassword, confirmPassword } = await req.json()

    if (!email || !newPassword || !confirmPassword) {
      return err("All fields are required", 400)
    }

    // ── Password validation ───────────────────────────────────────
    if (newPassword !== confirmPassword) {
      return err("Passwords do not match", 400)
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400)
    }

    // Password strength check
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumber    = /\d/.test(newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return err(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        400
      )
    }

    const emailClean = email.toLowerCase().trim()

    // ── Verify user exists ────────────────────────────────────────
    const user = await findUserByEmail(emailClean)
    if (!user) return err("User not found", 404)

    // ── Hash new password with bcrypt (12 rounds) ─────────────────
    const passwordHash = await hashPassword(newPassword)

    // ── Update in database ────────────────────────────────────────
    await updateUserPassword(emailClean, passwordHash)

    // ── Send confirmation email ───────────────────────────────────
    await sendPasswordResetConfirmation({
      to:   user.email,
      name: user.name,
    })

    console.log(`[RESET] Password reset for ${emailClean}`)

    return ok({ message: "Password reset successfully. You can now log in." })

  } catch (error) {
    console.error("[/api/auth/reset-password] Error:", error.message)
    return err("Failed to reset password. Please try again.", 500)
  }
}
