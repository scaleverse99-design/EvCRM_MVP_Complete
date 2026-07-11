export const dynamic = "force-dynamic"

import { generateOTP, hashOTP, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

// ── POST /api/service/otp ──────────────────────────────────────────
// Body: { phone }
// Customer portal login — sends a 6-digit OTP to the customer's phone.
// No SMS gateway is wired yet, so in demo mode the OTP is returned in
// the response (remove `demo_otp` once MSG91/Twilio is configured).
export async function POST(req) {
  try {
    const { phone } = await req.json()
    const digits = (phone || "").replace(/\D/g, "").slice(-10)
    if (digits.length !== 10) return err("Enter a valid 10-digit mobile number", 400)

    const otps = await readTable("otps")

    // Rate limit: max 3 OTPs per phone per 15 minutes
    const cutoff = Date.now() - 15 * 60 * 1000
    const recent = otps.filter(o => o.phone === digits && new Date(o.createdAt).getTime() > cutoff)
    if (recent.length >= 3) return err("Too many OTP requests. Please wait 15 minutes.", 429)

    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    otps.push({
      id: `otp_${Date.now()}`,
      phone: digits,
      otpHash,
      purpose: "customer_portal",
      used: false,
      createdAt: new Date().toISOString(),
    })
    await writeTable("otps", otps)

    const hasSmsGateway = !!process.env.SMS_GATEWAY_KEY
    if (hasSmsGateway) {
      // TODO: send via SMS gateway (MSG91 / Twilio)
    }

    return ok({
      message: "OTP sent to your mobile number",
      ...(hasSmsGateway ? {} : { demo_otp: otp }),
    })
  } catch (e) {
    console.error("[/api/service/otp]", e.message)
    return err("Failed to send OTP", 500)
  }
}
