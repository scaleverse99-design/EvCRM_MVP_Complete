import path from "path"
import { readTable, writeTable } from "./store"

const INV_FILE   = path.join(process.cwd(), "data", "inventory.json")
const BOOK_FILE  = path.join(process.cwd(), "data", "bookings.json")
const LEADS_FILE = path.join(process.cwd(), "data", "leads.json")
const FEED_FILE  = path.join(process.cwd(), "data", "feed.json")
const CUST_FILE  = path.join(process.cwd(), "data", "customers.json")
const TASK_FILE  = path.join(process.cwd(), "data", "tasks.json")
const DEALERS_FILE = path.join(process.cwd(), "data", "dealers.json")
const REPS_FILE  = path.join(process.cwd(), "data", "reps.json")
const USERS_FILE = path.join(process.cwd(), "data", "users.json")

// readJson/writeJson keep accepting a file-path-shaped identifier (as every
// caller already does) but resolve it to a Supabase table — or the local
// JSON file when Supabase isn't configured — via lib/store.js. This is the
// one seam that swapped the storage engine without touching call sites.
export async function readJson(file) {
  return readTable(path.basename(file, ".json"))
}
export async function writeJson(file, data) {
  return writeTable(path.basename(file, ".json"), data)
}

export async function findVehicle(vehicleId) {
  const inv = await readJson(INV_FILE)
  return inv.find(v => v.id === vehicleId) || null
}

export async function findBooking(predicate) {
  const bookings = await readJson(BOOK_FILE)
  return bookings.find(predicate) || null
}

export async function updateBooking(id, updates) {
  const bookings = await readJson(BOOK_FILE)
  const idx = bookings.findIndex(b => b.id === id)
  if (idx === -1) return null
  bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeJson(BOOK_FILE, bookings)
  return bookings[idx]
}

/**
 * Picks which rep a fresh marketplace booking should auto-assign to, based on
 * the dealership's `marketplaceAutoAssign` setting:
 *   "round_robin" (default) — rotate across reps who have an active login
 *   "specific"              — always the dealer's chosen marketplaceRepId
 *   "off"                   — no auto-assign; the dealer assigns manually
 * Only reps with an ACTIVE login account are eligible, so an auto-assigned
 * lead always lands with someone who can actually open and work it.
 * Returns { rep, dealer, dealers } — rep is the full rep object or null, and
 * dealers is the loaded table so the caller can persist the rotation cursor
 * without a second read.
 */
export async function pickMarketplaceRep(dealership) {
  const dealers = await readJson(DEALERS_FILE)
  const dealer = dealers.find(d => d.id === dealership) || null
  const mode = dealer?.marketplaceAutoAssign || "round_robin"
  if (mode === "off") return { rep: null, dealer, dealers }

  const [reps, users] = await Promise.all([readJson(REPS_FILE), readJson(USERS_FILE)])
  const activeRepIds = new Set(
    users.filter(u => u.role === "rep" && u.repId && u.is_active !== false).map(u => u.repId)
  )
  const eligible = reps
    .filter(r => r.dealership === dealership && activeRepIds.has(r.id))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))  // stable order so rotation is deterministic
  if (eligible.length === 0) return { rep: null, dealer, dealers }

  if (mode === "specific") {
    const pick = eligible.find(r => r.id === dealer?.marketplaceRepId) || null
    return { rep: pick, dealer, dealers }
  }

  // round_robin: assign to the rep after the last one we assigned to
  const lastIdx = eligible.findIndex(r => r.id === dealer?.marketplaceLastRepId)
  const rep = eligible[(lastIdx + 1) % eligible.length]
  return { rep, dealer, dealers }
}

/**
 * Creates a booking + auto-lead + activity feed event for a test drive.
 * paymentMeta carries whatever we know about the Razorpay payment at
 * creation time (may be absent for the no-gateway fallback path).
 *
 * A paid marketplace lead is the hottest lead a dealer gets, so we try to
 * auto-assign it to a rep immediately (see pickMarketplaceRep). If nobody is
 * eligible — no reps with logins, or the dealer turned auto-assign off — the
 * lead/booking carry needsAssignment:true and the feed flags it so the dealer
 * is prompted to assign it by hand.
 */
