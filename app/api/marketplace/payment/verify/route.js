import { NextResponse } from "next/server"
import { createBookingAndLead } from "../../../../../lib/marketplace"
import { verifyPaymentSignature } from "../../../../../lib/razorpay"

export async function POST(req) {
  const body = await req.json()
  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    vehicleId, name, phone, email, preferredDate, message,
  } = body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 })
  }
  if (!vehicleId || !name || !phone) {
    return NextResponse.json({ error: "vehicleId, name and phone are required" }, { status: 400 })
  }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })
  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed — signature mismatch" }, { status: 400 })
  }

  // Signature is valid, so the payment is authorized. Under manual capture
  // (payment_capture:0 on the order) the funds are held, not yet moved —
  // dealer "Confirm Sale" triggers the actual capture later.
  const result = createBookingAndLead({
    vehicleId, name, phone, email, preferredDate, message,
    paymentMeta: {
      paymentStatus: "AUTHORIZED_HELD",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
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
