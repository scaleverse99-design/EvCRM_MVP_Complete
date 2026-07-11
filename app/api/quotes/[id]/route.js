/**
 * Public quote API — no auth required.
 * Customers access quotes via a shareable link the dealer sends.
 */
import { NextResponse } from "next/server"
import { readTable, writeTable } from "../../../../lib/store"

export async function GET(req, { params }) {
  const { id } = params
  const quotes = await readTable("quotes")
  const quote = quotes.find(q => q.id === id)
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

  // Strip internal dealer fields before returning to customer
  const { createdBy, receipt, ...safeQuote } = quote
  const hasReceipt = !!receipt
  return NextResponse.json({ success: true, quote: { ...safeQuote, hasReceipt } })
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
