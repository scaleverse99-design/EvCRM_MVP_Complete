import { NextResponse } from "next/server"
import { createBookingAndLead } from "../../../../../lib/marketplace"
import { getOrderStatus } from "../../../../../lib/cashfree"

// Called after the customer completes Cashfree checkout. We verify by
// fetching the order server-side (Cashfree has no client-side signature) and
// only create the booking + lead once the order is actually PAID.
export async function POST(req) {
  const body = await req.json()
  const { orderId, vehicleId, name, phone, email, preferredDate, message } = body

  if (!orderId)                   return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  if (!vehicleId || !name || !phone) return NextResponse.json({ error: "vehicleId, name and phone are required" }, { status: 400 })

  let order
  try {
    order = await getOrderStatus(orderId)
  } catch (e) {
    return NextResponse.json({ error: e.data?.message || "Could not verify payment" }, { status: 502 })
  }

  if (order.order_status !== "PAID") {
    return NextResponse.json({ error: `Payment not completed (status: ${order.order_status})` }, { status: 400 })
  }

  const result = await createBookingAndLead({
    vehicleId, name, phone, email, preferredDate, message,
    paymentMeta: {
      paymentStatus:  "PAID",
      cashfreeOrderId: orderId,
      amountPaid:      order.order_amount,
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
