import { NextResponse } from "next/server"
import { readJson, updateBooking } from "../../../../lib/marketplace"
import { verifyWebhookSignature } from "../../../../lib/razorpay"
import path from "path"

const BOOK_FILE = path.join(process.cwd(), "data", "bookings.json")

async function findBookingByPayment(paymentId, orderId) {
  const bookings = await readJson(BOOK_FILE)
  return bookings.find(b => b.razorpayPaymentId === paymentId || b.razorpayOrderId === orderId) || null
}

/**
 * Reconciliation endpoint — register this URL + a webhook secret in the
 * Razorpay dashboard once live keys are added. Keeps booking.paymentStatus
 * correct even if a client never returns after the checkout modal closes.
 */
export async function POST(req) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!verifyWebhookSignature({ body: rawBody, signature })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  const payment = event.payload?.payment?.entity
  const refund  = event.payload?.refund?.entity

  switch (event.event) {
    case "payment.authorized": {
      const booking = payment && await findBookingByPayment(payment.id, payment.order_id)
      if (booking && booking.paymentStatus !== "CAPTURED_HELD_IN_PG" && booking.paymentStatus !== "RELEASED_TO_DEALER") {
        await updateBooking(booking.id, { paymentStatus: "AUTHORIZED_HELD", razorpayPaymentId: payment.id })
      }
      break
    }
    case "payment.captured": {
      const booking = payment && await findBookingByPayment(payment.id, payment.order_id)
      if (booking) await updateBooking(booking.id, { paymentStatus: "CAPTURED_HELD_IN_PG" })
      break
    }
    case "payment.failed": {
      const booking = payment && await findBookingByPayment(payment.id, payment.order_id)
      if (booking) await updateBooking(booking.id, { paymentStatus: "FAILED", status: "CANCELLED" })
      break
    }
    case "refund.processed": {
      const booking = refund && await findBookingByPayment(refund.payment_id, null)
      if (booking) await updateBooking(booking.id, { paymentStatus: "REFUNDED", status: "CANCELLED" })
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
