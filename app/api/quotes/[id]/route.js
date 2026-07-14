/**
 * Public quote API — no auth required.
 * Customers access quotes via a shareable link the dealer sends.
 */
import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../../lib/store"

export async function GET(req, { params }) {
  const { id } = params
  const quotes = await readTable("quotes")
  const idx = quotes.findIndex(q => q.id === id)
  if (idx === -1) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

  const q = quotes[idx]

  // Track opens if not a preview URL
  const { searchParams } = new URL(req.url)
  const isPreview = searchParams.get("preview") === "true"

  if (!isPreview) {
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
  return NextResponse.json({ success: true, quote: quotes[idx] })
}
