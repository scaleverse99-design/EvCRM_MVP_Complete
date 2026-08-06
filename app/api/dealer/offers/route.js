import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import { announceOfferAndReengage } from "../../../../lib/orchestrator/offerEngine.js"

// GET /api/dealer/offers?dealership=X — list offers a dealer has announced
export async function GET(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dealership = searchParams.get("dealership")

  let offers = await readTable("dealer_offers").catch(() => [])
  if (dealership) offers = offers.filter(o => o.dealership === dealership)
  offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ success: true, offers })
}

// POST /api/dealer/offers — announce a new offer. Triggers the
// re-engagement scan immediately: every eligible rejected/unanswered quote
// gets re-priced, the dealer/rep gets a feed notification, and the
// customer gets an email (if we have one) plus a ready WhatsApp resend link.
export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { dealership, title, discountAmount, applicableVehicle, windowDays, validDays } = body

  if (!dealership || !title || !discountAmount) {
    return NextResponse.json({ error: "dealership, title, and discountAmount are required" }, { status: 400 })
  }

  try {
    const result = await announceOfferAndReengage({ dealership, title, discountAmount, applicableVehicle, windowDays, validDays })

    // Persist the offer itself for the dealer's own history/reference.
    const offers = await readTable("dealer_offers").catch(() => [])
    const record = {
      id: `offer_${Date.now()}`,
      dealership,
      title,
      discountAmount,
      applicableVehicle: applicableVehicle || null,
      windowDays: windowDays || 60,
      validDays: validDays || 7,
      createdBy: user.email || user.sub,
      createdAt: new Date().toISOString(),
      reengagement: {
        matchedCount: result.matchedCount,
        updatedCount: result.updatedCount,
        emailsSent: result.emailsSent,
      },
    }
    offers.push(record)
    await writeTable("dealer_offers", offers)

    return NextResponse.json({ success: true, offer: record, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
