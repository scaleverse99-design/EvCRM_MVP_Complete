/**
 * Offer re-engagement engine.
 *
 * The problem this solves: a dealer announces a new discount, but every
 * quote a customer already said no to (or never responded to) just sits
 * dead — the dealer has no way to know "this new offer would change 8
 * people's minds" without manually re-checking every rejected quote by
 * hand. This automates that check.
 *
 * Deliberately does NOT touch quotes already "agreed"/"docs_uploaded" —
 * those are won, re-pricing a closed deal would be actively harmful.
 * Only rejected or never-responded quotes are eligible, and only within
 * a bounded recency window (default 60 days) — an offer should not
 * resurrect a lead from a year ago as if it were fresh.
 *
 * Two rules that matter and were wrong in the first version of this file:
 *
 * 1. NEVER STACK. Every offer computes its discount from the quote's
 *    ORIGINAL price (captured once, on first offer, and never touched
 *    again) — not from whatever the current displayed price happens to
 *    be. A ₹10k offer today and a ₹15k offer next week must each mean
 *    "original minus 15k", never "original minus 25k". Without this, a
 *    customer who got two separate offers over time ends up expecting
 *    both discounts combined ("we need both") — a real pricing/margin
 *    bug for the dealer, not just a UX confusion.
 *
 * 2. OFFERS EXPIRE. A dealer's "2-day flash discount" must stop applying
 *    after 2 days — the quote should fall back to its original price,
 *    not stay discounted forever. There's no always-on background worker
 *    in this app, so expiry is checked LAZILY: every time a quote is read
 *    (app/api/quotes/[id]/route.js GET), if its active offer has expired,
 *    the price is reverted to original right there before returning it —
 *    correct at the moment anyone actually looks, with no cron dependency.
 */

import { readTable, writeTable } from "../store.js"
import { sendQuoteEmail } from "../email.js"

const DEFAULT_WINDOW_DAYS = 60
const DEFAULT_OFFER_VALID_DAYS = 7

/**
 * Reverts a quote to its original price if its active offer has expired.
 * Called lazily from the quote GET route — no cron needed. Returns the
 * quote unchanged if there's no active offer or it hasn't expired yet.
 * Mutates in place and returns true if a revert happened (caller persists).
 */
export function expireOfferIfNeeded(quote) {
  if (!quote.offerExpiresAt) return false
  if (new Date(quote.offerExpiresAt).getTime() > Date.now()) return false // still valid

  const expiredOffer = quote.offer
  const priceBeforeRevert = quote.netPrice

  quote.netPrice = quote.originalNetPrice ?? quote.netPrice
  quote.offer = null
  quote.offerExpiresAt = null
  quote.priceHistory = quote.priceHistory || []
  quote.priceHistory.push({
    previousPrice: priceBeforeRevert,
    newPrice: quote.netPrice,
    reason: `Offer expired: ${expiredOffer}`,
    at: new Date().toISOString(),
  })
  return true
}

function pushFeedEvent(feed, { dealership, type, label, msg, sub, icon, color, quoteId, leadId }) {
  feed.unshift({
    id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    dealership,
    type,
    label,
    msg,
    sub,
    icon,
    color,
    actionLabel: "View Quote",
    leadId: leadId || null,
    quoteId: quoteId || null,
    created_at: new Date().toISOString(),
  })
}

/**
 * @param {object} offer
 * @param {string} offer.dealership
 * @param {string} offer.title - e.g. "₹15,000 off all Ather 450X this week"
 * @param {number} offer.discountAmount - flat rupee amount taken off the quote's ORIGINAL price (never stacks with a prior offer)
 * @param {string} [offer.applicableVehicle] - substring match against vehicleName, case-insensitive. Omit to apply to all vehicles.
 * @param {number} [offer.windowDays] - how far back to look for eligible quotes, default 60
 * @param {number} [offer.validDays] - how many days this offer itself stays valid before auto-expiring back to original price, default 7
 */
