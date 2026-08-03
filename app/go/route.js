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

export async function GET(req) {
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
