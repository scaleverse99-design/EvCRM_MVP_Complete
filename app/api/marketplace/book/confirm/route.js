export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { readTableCached } from "../../../../../lib/store"
import { createBookingAndLead } from "../../../../../lib/marketplace"
import { verifyBookingIntent } from "../../../../../lib/mcp/bookingIntent.js"

/**
 * Confirms a booking intent created by the MCP `book_test_drive` tool.
 *
 * This is the ONLY place an MCP-originated booking is actually written. The
 * tool itself returns a signed link and writes nothing, so a public,
 * unauthenticated MCP server can offer a booking flow without letting any
 * caller create rows in a dealer's CRM. See lib/mcp/bookingIntent.js.
 *
 * GET  — resolve a token into displayable vehicle details (no side effects),
 *        so the confirmation page can show what is being booked.
 * POST — the human has supplied name + phone and submitted. Creates the
 *        booking and lead.
 */

/** Shared token → vehicle resolution. Returns a Response on failure. */
async function resolve(token) {
  const check = verifyBookingIntent(token)
  if (!check.ok) return { error: NextResponse.json({ error: check.reason }, { status: 400 }) }

  const inventory = await readTableCached("inventory")
  const vehicle = inventory.find(v =>
    v.id === check.intent.vehicleId &&
    v.status === "IN_STOCK" &&
    !v.isDemo &&
    (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")
  )

  // A vehicle can sell between the assistant suggesting it and the user
  // clicking through — say so plainly rather than booking something gone.
  if (!vehicle) {
    return { error: NextResponse.json({ error: "This vehicle is no longer available." }, { status: 404 }) }
  }
  return { intent: check.intent, vehicle }
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token")
  const r = await resolve(token)
  if (r.error) return r.error

  const { intent, vehicle } = r
  return NextResponse.json({
    success: true,
    vehicle: {
      id: vehicle.id,
      name: `${vehicle.brand} ${vehicle.model}`,
      exShowroom: vehicle.exShowroom,
      fuelType: vehicle.fuelType,
      dealerName: vehicle.dealerName,
      city: vehicle.district,
      image: typeof vehicle.images?.[0] === "string" && vehicle.images[0].startsWith("http") ? vehicle.images[0] : null,
    },
    preferredDate: intent.preferredDate || null,
  })
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  const r = await resolve(body.token)
  if (r.error) return r.error

  const { intent, vehicle } = r
  const { name, phone, email, message } = body

  // The human supplies these — they are deliberately NOT in the token, so a
  // shared or logged link carries no personal data.
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })
  }
  if (!/^[6-9]\d{9}$/.test(String(phone).replace(/\D/g, "").slice(-10))) {
    return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 })
  }

  // Replay guard: the intent's jti is stored on the booking, so re-submitting
  // the same link returns the original booking instead of creating a second.
  // Idempotent without needing a new table to track spent tokens.
  const existing = (await readTableCached("bookings")).find(b => b.intentJti === intent.jti)
  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyConfirmed: true,
      booking: { id: existing.id, vehicleName: existing.vehicleName, preferredDate: existing.preferredDate },
    })
  }

  const result = await createBookingAndLead({
    vehicleId: vehicle.id,
    name,
    phone,
    email,
    preferredDate: body.preferredDate || intent.preferredDate,
    message,
    // Provenance so a dealer can see this lead came via an AI assistant
    // rather than the website — useful for judging intent, and for measuring
    // whether the MCP channel is worth anything.
    source: "mcp_assistant",
    source_context: intent.source || "mcp",
    intentJti: intent.jti,
  })

  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })

  const { booking } = result
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
