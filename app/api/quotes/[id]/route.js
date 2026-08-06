/**
 * Public quote API — no auth required.
 * Customers access quotes via a shareable link the dealer sends.
 */
import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../../lib/store"
import { expireOfferIfNeeded } from "../../../../lib/orchestrator/offerEngine.js"

// Writes straight to the same "feed" table the dealer dashboard already
// polls every 30s (app/api/dealer/feed/route.js) — no email/SMS/WhatsApp
// API needed, this is what puts a quote event in front of the dealer.
async function pushFeedEvent(quote, { type, label, msg, sub, icon, color }) {
  if (!quote?.dealership) return
  const feed = await readTable("feed")
  feed.unshift({
    id: `feed_${Date.now()}`,
    dealership: quote.dealership,
    type,
    label,
    msg,
    sub,
    icon,
    color,
    actionLabel: "View Quote",
    leadId: quote.leadId || null,
    quoteId: quote.id,
    created_at: new Date().toISOString(),
  })
  await writeTable("feed", feed)
}

export async function GET(req, { params }) {
  const { id } = params
  const quotes = await readTable("quotes")
  const idx = quotes.findIndex(q => q.id === id)
  if (idx === -1) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

  const q = quotes[idx]

  // Lazy offer expiry — checked on every read since there's no always-on
  // background worker. If this quote's active offer has passed its
  // validDays window, revert to the original price right here before
  // anyone (customer or dealer) sees a stale discounted price. Runs even
  // on preview loads, since a dealer previewing should see the real
  // current price too, not an expired one.
  if (expireOfferIfNeeded(q)) {
    await writeTable("quotes", quotes)
  }

  // Track opens if not a preview URL
  const { searchParams } = new URL(req.url)
  const isPreview = searchParams.get("preview") === "true"

  if (!isPreview) {
    const isFirstOpen = !q.openedCount
    q.openedCount = (q.openedCount || 0) + 1
    q.lastOpenedAt = new Date().toISOString()

    const ua = req.headers.get("user-agent") || ""
    const isMobile = /mobile/i.test(ua)
    const device = isMobile ? "Mobile" : "Desktop"
    q.openedDevices = Array.from(new Set([...(q.openedDevices || []), device]))

    if (!q.viewLogs) q.viewLogs = []
    q.viewLogs.push({
      timestamp: new Date().toISOString(),
      userAgent: ua.slice(0, 100),
      ip: req.headers.get("x-forwarded-for")?.split(",")?.[0] || req.headers.get("x-real-ip") || "unknown"
    })

    await writeTable("quotes", quotes)

    // Only fire once per quote — every 30s dashboard poll would otherwise
    // re-surface this on every reload since openedCount keeps climbing.
    if (isFirstOpen) {
      await pushFeedEvent(q, {
        type: "QUOTE_OPENED",
        label: "QUOTE OPENED",
        msg: `${q.customerName || "Customer"} opened their quote for ${q.vehicleName || "the vehicle"}`,
        sub: device,
        icon: "👀",
        color: "#2563EB",
      })
    }
  }

  // Strip internal dealer fields before returning to customer
  const { createdBy, receipt, ...safeQuote } = q
  const hasReceipt = !!receipt
  return NextResponse.json({ success: true, quote: { ...safeQuote, hasReceipt } })
}

export async function POST(req, { params }) {
  const { id } = params
  const body = await req.json()
  const { event, value, sectionId } = body

  const quotes = await readTable("quotes")
  const idx = quotes.findIndex(q => q.id === id)
  if (idx === -1) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

  const q = quotes[idx]

  if (event === "scroll") {
    const pct = parseInt(value)
    if (!isNaN(pct)) {
      q.maxScrollPercent = Math.max(q.maxScrollPercent || 0, pct)
    }
  } else if (event === "section_view") {
    if (sectionId) {
      if (!q.viewedSections) q.viewedSections = {}
      q.viewedSections[sectionId] = new Date().toISOString()
      q.dropOffSection = sectionId
    }
  } else if (event === "add_comment") {
    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      lineId: body.lineId || "general",
      text: body.text || "",
      author: body.author || "customer",
      createdAt: new Date().toISOString()
    }
    q.comments = [...(q.comments || []), comment]
  } else {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 })
  }

  await writeTable("quotes", quotes)

  if (event === "add_comment" && (body.author || "customer") === "customer") {
    await pushFeedEvent(q, {
      type: "QUOTE_QUESTION",
      label: "CUSTOMER ASKED A QUESTION",
      msg: `${q.customerName || "Customer"} asked about "${body.lineId || "the quote"}"`,
      sub: (body.text || "").slice(0, 80),
      icon: "❓",
      color: "#F59E0B",
    })
  }

  return NextResponse.json({ success: true, quote: q })
}

export async function PATCH(req, { params }) {
  const { id } = params
  const body = await req.json()

  const quotes = await readTable("quotes")
  const idx = quotes.findIndex(q => q.id === id)
  if (idx === -1) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

  const { action } = body

  if (action === "agree") {
    quotes[idx].customerResponse = "agreed"
    quotes[idx].customerAgreedAt = new Date().toISOString()

  } else if (action === "not_agreed") {
    quotes[idx].customerResponse = "not_agreed"
    quotes[idx].customerFeedback = body.feedback || ""
    quotes[idx].rejectionReasons = body.rejectionReasons || []
    quotes[idx].customerRespondedAt = new Date().toISOString()

  } else if (action === "upload_kyc") {
    quotes[idx].kycDocs = { ...(quotes[idx].kycDocs || {}), ...body.docs }
    quotes[idx].kycSubmittedAt = new Date().toISOString()
    quotes[idx].customerResponse = "docs_uploaded"

  } else if (action === "delete_docs") {
    quotes[idx].kycDocs = {}
    quotes[idx].kycDeletedAt = new Date().toISOString()
    if (quotes[idx].customerResponse === "docs_uploaded") {
      quotes[idx].customerResponse = "agreed"
    }

  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  await writeTable("quotes", quotes)

  const q = quotes[idx]
  if (action === "agree") {
    await pushFeedEvent(q, {
      type: "QUOTE_ACCEPTED",
      label: "QUOTE ACCEPTED",
      msg: `${q.customerName || "Customer"} accepted the quote for ${q.vehicleName || "the vehicle"} — close this deal!`,
      sub: "Awaiting KYC docs",
      icon: "✅",
      color: "#059669",
    })
  } else if (action === "not_agreed") {
    const reasonLabels = { price:"Price too high", finance:"Financing/EMI terms", delivery:"Delivery delay", variant:"Variant/color unavailable", competitor:"Competitor offer", other:"Other" }
    const reasons = (q.rejectionReasons || []).map(r => reasonLabels[r] || r).join(", ") || "No reason given"
    await pushFeedEvent(q, {
      type: "QUOTE_REJECTED",
      label: "QUOTE HAS CONCERNS",
      msg: `${q.customerName || "Customer"} raised concerns on ${q.vehicleName || "the quote"}: ${reasons}`,
      sub: q.customerFeedback || "",
      icon: "⚠️",
      color: "#EF4444",
    })
  } else if (action === "upload_kyc") {
    await pushFeedEvent(q, {
      type: "KYC_UPLOADED",
      label: "KYC DOCUMENTS UPLOADED",
      msg: `${q.customerName || "Customer"} uploaded KYC documents — ready for delivery paperwork`,
      sub: `${Object.keys(q.kycDocs || {}).length} document(s)`,
      icon: "📄",
      color: "#059669",
    })
  }

  return NextResponse.json({ success: true, quote: quotes[idx] })
}
