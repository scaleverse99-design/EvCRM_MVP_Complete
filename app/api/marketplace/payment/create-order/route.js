import { NextResponse } from "next/server"
import { findVehicle } from "../../../../../lib/marketplace"
import { createOrder, isCashfreeConfigured, getCashfreeMode } from "../../../../../lib/cashfree"

export async function POST(req) {
  const body = await req.json()
  const { vehicleId, name, phone, email } = body

  if (!vehicleId) return NextResponse.json({ error: "vehicleId is required" }, { status: 400 })
  if (!phone)     return NextResponse.json({ error: "phone is required" }, { status: 400 })

  const vehicle = await findVehicle(vehicleId)
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })

  // No gateway configured → tell the client to use the no-payment fallback.
  if (!isCashfreeConfigured()) {
    return NextResponse.json({ error: "Payment gateway not configured", code: "PG_NOT_CONFIGURED" }, { status: 503 })
  }

  const tokenAmount = vehicle.tokenAmount || 1000
  const orderId = `evcrm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const customerId = "cust_" + String(phone).replace(/\D/g, "").slice(-10)

  try {
    const order = await createOrder({
      orderId,
      amount: tokenAmount,
      customer: { id: customerId, phone: String(phone).replace(/\D/g, "").slice(-10), name, email },
      notes: { vehicleId, dealership: vehicle.dealership, purpose: "test_drive_token" },
    })
    return NextResponse.json({
      success: true,
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      mode: getCashfreeMode(),
      amount: tokenAmount,
      vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
      dealerName: vehicle.dealerName,
    })
  } catch (e) {
    return NextResponse.json({ error: e.data?.message || e.message || "Failed to create order" }, { status: 502 })
  }
}
