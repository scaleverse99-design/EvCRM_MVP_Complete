export const dynamic = "force-dynamic"

import { verifyOTP, generateToken, ok, err } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"

// ── POST /api/service/verify ───────────────────────────────────────
// Body: { phone, otp }
// Verifies the OTP and returns a customer session token plus the
// customer's purchases (bookings + quotes) and service requests.
export async function POST(req) {
  try {
    const { phone, otp } = await req.json()
    const digits = (phone || "").replace(/\D/g, "").slice(-10)
    if (digits.length !== 10 || !otp) return err("Phone and OTP are required", 400)

    const otps = await readTable("otps")
    const cutoff = Date.now() - 15 * 60 * 1000
    const candidates = otps
      .filter(o => o.phone === digits && o.purpose === "customer_portal" && !o.used && new Date(o.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    let matched = null
    for (const c of candidates) {
      if (await verifyOTP(String(otp).trim(), c.otpHash)) { matched = c; break }
    }
    if (!matched) return err("Invalid or expired OTP", 401)

    matched.used = true
    await writeTable("otps", otps)

    // generateToken only keeps sub/email/role/dealership — carry the phone in `sub`
    const token = generateToken({ userId: digits, role: "customer" })

    const [bookings, quotes, requests] = await Promise.all([
      readTable("bookings"), readTable("quotes"), readTable("service_requests"),
    ])
    const norm = p => (p || "").replace(/\D/g, "").slice(-10)
    const myBookings = bookings.filter(b => norm(b.phone) === digits)
    const myQuotes   = quotes.filter(q => norm(q.customerPhone) === digits)
      .map(({ receipt, createdBy, ...safe }) => safe)
    const myRequests = requests.filter(r => norm(r.customerPhone) === digits)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return ok({ token, bookings: myBookings, quotes: myQuotes, requests: myRequests })
  } catch (e) {
    console.error("[/api/service/verify]", e.message)
    return err("Verification failed", 500)
  }
}
