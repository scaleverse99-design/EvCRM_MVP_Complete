// ── lib/billing.js ───────────────────────────────────────────────────
// Trial-to-paid billing logic for dealers.
// Each dealer gets 30 days free from signup, then converts to ₹3,000/month
// via Razorpay autopay (UPI/card mandate set up during the trial).

export const MONTHLY_PRICE_INR = 3000
export const TRIAL_DAYS = 30

// ── Dealer billing record shape (fields on the users.json dealer row) ──
// {
//   trialStartDate: "2026-07-09T00:00:00.000Z",  // defaults to created_at
//   razorpaySubscriptionId: null,                  // set once mandate is created
//   razorpayCustomerId: null,
//   mandateStatus: "pending" | "authorized" | "none",
//   billingStatus: "trial" | "active" | "past_due" | "cancelled",
// }

/** Days remaining in the free trial (0 if trial has ended). */
export function trialDaysRemaining(trialStartDate) {
  const start = new Date(trialStartDate)
  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date()
  const msLeft = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))
}

/** True once TRIAL_DAYS have elapsed since trialStartDate. */
export function isTrialExpired(trialStartDate) {
  return trialDaysRemaining(trialStartDate) === 0
}

/**
 * Derives the effective billing state for a dealer record.
 * This is the single source of truth the UI should read from —
 * don't duplicate this logic in components.
 */
export function getBillingState(dealer) {
  const daysLeft = trialDaysRemaining(dealer.trialStartDate)
  const expired = daysLeft === 0

  if (dealer.billingStatus === "active") {
    return { state: "active", daysLeft: 0, message: "Subscription active — ₹3,000/month" }
  }
  if (dealer.billingStatus === "past_due") {
    return { state: "past_due", daysLeft: 0, message: "Payment failed — update your payment method to keep access" }
  }
  if (dealer.billingStatus === "cancelled") {
    return { state: "cancelled", daysLeft: 0, message: "Subscription cancelled" }
  }
  if (expired) {
    return { state: "trial_expired", daysLeft: 0, message: "Your free month has ended. Add a payment method to continue." }
  }
  return { state: "trial", daysLeft, message: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial` }
}

/** Whether the dealer should be allowed into the app right now. */
export function hasAccess(dealer) {
  const { state } = getBillingState(dealer)
  return state === "trial" || state === "active"
}
