import fs from "fs"
import path from "path"

const INV_FILE   = path.join(process.cwd(), "data", "inventory.json")
const BOOK_FILE  = path.join(process.cwd(), "data", "bookings.json")
const LEADS_FILE = path.join(process.cwd(), "data", "leads.json")
const FEED_FILE  = path.join(process.cwd(), "data", "feed.json")

export function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")) } catch { return [] } }
export function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)) }

export function findVehicle(vehicleId) {
  return readJson(INV_FILE).find(v => v.id === vehicleId) || null
}

export function findBooking(predicate) {
  return readJson(BOOK_FILE).find(predicate) || null
}

export function updateBooking(id, updates) {
  const bookings = readJson(BOOK_FILE)
  const idx = bookings.findIndex(b => b.id === id)
  if (idx === -1) return null
  bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() }
  writeJson(BOOK_FILE, bookings)
  return bookings[idx]
}

/**
 * Creates a booking + auto-lead + activity feed event for a test drive.
 * paymentMeta carries whatever we know about the Razorpay payment at
 * creation time (may be absent for the no-gateway fallback path).
 */
export function createBookingAndLead({ vehicleId, name, phone, email, preferredDate, message, paymentMeta = {} }) {
  const vehicle = findVehicle(vehicleId)
  if (!vehicle) return { error: "Vehicle not found" }

  const bookingId = `book_${Date.now()}`
  const now = new Date().toISOString()
  const tokenAmount = vehicle.tokenAmount || 1000

  const booking = {
    id: bookingId,
    vehicleId,
    vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
    dealership: vehicle.dealership,
    dealerName: vehicle.dealerName,
    name,
    phone,
    email: email || "",
    preferredDate: preferredDate || null,
    message: message || "",
    tokenAmount,
    amountPaise: tokenAmount * 100,
    status: "CONFIRMED",
    paymentStatus: paymentMeta.paymentStatus || "SKIPPED_NO_GATEWAY",
    razorpayOrderId: paymentMeta.razorpayOrderId || null,
    razorpayPaymentId: paymentMeta.razorpayPaymentId || null,
    createdAt: now,
  }

  const bookings = readJson(BOOK_FILE)
  bookings.unshift(booking)
  writeJson(BOOK_FILE, bookings)

  const lead = {
    id: `lead_${Date.now()}`,
    dealership: vehicle.dealership,
    name,
    phone,
    email: email || "",
    vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
    vehicleId,
    status: "HOT",
    source: "marketplace_booking",
    source_context: "test_drive",
    amount: 0,
    tokenCollected: tokenAmount,
    next_followup: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    bookingId,
    preferredDate: preferredDate || null,
    created_at: now,
  }
  const leads = readJson(LEADS_FILE)
  leads.unshift(lead)
  writeJson(LEADS_FILE, leads)

  const feedEvent = {
    id: `feed_${Date.now()}`,
    dealership: vehicle.dealership,
    type: "TEST_DRIVE_BOOKED",
    label: "🔥 TEST DRIVE BOOKED",
    msg: `${name} booked test drive — ${vehicle.model}`,
    sub: `₹${tokenAmount.toLocaleString("en-IN")} token · ${preferredDate ? new Date(preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date TBD"} · via Marketplace`,
    icon: "🚗",
    color: "#059669",
    actionLabel: "Call",
    created_at: now,
  }
  const feed = readJson(FEED_FILE)
  feed.unshift(feedEvent)
  writeJson(FEED_FILE, feed)

  return { booking, vehicle, lead }
}
