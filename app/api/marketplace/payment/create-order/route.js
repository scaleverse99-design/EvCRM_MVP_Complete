import { NextResponse } from "next/server"
import { findVehicle } from "../../../../../lib/marketplace"
import { createOrder, isRazorpayConfigured, getPublicKeyId } from "../../../../../lib/razorpay"

export async function POST(req) {
  const body = await req.json()
  const { vehicleId, name, phone, email } = body

  if (!vehicleId) return NextResponse.json({ error: "vehicleId is required" }, { status: 400 })
  if (!phone)     return NextResponse.json({ error: "phone is required" }, { status: 400 })

  const vehicle = await findVehicle(vehicleId)
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })

  // No gateway configured → tell the client to use the no-payment fallback.
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Payment gateway not configured", code: "PG_NOT_CONFIGURED" }, { status: 503 })
  }

  const tokenAmount = vehicle.tokenAmount || 1000
  const amountPaise = tokenAmount * 100

  if (amountPaise < 100) {
    return NextResponse.json({ error: "Amount must be at least 100 paise" }, { status: 400 })
  }

  const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    const order = await createOrder({
      amountPaise,
      receipt,
      notes: { vehicleId, dealership: vehicle.dealership, purpose: "test_drive_token" },
    })
    return NextResponse.json({
      success: true,
      orderId: order.id,
      keyId: getPublicKeyId(),
      amountPaise,
      vehicleName: `${vehicle.brand} ${vehicle.model}`,
      dealerName: vehicle.dealerName,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to create order" }, { status: 502 })
  }
}
