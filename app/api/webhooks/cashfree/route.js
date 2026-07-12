export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../../lib/store"
import { verifyWebhookSignature } from "../../../../lib/cashfree"

// Reconciliation endpoint — set this URL in the Cashfree dashboard
// (Developers → Webhooks). Keeps booking.paymentStatus correct even if the
// customer's browser never returns after the checkout modal closes.
export async function POST(req) {
  const rawBody   = await req.text()
  const signature = req.headers.get("x-webhook-signature")
  const timestamp = req.headers.get("x-webhook-timestamp")

  if (!verifyWebhookSignature({ timestamp, rawBody, signature })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }) }

  const orderId = event?.data?.order?.order_id
  const type    = event?.type   // e.g. PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, REFUND_STATUS_WEBHOOK
  if (!orderId) return NextResponse.json({ received: true })

  const bookings = await readTable("bookings")
  const idx = bookings.findIndex(b => b.cashfreeOrderId === orderId)
  if (idx === -1) return NextResponse.json({ received: true })  // booking not created yet / unknown order

  if (type === "PAYMENT_SUCCESS_WEBHOOK") {
    bookings[idx].paymentStatus = "PAID"
    bookings[idx].status = bookings[idx].status || "CONFIRMED"
  } else if (type === "PAYMENT_FAILED_WEBHOOK" || type === "PAYMENT_USER_DROPPED_WEBHOOK") {
    bookings[idx].paymentStatus = "FAILED"
  } else if (type === "REFUND_STATUS_WEBHOOK" && event?.data?.refund?.refund_status === "SUCCESS") {
    bookings[idx].paymentStatus = "REFUNDED"
    bookings[idx].status = "CANCELLED"
  }
  await writeTable("bookings", bookings)

  return NextResponse.json({ received: true })
}
