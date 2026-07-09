// ── app/api/webhooks/razorpay-subscription/route.js ──────────────────
// Handles Razorpay subscription lifecycle events so a dealer's
// billingStatus in users.json always matches reality.
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
import fs from "fs"
import path from "path"
import { verifyWebhookSignature } from "../../../../lib/razorpay"

const USERS_FILE = path.join(process.cwd(), "data", "users.json")
function readUsers()      { try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) } catch { return [] } }
function writeUsers(data) { fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)) }

function updateDealer(dealerId, updates) {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === dealerId)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...updates }
  writeUsers(users)
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
        updateDealer(dealerId, { mandateStatus: "authorized" })
        break

      case "subscription.activated":
      case "subscription.charged":
        updateDealer(dealerId, { billingStatus: "active" })
        break

      case "subscription.pending":
      case "subscription.halted":
        updateDealer(dealerId, { billingStatus: "past_due" })
        break

      case "subscription.cancelled":
        updateDealer(dealerId, { billingStatus: "cancelled" })
        break

      default:
        break
    }
  }

  return NextResponse.json({ received: true })
}
