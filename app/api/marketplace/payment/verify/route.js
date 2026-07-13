import { NextResponse } from "next/server"
import { createBookingAndLead } from "../../../../../lib/marketplace"
import { verifyPaymentSignature } from "../../../../../lib/razorpay"

// Called after the customer completes Razorpay checkout. We verify the
// signature securely using our server-side Key Secret and only create
// the booking + lead once the signature is confirmed to be valid.
export async function POST(req) {
  const body = await req.json()
  const { orderId, paymentId, signature, vehicleId, name, phone, email, preferredDate, message } = body

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "orderId, paymentId, and signature are required" }, { status: 400 })
  }
  if (!vehicleId || !name || !phone) {
    return NextResponse.json({ error: "vehicleId, name and phone are required" }, { status: 400 })
  }

  const isValid = verifyPaymentSignature({ orderId, paymentId, signature })
  if (!isValid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
  }

  const result = await createBookingAndLead({
    vehicleId, name, phone, email, preferredDate, message,
    paymentMeta: {
      paymentStatus:  "PAID",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountPaid:      1000,
    },
  })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })

  const { booking, vehicle } = result
  return NextResponse.json({
    success: true,
    booking: {
      id: booking.id,
      vehicleName: booking.vehicleName,
      dealerName: vehicle.dealerName,
      tokenAmount: booking.tokenAmount,
      preferredDate: booking.preferredDate,
      status: "CONFIRMED",
      paymentStatus: booking.paymentStatus,
    },
  })
}