export async function announceOfferAndReengage(offer) {
  const { dealership, title, discountAmount, applicableVehicle, windowDays = DEFAULT_WINDOW_DAYS, validDays = DEFAULT_OFFER_VALID_DAYS } = offer

  if (!dealership) throw new Error("dealership is required")
  if (!title) throw new Error("title is required")
  if (!discountAmount || discountAmount <= 0) throw new Error("discountAmount must be a positive number")

  const cutoff = Date.now() - windowDays * 86400_000
  const offerExpiresAt = new Date(Date.now() + validDays * 86400_000).toISOString()
  const quotes = await readTable("quotes")
  const feed = await readTable("feed")

  const eligible = quotes.filter(q => {
    if (q.dealership !== dealership) return false
    if (q.customerResponse === "agreed" || q.customerResponse === "docs_uploaded") return false // won, don't touch
    if (new Date(q.createdAt || 0).getTime() < cutoff) return false
    if (applicableVehicle && !String(q.vehicleName || "").toLowerCase().includes(applicableVehicle.toLowerCase())) return false
    return true
  })

  const updated = []
  const emailResults = []

  for (const q of eligible) {
    const idx = quotes.findIndex(x => x.id === q.id)
    if (idx === -1) continue

    // Any still-active offer on this quote gets replaced, not stacked — a
    // new offer always wins immediately rather than waiting for the old
    // one to expire first. Baseline is set ONCE, ever, on the very first
    // offer this quote receives — every later offer computes from that
    // same original number, no matter how many offers came in between.
    if (quotes[idx].originalNetPrice == null) {
      quotes[idx].originalNetPrice = quotes[idx].netPrice
    }
    const originalPrice = quotes[idx].originalNetPrice
    const previousPrice = quotes[idx].netPrice
    // Always subtract from ORIGINAL, never from previousPrice — this is
    // the fix. A second offer replaces the first rather than compounding.
    const newPrice = Math.max(0, originalPrice - discountAmount)

    quotes[idx].priceHistory = quotes[idx].priceHistory || []
    quotes[idx].priceHistory.push({
      previousPrice,
      newPrice,
      reason: title,
      at: new Date().toISOString(),
    })
    quotes[idx].netPrice = newPrice
    quotes[idx].offer = title
    quotes[idx].offerExpiresAt = offerExpiresAt
    quotes[idx].reEngagedAt = new Date().toISOString()
    // A stale rejection shouldn't stay flagged forever once we've re-priced
    // and re-reached out — give the customer a fresh look at the new price.
    if (quotes[idx].customerResponse === "not_agreed") {
      quotes[idx].customerResponse = "re_offered"
    }

    updated.push(quotes[idx])

    // Notify the dealer/rep — same feed mechanism the dashboard already polls.
    pushFeedEvent(feed, {
      dealership,
      type: "OFFER_REENGAGEMENT",
      label: "OFFER MATCH — RE-ENGAGE",
      msg: `${quotes[idx].customerName || "Customer"}'s price on ${quotes[idx].vehicleName} dropped to ₹${newPrice.toLocaleString("en-IN")} — reach out again`,
      sub: title,
      icon: "🔥",
      color: "#F59E0B",
      quoteId: quotes[idx].id,
      leadId: quotes[idx].leadId,
    })

    // Notify the customer directly by email (best-effort — a failed send
    // here must not break the rest of the batch or the dealer's feed
    // notification, which already landed).
    if (quotes[idx].customerEmail) {
      try {
        await sendQuoteEmail({
          to: quotes[idx].customerEmail,
          customerName: quotes[idx].customerName,
          vehicleName: quotes[idx].vehicleName,
          netPrice: newPrice,
          link: `${process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"}/quote/${quotes[idx].id}`,
          dealerName: quotes[idx].dealerName,
        })
        emailResults.push({ quoteId: quotes[idx].id, sent: true })
      } catch (e) {
        emailResults.push({ quoteId: quotes[idx].id, sent: false, error: e.message })
      }
    }
  }

  if (updated.length) {
    await writeTable("quotes", quotes)
    await writeTable("feed", feed)
  }

  // WhatsApp resend links — no API cost, dealer taps to open WhatsApp with
  // the message prefilled, same manual pattern QuotePro already uses.
  const whatsappLinks = updated.map(q => {
    const lines = [
      `*Good news!* Price update on your ${q.vehicleName}`,
      `New price: ₹${q.netPrice.toLocaleString("en-IN")}`,
      `Offer: ${title}`,
      `View updated quote: ${process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"}/quote/${q.id}`,
    ].join("\n")
    return {
      quoteId: q.id,
      customerName: q.customerName,
      waLink: `https://wa.me/${(q.customerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(lines)}`,
    }
  })

  return {
    offerTitle: title,
    matchedCount: eligible.length,
    updatedCount: updated.length,
    emailsSent: emailResults.filter(r => r.sent).length,
    emailsFailed: emailResults.filter(r => !r.sent).length,
    whatsappLinks,
  }
}
