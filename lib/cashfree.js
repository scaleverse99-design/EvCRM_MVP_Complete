import crypto from "crypto"

// ── Cashfree Payment Gateway (server-side) ─────────────────────────
// Order creation, status verification, refunds, and webhook signature
// checks. Sandbox vs production is switched by CASHFREE_ENV.
const APP_ID  = process.env.CASHFREE_APP_ID
const SECRET  = process.env.CASHFREE_SECRET_KEY
const ENV     = (process.env.CASHFREE_ENV || "sandbox").toLowerCase()
const IS_PROD = ENV === "production"
const BASE    = IS_PROD ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg"
const API_VERSION = "2023-08-01"

export function isCashfreeConfigured() {
  return Boolean(APP_ID && SECRET && !String(APP_ID).includes("placeholder"))
}

// The JS SDK needs to know which environment to open the checkout against.
export function getCashfreeMode() {
  return IS_PROD ? "production" : "sandbox"
}

async function cfFetch(path, method = "GET", body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "x-client-id":     APP_ID,
      "x-client-secret": SECRET,
      "x-api-version":   API_VERSION,
      "Content-Type":    "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Cashfree ${res.status}`)
    err.data = data
    throw err
  }
  return data
}

/**
 * Creates a Cashfree order for the ₹1,000 token. Returns a
 * payment_session_id the browser SDK uses to open checkout.
 */
export async function createOrder({ orderId, amount, customer, notes }) {
  return cfFetch("/orders", "POST", {
    order_id:       orderId,
    order_amount:   amount,          // in rupees (e.g. 1000), not paise
    order_currency: "INR",
    customer_details: {
      customer_id:    customer.id,
      customer_phone: customer.phone,
      customer_name:  customer.name || undefined,
      customer_email: customer.email || undefined,
    },
    order_meta: {
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"}/api/webhooks/cashfree`,
    },
    order_note: "EV.CRM test-drive token",
    order_tags: notes || undefined,
  })
}

/** Fetches an order — order_status is "PAID" once the customer completes payment. */
export async function getOrderStatus(orderId) {
  return cfFetch(`/orders/${encodeURIComponent(orderId)}`, "GET")
}

/**
 * Verifies a Cashfree webhook. Signature = base64( HMAC-SHA256( timestamp +
 * rawBody, secretKey ) ), sent in the `x-webhook-signature` header with the
 * timestamp in `x-webhook-timestamp`.
 */
export function verifyWebhookSignature({ timestamp, rawBody, signature }) {
  if (!SECRET || !signature || !timestamp) return false
  const expected = crypto.createHmac("sha256", SECRET).update(timestamp + rawBody).digest("base64")
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Refunds an order (full amount if amount omitted) — used when a booking is cancelled. */
export async function refundOrder(orderId, amount, note) {
  return cfFetch(`/orders/${encodeURIComponent(orderId)}/refunds`, "POST", {
    refund_amount: amount,
    refund_id:     `rf_${Date.now()}`,
    refund_note:   note || "Booking cancelled",
  })
}
