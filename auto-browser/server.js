/**
 * EvCRM Auto Browser Server — Azure Container App
 *
 * HTTP API that accepts a crawl request, launches headless Chromium,
 * renders the target page, extracts clean facts, and returns structured
 * data. No LLM. No AI. Deterministic extraction only.
 *
 * POST /crawl
 *   Body: { url: string, query: string }
 *   Returns: { facts, markdown, sourceUrl, fetchedAt }
 *
 * POST /health
 *   Returns: { status: "ok" }
 *
 * Security: Only crawls URLs from the whitelist (ALLOWED_DOMAINS env var
 * or hardcoded Indian auto site list). Refuses all other domains.
 */

import express from "express"
import { chromium } from "playwright-core"

const app = express()
app.use(express.json({ limit: "1mb" }))

const PORT = process.env.PORT || 8080

// ── Allowed domain whitelist ─────────────────────────────────────────────
// Only these Indian automobile sites can be crawled.
const ALLOWED_DOMAINS = new Set([
  "tatamotors.com", "mgmotor.co.in", "hyundai.com", "kia.com",
  "mahindra.com", "marutisuzuki.com", "renaultindia.com", "toyotabharat.com",
  "hondacarindia.com", "vw.co.in", "skoda-auto.co.in", "jeepindia.com",
  "bmwindia.com", "atherspace.in", "olaelectric.com", "heroelectric.in",
  "revolt.co.in", "bajajchetak.com", "ampereev.com",
  "carwale.com", "cardekho.com", "zigwheels.com", "91wheels.com",
  "bikewale.com", "gaadi.com", "cars24.com", "spinny.com", "droom.in",
  "team-bhp.com", "autocarindia.com", "rushlane.com", "motorbeam.com",
  "overdrive.in", "drivespark.com", "cartoq.com", "v3cars.com",
  "indianautosblog.com", "autoportal.com", "autox.com", "bikedekho.com",
])

function isAllowed(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return ALLOWED_DOMAINS.has(host)
  } catch {
    return false
  }
}

// ── Price & spec extractors (deterministic, no LLM) ──────────────────────

/** Extracts all INR price mentions from plain text. */
function extractPrices(text) {
  const results = []
  // ₹X.XX Lakh / Rs. X.XX Lakh
  const lakhRe = /(?:₹|rs\.?)\s*([\d,]+(?:\.\d+)?)\s*lakh/gi
  // ₹X,XX,XXX absolute
  const absRe = /(?:₹|rs\.?)\s*([\d,]{5,})/gi

  let m
  while ((m = lakhRe.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, "")) * 100000
    if (Number.isFinite(val) && val > 50000) results.push(Math.round(val))
  }
  if (!results.length) {
    while ((m = absRe.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ""))
      if (Number.isFinite(val) && val > 50000 && val < 200000000) results.push(Math.round(val))
    }
  }
  return [...new Set(results)]
}

/** Extracts JSON-LD Product offers from raw HTML. */
function extractJsonLdPrices(html) {
  const prices = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        const offers = item.offers || (item["@graph"] || []).flatMap(n => n.offers || [])
        const offerList = Array.isArray(offers) ? offers : [offers]
        for (const o of offerList) {
          if (!o) continue
          const price = parseFloat(String(o.price || "").replace(/,/g, ""))
          if (Number.isFinite(price) && price > 50000) prices.push(Math.round(price))
        }
      }
    } catch { /* skip malformed */ }
  }
  return prices
}

/** Converts HTML to clean readable text (no external libraries needed). */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")   // remove scripts
    .replace(/<style[\s\S]*?<\/style>/gi, "")      // remove styles
    .replace(/<[^>]+>/g, " ")                       // strip tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
}

// ── Shared browser instance ───────────────────────────────────────────────
let browser = null

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins",
      ],
    })
  }
  return browser
}

// ── Routes ───────────────────────────────────────────────────────────────

app.get("/health", (_, res) => res.json({ status: "ok", service: "evcrm-auto-browser" }))

app.post("/crawl", async (req, res) => {
  const { url, query } = req.body || {}

  if (!url) return res.status(400).json({ error: "url is required" })
  if (!isAllowed(url)) return res.status(403).json({ error: "domain not in whitelist" })

  const fetchedAt = new Date().toISOString()
  let page = null

  try {
    const b = await getBrowser()
    page = await b.newPage()

    // Realistic browser headers — avoids bot detection
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    })
    await page.setViewportSize({ width: 1280, height: 800 })

    // Navigate and wait for content
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })

    // Wait a moment for JS-rendered price widgets to load
    await page.waitForTimeout(1500)

    const html = await page.content()
    const text = htmlToText(html)

    // Extract prices from JSON-LD first (most reliable), then visible text
    const jsonLdPrices = extractJsonLdPrices(html)
    const textPrices = extractPrices(text)
    const allPrices = [...new Set([...jsonLdPrices, ...textPrices])]

    // Build facts from extracted prices
    const facts = allPrices.slice(0, 5).map(price => ({
      metric: "price",
      value: price,
      unit: "INR",
      scope: query || url,
      sourceName: new URL(url).hostname,
      sourceUrl: url,
      fetchedAt,
    }))

    // Return a short excerpt of clean text (first 2000 chars) for debugging
    const excerpt = text.slice(0, 2000)

    return res.json({ facts, excerpt, sourceUrl: url, fetchedAt, pricesFound: allPrices.length })

  } catch (err) {
    return res.status(500).json({ error: err.message, sourceUrl: url })
  } finally {
    if (page) await page.close().catch(() => {})
  }
})

// ── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`EvCRM Auto Browser listening on port ${PORT}`)
  // Pre-warm browser on startup so first request is faster
  getBrowser().then(() => console.log("Chromium ready")).catch(console.error)
})
