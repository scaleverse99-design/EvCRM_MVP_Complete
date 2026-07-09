// ── app/api/dealer/billing/create-subscription/route.js ─────────────
// Creates a Razorpay subscription mandate for a dealer during their
// free trial. No charge happens now — Razorpay auto-charges ₹3,000
// starting at the trial's actual end date (dealer.trialStartDate + 30d),
// based on the plan's billing cycle.
//
// Flow:
//   1. Dealer signs up → trialStartDate set, mandateStatus "none"
//   2. Dealer authorizes UPI/card mandate (this endpoint + Razorpay checkout)
//   3. Trial ends → Razorpay auto-charges and fires a webhook
//      (see app/api/webhooks/razorpay-subscription/route.js)
//
// Requires env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_ID
// Create the ₹3,000/month plan once in the Razorpay dashboard and put its
// plan_id in RAZORPAY_PLAN_ID.

import { NextResponse } from "next/server"
import { verifyToken } from "../../../../../lib/auth"
import { getRazorpay, isRazorpayConfigured, getPublicKeyId } from "../../../../../lib/razorpay"
import { TRIAL_DAYS } from "../../../../../lib/billing"
import { readTable, writeTable } from "../../../../../lib/store"

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

export async function POST(req) {
  const authUser = await getUser(req)
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (authUser.role !== "dealer") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured", code: "RAZORPAY_NOT_CONFIGURED" }, { status: 503 })
  }
  if (!process.env.RAZORPAY_PLAN_ID) {
    return NextResponse.json({ error: "RAZORPAY_PLAN_ID is not set" }, { status: 503 })
  }

  const { dealerName, dealerEmail, dealerPhone } = await req.json()

  const users = await readTable("users")
  const idx = users.findIndex(u => u.id === authUser.sub)
  if (idx === -1) return NextResponse.json({ error: "Dealer account not found" }, { status: 404 })
  const dealer = users[idx]

  try {
    const rz = getRazorpay()

    // 1. Ensure a Razorpay customer exists for this dealer
    const customer = await rz.customers.create({
      name: dealerName || dealer.name,
      email: dealerEmail || dealer.email,
      contact: dealerPhone || dealer.phone,
      notes: { dealerId: dealer.id },
    })

    // 2. Create the subscription. total_count: 0 = no fixed end (auto-recurs
    //    until cancelled). start_at is the dealer's actual trial end date —
    //    the mandate is authorized now via checkout, but the first charge
    //    won't land until the free trial genuinely ends.
    const trialStart = new Date(dealer.trialStartDate || dealer.created_at)
    const trialEnd   = Math.floor(trialStart.getTime() / 1000) + TRIAL_DAYS * 24 * 60 * 60

    const subscription = await rz.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1,
      total_count: 0,
      start_at: trialEnd,
      notes: { dealerId: dealer.id },
    })

    users[idx] = {
      ...dealer,
      razorpayCustomerId: customer.id,
      razorpaySubscriptionId: subscription.id,
      mandateStatus: "pending",
    }
    await writeTable("users", users)

    return NextResponse.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      keyId: getPublicKeyId(),
    })
  } catch (err) {
    return NextResponse.json({ error: err.error?.description || err.message || "Failed to create subscription" }, { status: 500 })
  }
}