export async function createBookingAndLead({ vehicleId, name, phone, email, preferredDate, message, paymentMeta = {} }) {
  const vehicle = await findVehicle(vehicleId)
  if (!vehicle) return { error: "Vehicle not found" }

  const bookingId = `book_${Date.now()}`
  const now = new Date().toISOString()
  const tokenAmount = paymentMeta.paymentStatus === "PAID" ? (paymentMeta.amountPaid || 1000) : 0

  // Auto-assign to a rep (round-robin / specific), or flag for manual pickup.
  const { rep: autoRep, dealer, dealers } = await pickMarketplaceRep(vehicle.dealership)
  const assignedRep = autoRep?.id || null
  const needsAssignment = !assignedRep

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
    assignedRep,
    needsAssignment,
    createdAt: now,
  }

  const bookings = await readJson(BOOK_FILE)
  bookings.unshift(booking)
  await writeJson(BOOK_FILE, bookings)

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
    message: message || "",
    assignedRep,
    needsAssignment,
    next_followup: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    bookingId,
    preferredDate: preferredDate || null,
    created_at: now,
  }
  const leads = await readJson(LEADS_FILE)
  leads.unshift(lead)
  await writeJson(LEADS_FILE, leads)

  // Advance the round-robin cursor so the next booking goes to a different rep.
  if (assignedRep && dealer && Array.isArray(dealers)) {
    const di = dealers.findIndex(d => d.id === dealer.id)
    if (di !== -1) {
      dealers[di] = { ...dealers[di], marketplaceLastRepId: assignedRep }
      await writeJson(DEALERS_FILE, dealers)
    }
  }

  const dateStr = preferredDate ? new Date(preferredDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date TBD"
  const feedEvent = {
    id: `feed_${Date.now()}`,
    dealership: vehicle.dealership,
    type: "TEST_DRIVE_BOOKED",
    label: "🔥 TEST DRIVE BOOKED",
    msg: `${name} booked test drive — ${vehicle.model}`,
    sub: `₹${tokenAmount.toLocaleString("en-IN")} token · ${dateStr} · ${assignedRep ? `→ ${autoRep.name}` : "⚠ Needs assignment"}`,
    icon: "🚗",
    color: assignedRep ? "#059669" : "#DC2626",
    actionLabel: assignedRep ? "Call" : "Assign",
    created_at: now,
  }
  const feed = await readJson(FEED_FILE)
  feed.unshift(feedEvent)
  await writeJson(FEED_FILE, feed)

  const task = await createTask({
    dealership: vehicle.dealership,
    title: `Follow up with ${name} — ${vehicle.model}`,
    type: "follow_up",
    relatedLeadId: lead.id,
    dueDate: lead.next_followup,
    assignedRep,
    autoGenerated: true,
  })

  // 📧 Outgoing welcome/booking notification to customer
  if (email) {
    try {
      const { sendBookingConfirmationEmail } = require("./email")
      await sendBookingConfirmationEmail({ to: email, name, booking })
    } catch (e) {
      console.error("[Email Error] Failed to send test drive booking confirmation:", e.message)
    }
  }

  return { booking, vehicle, lead, task }
}

/**
 * Creates a task record. Used both for auto-generated tasks (follow-ups,
 * service reminders) and manual dealer-created tasks.
 */
export async function createTask({ dealership, title, type = "manual", relatedLeadId = null, relatedCustomerId = null, dueDate = null, autoGenerated = false, assignedRep = null }) {
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dealership,
    title,
    type,
    relatedLeadId,
    relatedCustomerId,
    dueDate,
    assignedRep,
    outcomeNote: null,
    status: "PENDING",
    autoGenerated,
    createdAt: new Date().toISOString(),
  }
  const tasks = await readJson(TASK_FILE)
  tasks.unshift(task)
  await writeJson(TASK_FILE, tasks)
  return task
}

/**
 * Runs when a dealer finalizes a sale (booking PATCH action=finalize).
 * Closes the originating lead, marks the vehicle SOLD, creates a customer
 * record, and schedules a first service reminder 90 days out.
 */
export async function finalizeSale(booking) {
  const vehicle = await findVehicle(booking.vehicleId)

  const leads = await readJson(LEADS_FILE)
  const leadIdx = leads.findIndex(l => l.bookingId === booking.id)
  let lead = null
  if (leadIdx !== -1) {
    leads[leadIdx] = { ...leads[leadIdx], status: "CLOSED", amount: vehicle?.exShowroom || 0 }
    await writeJson(LEADS_FILE, leads)
    lead = leads[leadIdx]
  }

  if (vehicle) {
    const inv = await readJson(INV_FILE)
    const invIdx = inv.findIndex(v => v.id === booking.vehicleId)
    if (invIdx !== -1) {
      inv[invIdx] = { ...inv[invIdx], status: "SOLD", updatedAt: new Date().toISOString() }
      await writeJson(INV_FILE, inv)
    }
  }

  const customer = {
    id: `cust_${Date.now()}`,
    dealership: booking.dealership,
    name: booking.name,
    phone: booking.phone,
    email: booking.email || "",
    vehicle: booking.vehicleName,
    vehicleId: booking.vehicleId,
    vin: vehicle?.vin || "",
    address: "",
    financeStatus: "none",
    bookingId: booking.id,
    leadId: lead?.id || null,
    purchaseDate: new Date().toISOString(),
    purchaseAmount: vehicle?.exShowroom || 0,
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    serviceReminders: [
      { id: `svc_${Date.now()}`, type: "First Service", dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), done: false },
    ],
    commLog: [],
    createdAt: new Date().toISOString(),
  }
  const customers = await readJson(CUST_FILE)
  customers.unshift(customer)
  await writeJson(CUST_FILE, customers)

  const task = await createTask({
    dealership: booking.dealership,
    title: `First service reminder — ${customer.name} (${booking.vehicleName})`,
    type: "service",
    relatedCustomerId: customer.id,
    dueDate: customer.serviceReminders[0].dueDate,
    autoGenerated: true,
  })

  return { customer, lead, task }
}
