import { NextResponse } from "next/server"
import { findVehicle } from "../../../../../lib/marketplace"
import { createOrder, isRazorpayConfigured, getPublicKeyId } from "../../../../../lib/razorpay"

export async function POST(req) {
  const body = await req.json()
  const { vehicleId } = body

  if (!vehicleId) return NextResponse.json({ error: "vehicleId is required" }, { status: 400 })

  const vehicle = findVehicle(vehicleId)
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay not configured", code: "RAZORPAY_NOT_CONFIGURED" }, { status: 503 })
  }

  const tokenAmount = vehicle.tokenAmount || 1000
  const amountPaise = tokenAmount * 100

  try {
    const order = await createOrder({
      amountPaise,
      receipt: `veh_${vehicleId}_${Date.now()}`,
      notes: { vehicleId, dealership: vehicle.dealership, purpose: "test_drive_token" },
    })
    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getPublicKeyId(),
      vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
      dealerName: vehicle.dealerName,
    })
  } catch (e) {
    return NextResponse.json({ error: e.error?.description || e.message || "Failed to create order" }, { status: 502 })
  }
}
