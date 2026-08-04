export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { getSupabaseAdmin } from "../../lib/supabaseAdmin"

// ── Tracked outbound redirect ─────────────────────────────────────────
//
// Until real dealers onboard, a buyer who lands on evcrm.in and wants to
// purchase has to be sent somewhere that can actually sell them a vehicle —
// CarWale, BikeWale, an OEM site. Sending them raw would be giving traffic
// away. Sending them through here records the click first, which turns the
// dealer conversation from a promise into a receipt:
//
//   "47 people in Vijayawada clicked through from us last month looking for
//    a Nexon EV. They went to CarWale. Onboard and they come to you."
//
// The redirect is not the product. The recorded demand is.
//
// Usage: /go?to=<url>&model=Nexon%20EV&brand=Tata&city=Vijayawada
//
// ── ⚠️ AFFILIATE PROGRAMME RULES — READ BEFORE CHANGING THIS FILE ─────
//
// Some allow-listed destinations (Spinny, and likely Cars24/CarDekho later)
// run affiliate programmes whose terms this route must not breach.
// Violation is stated grounds for termination of the partnership, which
// would cost us both the commission and the referral relationship.
//
// NO COOKIE STUFFING. This is the rule this file can break by accident.
// Cookie stuffing means dropping an affiliate cookie without a real user
// click. This route is compliant today ONLY because it runs on genuine
// navigation. Therefore, never:
//   • add <link rel="prefetch"> or Next.js `prefetch` to any /go link —
//     a prefetch fires the redirect with no human involved, which IS
//     cookie stuffing even though nobody intended it
//   • auto-redirect here on page load, on a timer, or from a useEffect
//   • embed /go in a hidden or zero-size iframe, or fire it as a pixel
// Links to /go must be plain <a> elements the user actually clicks, with
// rel="nofollow sponsored" (`sponsored` is also the correct signal to
// Google for paid/affiliate links).
//
// NO IMPERSONATION, NO BRANDING. Link text says "View on Spinny →" or
// similar — factual reference to where the buyer is going. Never imply the
// listing is ours, that we are the destination, or that we are part of
// them. Do not use their logo, screenshots or listing photos without
// written consent. Never put a partner's name in an email subject or SMS
// header (we send via Resend — mail is from EvCRM, about EvCRM).
//
// NO PAID TRAFFIC INTO THESE LINKS. Spinny's terms bar affiliates from
// search advertising outright (Google/Bing/Yahoo — not merely branded-
// keyword bidding), Meta ads, and native networks like Outbrain/Taboola.
// Organic ranking is NOT advertising and is unaffected, which is fortunate,
// because organic is the entire strategy.
//
// Separately, and regardless of any partner: outreach by SMS or call is
// subject to India's DND / NDNC rules under the TRAI TCCCP framework, and
// penalties fall on the sender. That applies to the dealer phone numbers in
// `dealer_outreach` too — they came from Google Places, not from consent.

// ⚠️ SECURITY: an unvalidated `to` parameter is an OPEN REDIRECT — anyone
// could send evcrm.in/go?to=<phishing-site> and the link would carry our
// domain's trust in an email or a search result. That is a real and commonly
// exploited vulnerability, not a theoretical one.
//
// So destinations are allow-listed by host. Adding a partner means adding a
// line here, deliberately. Never replace this with a regex over the URL, and
// never accept "it starts with https" as validation.
const ALLOWED_HOSTS = new Set([
  // aggregators our catalog links to (products.url / buyUrl)
  "www.bikewale.com", "bikewale.com",
  "www.carwale.com", "carwale.com",
  "www.cardekho.com", "cardekho.com",
  "www.zigwheels.com", "zigwheels.com",
  "www.spinny.com", "spinny.com",
  "www.cars24.com", "cars24.com",
  // OEM sites
  "www.tatamotors.com", "ev.tatamotors.com",
  "www.mahindraelectricsuv.com",
  "www.atherenergy.com", "atherenergy.com",
  "olaelectric.com", "www.olaelectric.com",
  "www.tvsmotor.com", "www.bajajauto.com",
  "www.mgmotor.co.in", "www.hyundai.com",
])

function isAllowed(rawUrl) {
  try {
    const u = new URL(rawUrl)
    // http(s) only — blocks javascript:, data:, and protocol tricks.
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) return null
    return u
  } catch {
    return null
  }
}

// Browsers announce speculative fetches. Enforcing the no-cookie-stuffing
// rule here rather than trusting every future contributor to remember it:
// if this request wasn't caused by a human, we neither redirect (which
// would drop the partner's affiliate cookie without a click) nor log it
// (which would inflate the click counts we show dealers). The real click
// re-requests and is handled normally.
function isSpeculativeFetch(req) {
  const h = req.headers
  const purpose = `${h.get("sec-purpose") || ""} ${h.get("purpose") || ""} ${h.get("x-purpose") || ""}`.toLowerCase()
  if (/prefetch|prerender|preview/.test(purpose)) return true
  // Next.js router prefetches carry this; a user click never does.
  if (h.get("next-router-prefetch") === "1") return true
  return false
}

export async function GET(req) {
  if (isSpeculativeFetch(req)) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
  }

  const { searchParams } = new URL(req.url)
  const to = searchParams.get("to")
  if (!to) return Response.redirect("https://evcrm.in/showroom", 302)

  const dest = isAllowed(to)
  if (!dest) {
    console.warn("[go] blocked redirect to non-allowlisted destination:", String(to).slice(0, 200))
    // Send them somewhere real on our own site rather than erroring — a
    // blocked destination is our configuration problem, not the user's.
    return Response.redirect("https://evcrm.in/showroom", 302)
  }

  // Record, then redirect. Awaited deliberately: this write IS the reason the
  // route exists, and a redirect that loses the click is worse than one that
  // takes an extra few milliseconds. Failures are swallowed — a logging
  // problem must never strand a buyer who is trying to go and buy something.
  try {
    const sb = getSupabaseAdmin()
    if (sb) {
      await sb.from("outbound_clicks").insert({
        destination_host: dest.hostname,
        model: searchParams.get("model")?.slice(0, 120) || null,
        brand: searchParams.get("brand")?.slice(0, 60) || null,
        city: searchParams.get("city")?.slice(0, 80) || null,
        page_path: searchParams.get("from")?.slice(0, 200) || null,
      })
    }
  } catch (e) {
    console.error("[go] click log failed (redirect still served):", e.message)
  }

  return Response.redirect(dest.toString(), 302)
}
