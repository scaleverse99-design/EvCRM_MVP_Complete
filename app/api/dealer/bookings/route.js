import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { verifyToken } from "../../../../lib/auth"
import { readJson, updateBooking, finalizeSale } from "../../../../lib/marketplace"
import { capturePayment, refundPayment, createTransfer, isRazorpayConfigured } from "../../../../lib/razorpay"

const BOOK_FILE    = path.join(process.cwd(), "data", "bookings.json")
const DEALERS_FILE = path.join(process.cwd(), "data", "dealers.json")

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

function canAccess(user, booking) {
  if (["founder", "superadmin"].includes(user.role)) return true
  return user.role === "dealer" && user.dealership === booking.dealership
}

// GET: bookings for the dealer's own dealership
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const all = await readJson(BOOK_FILE)
  const bookings = dealership ? all.filter(b => b.dealership === dealership) : all
  return NextResponse.json({ success: true, bookings, total: bookings.length })
}

// PATCH: action=finalize (capture held funds + attempt payout) | action=cancel (refund)
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["dealer", "founder", "superadmin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { id, action } = body
  if (!id || !action) return NextResponse.json({ error: "id and action are required" }, { status: 400 })

  const booking = (await readJson(BOOK_FILE)).find(b => b.id === id)
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (!canAccess(user, booking)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (action === "finalize") {
    if (booking.paymentStatus !== "AUTHORIZED_HELD") {
      return NextResponse.json({ error: `Cannot finalize a booking with payment status ${booking.paymentStatus}` }, { status: 400 })
    }
    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 })
    }
    try {
      await capturePayment(booking.razorpayPaymentId, booking.amountPaise)
      let updated = await updateBooking(id, { paymentStatus: "CAPTURED_HELD_IN_PG", status: "SALE_CONFIRMED" })

      const dealers = await readJson(DEALERS_FILE)
      const dealer = dealers.find(d => d.id === booking.dealership)
      if (dealer?.razorpayAccountId) {
        try {
          await createTransfer(booking.razorpayPaymentId, dealer.razorpayAccountId, booking.amountPaise)
          updated = await updateBooking(id, { paymentStatus: "RELEASED_TO_DEALER" })
        } catch (transferErr) {
          // Capture succeeded but payout failed/not eligible yet — funds stay
          // in the platform account, dealer can be paid out manually.
          updated = await updateBooking(id, { payoutError: transferErr.error?.description || transferErr.message })
        }
      }

      const { customer, task } = await finalizeSale(updated)
      return NextResponse.json({ success: true, booking: updated, customer, task })
    } catch (e) {
      return NextResponse.json({ error: e.error?.description || e.message || "Capture failed" }, { status: 502 })
    }
  }

  if (action === "cancel") {
    if (["REFUNDED", "CANCELLED"].includes(booking.status) || booking.paymentStatus === "REFUNDED") {
      return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 })
    }
    if (["CAPTURED_HELD_IN_PG", "RELEASED_TO_DEALER"].includes(booking.paymentStatus)) {
      if (!isRazorpayConfigured()) return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 })
      try {
        await refundPayment(booking.razorpayPaymentId, booking.amountPaise, { reason: "test_drive_cancelled" })
      } catch (e) {
        return NextResponse.json({ error: e.error?.description || e.message || "Refund failed" }, { status: 502 })
      }
      const updated = await updateBooking(id, { status: "CANCELLED", paymentStatus: "REFUNDED" })
      return NextResponse.json({ success: true, booking: updated })
    }
    // AUTHORIZED_HELD (never captured) or SKIPPED_NO_GATEWAY — nothing to refund,
    // an uncaptured authorization simply expires on its own.
    const updated = await updateBooking(id, { status: "CANCELLED" })
    return NextResponse.json({ success: true, booking: updated })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
