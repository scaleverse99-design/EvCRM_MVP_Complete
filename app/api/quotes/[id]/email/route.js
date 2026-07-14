import { NextResponse } from "next/server"
import { readTable } from "../../../../../lib/store"
import { sendQuoteEmail } from "../../../../../lib/email"

export async function POST(req, { params }) {
  const { id } = params
  try {
    const body = await req.json()
    const { to } = body
    if (!to) return NextResponse.json({ error: "Recipient email is required" }, { status: 400 })

    const quotes = await readTable("quotes")
    const quote = quotes.find(q => q.id === id)
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

    const host = process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"
    const link = `${host}/quote/${quote.id}`

    await sendQuoteEmail({
      to,
      customerName: quote.customerName,
      vehicleName: quote.vehicleName,
      netPrice: quote.netPrice || 0,
      link,
      dealerName: quote.dealerName || "EV Dealer"
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Email Dispatch Error]", err)
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 })
  }
}
