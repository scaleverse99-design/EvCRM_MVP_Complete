export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import dns from "dns/promises"
import net from "net"
import { verifyToken, ok, err } from "../../../../../lib/auth"

// Paste a vehicle page URL, get back structured vehicles — the same idea as
// parse-brochure, but for a web page instead of an uploaded PDF.
//
// ── One important difference from the brochure flow ───────────────────
// A brochure is the dealer's OWN document about vehicles they actually sell,
// so its output can legitimately become their inventory. A page on someone
// else's site is not. Two rules follow:
//
//   1. Extract FACTS ONLY — specs, prices, range. Facts are not
//      copyrightable. Their prose, photos and page structure are, and none
//      of that is copied here.
//   2. The result is a CATALOG candidate, not stock. It says "this model
//      exists at this price", never "this dealer has one". Claiming stock we
//      have not verified is what produced the 990 fabricated dealer records
//      deleted on 2026-08-01, and it is worse here because a buyer would
//      travel somewhere expecting a vehicle.
//
// Nothing is written to any table. Vehicles are returned for a human to
// review and confirm, exactly as parse-brochure does.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_TEXT_CHARS = 60_000
const FETCH_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 3

function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// ⚠️ SSRF GUARD — the reason this route needs care that parse-brochure does
// not. parse-brochure receives bytes the user already had. This one makes OUR
// SERVER fetch a URL the user chose, which means an attacker can aim it at
// things only our server can reach:
//   http://169.254.169.254/  → GCP metadata, including service-account tokens
//   http://localhost:8080/   → internal services
//   http://10.x / 192.168.x  → anything on the private network
// Blocking by string ("does it start with 169.254") is not enough: DNS names
// can resolve to private IPs, and a redirect can jump from a public host to a
// private one. So every hop is resolved and every resolved address checked.
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // link-local / cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    return false
  }
  const v6 = ip.toLowerCase()
  if (v6 === "::1" || v6 === "::") return true
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true // unique-local
  if (v6.startsWith("fe80")) return true // link-local
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7)) // v4-mapped
  return false
}

async function assertPublicUrl(rawUrl) {
  let u
  try { u = new URL(rawUrl) } catch { throw new Error("That doesn't look like a valid URL") }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http(s) links are supported")

  const { address } = await dns.lookup(u.hostname).catch(() => ({ address: null }))
  if (!address) throw new Error(`Could not resolve ${u.hostname}`)
  if (isPrivateAddress(address)) throw new Error("That address is not reachable from here")
  return u
}

// Follows redirects manually so each hop is re-validated — an allowed public
// host redirecting to 169.254.169.254 would otherwise sail straight through.
async function fetchPageHtml(startUrl) {
  let url = await assertPublicUrl(startUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Identify ourselves honestly rather than impersonating a browser.
          "User-Agent": "EvCRM-CatalogBot/1.0 (+https://evcrm.in)",
          "Accept": "text/html,application/xhtml+xml",
        },
      })
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location"), url).toString())
      continue
    }
    if (!res.ok) throw new Error(`The page returned HTTP ${res.status}`)

    const type = res.headers.get("content-type") || ""
    if (!/text\/html|application\/xhtml/.test(type)) throw new Error("That link isn't an HTML page")

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_HTML_BYTES) throw new Error("That page is too large to read")
    return Buffer.from(buf).toString("utf8")
  }
  throw new Error("Too many redirects")
}

// Strip to visible text before sending to the model: scripts and markup are
// most of a modern page's bytes and none of its facts, and we pay per token.
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS)
}

const EXTRACTION_PROMPT = (sourceUrl) => `You are extracting vehicle specifications from a web page for a vehicle CATALOG.

Page URL: ${sourceUrl}

Find every distinct vehicle model/variant described on this page and return them as a JSON array.

CRITICAL RULES:
- Extract ONLY values explicitly stated on the page. Never guess, never infer from the model name, never fill a field from your own knowledge of the vehicle. An empty string / 0 / empty array is the correct answer for anything not stated.
- Do NOT copy sentences, marketing copy or descriptions from the page. Facts only.
- If the page is not about a specific vehicle (a listing index, a news article, a homepage), return an empty array [].
- Prices: convert as written — 'Rs. 18 Lakh' to 1800000, '₹8.5L' to 850000. If a price is a range, use the lower figure. If it is described as starting/ex-showroom, that is exShowroom.

Return strictly valid JSON matching this shape:
[
  {
    "brand": "string",
    "model": "string",
    "variant": "string",
    "type": "4W" | "2W" | "3W",
    "bodyType": "SUV" | "Hatchback" | "Sedan" | "Crossover" | "Scooter" | "Motorcycle" | "Auto",
    "range": number (km, 0 if not stated),
    "batteryCapacity": "string e.g. '40.5 kWh'",
    "topSpeed": number (km/h, 0 if not stated),
    "chargingTime": "string as stated",
    "seatingCapacity": number (0 if not stated),
    "warrantyYears": number (0 if not stated),
    "exShowroom": number (rupees, 0 if not stated),
    "features": ["short feature phrase"]
  }
]

Return ONLY the JSON array, no other text.`

export async function POST(req) {
  const user = getUser(req)
  if (!user) return err("Unauthorized", 401)
  if (!["dealer", "founder", "superadmin"].includes(user.role)) return err("Forbidden", 403)

  if (!GEMINI_API_KEY) {
    return err("URL parsing is not configured yet — no AI key set up. Add vehicles manually for now.", 503)
  }

  const body = await req.json().catch(() => ({}))
  const sourceUrl = String(body.url || "").trim()
  if (!sourceUrl) return err("Paste a vehicle page link first", 400)

  let text
  try {
    text = htmlToText(await fetchPageHtml(sourceUrl))
  } catch (e) {
    return err(`Could not read that page: ${e.message}`, 400)
  }
  if (text.length < 200) return err("That page had almost no readable text — it may need JavaScript to load", 422)

  // Same model order as parse-brochure: this project's key has quota on
  // 2.5-flash and none on 2.0-flash.
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
  let lastError = null

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${EXTRACTION_PROMPT(sourceUrl)}\n\n--- PAGE TEXT ---\n${text}` }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      const out = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!out) throw new Error("Empty AI response")

      const parsed = JSON.parse(out)
      if (!Array.isArray(parsed)) throw new Error("AI did not return a vehicle list")

      // Drop anything with no brand or model — a row that can't name the
      // vehicle is noise, and letting it through means someone confirms a
      // blank catalog entry.
      const vehicles = parsed
        .filter(v => v && String(v.brand || "").trim() && String(v.model || "").trim())
        .slice(0, 25)
        .map(v => ({ ...v, sourceUrl, sourceNote: "Extracted from page — specs unverified, confirm before publishing" }))

      return ok({
        vehicles,
        sourceUrl,
        note: vehicles.length
          ? "Catalog candidates. These describe models, NOT confirmed stock at your dealership — review each before saving."
          : "No vehicle specifications found on that page. Try a specific model/variant page rather than a listing index.",
      })
    } catch (e) {
      lastError = e.message
    }
  }

  return err(`Could not extract vehicles from that page (${lastError || "unknown error"}). Try a different link or add vehicles manually.`, 502)
}
