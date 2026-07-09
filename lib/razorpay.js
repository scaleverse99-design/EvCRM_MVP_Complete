import Razorpay from "razorpay"
import crypto from "crypto"

const KEY_ID     = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET

let client = null
export function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) return null
  if (!client) client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
  return client
}

export function isRazorpayConfigured() {
  return Boolean(KEY_ID && KEY_SECRET && !KEY_ID.includes("placeholder") && !KEY_SECRET.includes("placeholder"))
}

export function getPublicKeyId() {
  return KEY_ID
}

/**
 * Create an order for the ₹1,000 token. payment_capture:0 keeps it as an
 * authorization-only hold — funds are earmarked but not moved to the
 * merchant account until capturePayment() is called.
 * Note: manual capture only applies to cards; UPI/wallets auto-capture
 * regardless of this flag (a Razorpay/NPCI constraint, not ours).
 */
export async function createOrder({ amountPaise, receipt, notes }) {
  const rz = getRazorpay()
  if (!rz) throw new Error("Razorpay is not configured")
  return rz.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    payment_capture: 0,
    notes,
  })
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!KEY_SECRET) return false
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""))
  } catch {
    return false
  }
}

export function verifyWebhookSignature({ body, signature }) {
  if (!WEBHOOK_SECRET || !signature) return false
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Captures a held (authorized) payment — moves funds into the platform account. */
export async function capturePayment(paymentId, amountPaise) {
  const rz = getRazorpay()
  if (!rz) throw new Error("Razorpay is not configured")
  return rz.payments.capture(paymentId, amountPaise, "INR")
}

/** Refunds a captured payment (full amount if amountPaise omitted). */
export async function refundPayment(paymentId, amountPaise, notes) {
  const rz = getRazorpay()
  if (!rz) throw new Error("Razorpay is not configured")
  const opts = { notes }
  if (amountPaise) opts.amount = amountPaise
  return rz.payments.refund(paymentId, opts)
}

/**
 * Routes captured funds to a dealer's linked Razorpay account.
 * Requires Razorpay Route to be enabled on the account and the dealer to
 * have completed linked-account KYC — until then this is a no-op that
 * throws, so callers should treat "no razorpayAccountId" as "not onboarded yet".
 */
export async function createTransfer(paymentId, razorpayAccountId, amountPaise) {
  const rz = getRazorpay()
  if (!rz) throw new Error("Razorpay is not configured")
  return rz.payments.transfer(paymentId, {
    transfers: [{ account: razorpayAccountId, amount: amountPaise, currency: "INR", on_hold: 0 }],
  })
}
