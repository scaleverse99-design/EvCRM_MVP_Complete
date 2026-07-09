import { NextResponse } from "next/server"
import { createBookingAndLead } from "../../../../lib/marketplace"

/**
 * No-gateway fallback booking endpoint — used only when Razorpay isn't
 * configured yet (see /api/marketplace/payment/create-order). Once real
 * keys are added, the frontend routes bookings through the payment flow
 * instead and this becomes a dev/demo-only path.
 */
export async function POST(req) {
  const body = await req.json()
  const { vehicleId, name, phone, email, preferredDate, message } = body

  if (!vehicleId || !name || !phone) {
    return NextResponse.json({ error: "vehicleId, name and phone are required" }, { status: 400 })
  }

  const result = createBookingAndLead({ vehicleId, name, phone, email, preferredDate, message })
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
