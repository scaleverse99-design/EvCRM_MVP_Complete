// ── app/api/webhooks/razorpay-subscription/route.js ──────────────────
// Handles Razorpay subscription lifecycle events so a dealer's
// billingStatus always matches reality.
//
// Register this URL in Razorpay Dashboard → Settings → Webhooks (as a
// SEPARATE webhook from the marketplace payment one, with its own secret):
//   https://evcrm.in/api/webhooks/razorpay-subscription
// Subscribe to: subscription.authenticated, subscription.activated,
//               subscription.charged, subscription.pending,
//               subscription.halted, subscription.cancelled
//
// Requires env var: RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET

import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "../../../../lib/razorpay"
import { readTable, writeTable } from "../../../../lib/store"

async function updateDealer(dealerId, updates) {
  const users = await readTable("users")
  const idx = users.findIndex(u => u.id === dealerId)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...updates }
  await writeTable("users", users)
  return users[idx]
}

export async function POST(req) {
  const rawBody   = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  const valid = verifyWebhookSignature({
    body: rawBody,
    signature,
    secret: process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET,
  })
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })

  const event    = JSON.parse(rawBody)
  const dealerId = event?.payload?.subscription?.entity?.notes?.dealerId

  if (dealerId) {
    switch (event.event) {
      case "subscription.authenticated":
        // Mandate authorized during trial — billingStatus stays "trial" until it actually ends.
        await updateDealer(dealerId, { mandateStatus: "authorized" })
        break

      case "subscription.activated":
      case "subscription.charged":
        await updateDealer(dealerId, { billingStatus: "active" })
        break

      case "subscription.pending":
      case "subscription.halted":
        await updateDealer(dealerId, { billingStatus: "past_due" })
        break

      case "subscription.cancelled":
        await updateDealer(dealerId, { billingStatus: "cancelled" })
        break

      default:
        break
    }
  }

  return NextResponse.json({ received: true })
}
