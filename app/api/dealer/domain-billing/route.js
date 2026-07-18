export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../../lib/store"
import { verifyToken } from "../../../../lib/auth"

const CUSTOM_DOMAIN_SETUP_FEE = 1000 // ₹1,000
const CUSTOM_DOMAIN_MONTHLY_FEE = 100 // ₹100/month

// ── POST /api/dealer/domain-billing ──────────────────────────────────
// Process billing for custom domain (setup fee + recurring charge)
// Body: { dealership, customDomain }
export async function POST(req) {
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== "dealer") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { dealership, customDomain } = body

    if (!customDomain) {
      return Response.json({ error: "Custom domain required" }, { status: 400 })
    }

    // Read dealer to verify
    const users = await readTable("users")
    const dealer = users.find(u => u.dealership === dealership && u.id === decoded.userId)

    if (!dealer) {
      return Response.json({ error: "Dealer not found" }, { status: 403 })
    }

    // Check if already has billing record for this domain
    const billingRecords = await readTable("domain_billing").catch(() => [])
    const existing = billingRecords.find(b => b.dealership === dealership && b.domain === customDomain)

    if (existing && existing.setupFeePaid) {
      return Response.json({
        success: true,
        message: "Domain billing already processed",
        domain: customDomain,
        setupFee: CUSTOM_DOMAIN_SETUP_FEE,
        monthlyFee: CUSTOM_DOMAIN_MONTHLY_FEE,
      })
    }

    // Create billing record for this domain
    const billingId = `domain_${dealership}_${Date.now()}`
    const billingRecord = {
      id: billingId,
      dealership,
      domain: customDomain,
      setupFee: CUSTOM_DOMAIN_SETUP_FEE,
      monthlyFee: CUSTOM_DOMAIN_MONTHLY_FEE,
      setupFeePaid: false, // Will be set to true after Razorpay charge
      recurringActive: false,
      createdAt: new Date().toISOString(),
      chargeHistory: [],
    }

    // In production with live Razorpay keys, this would trigger a real charge
    // For now, we create the record and log that it's pending payment
    console.log(`[domain-billing] Created billing record for ${customDomain}`, billingRecord)

    // Append to billing records
    const updatedBilling = [...billingRecords, billingRecord]
    await writeTable("domain_billing", updatedBilling)

    // Update dealer to mark domain billing as initiated
    const updatedUsers = users.map(u => {
      if (u.dealership === dealership && u.role === "dealer") {
        return {
          ...u,
          customDomainBillingId: billingId,
          customDomainBillingStatus: "pending_payment"
        }
      }
      return u
    })
    await writeTable("users", updatedUsers)

    return Response.json({
      success: true,
      message: "Domain billing initiated. Setup fee (₹1,000) will be charged.",
      billingId,
      domain: customDomain,
      setupFee: CUSTOM_DOMAIN_SETUP_FEE,
      monthlyFee: CUSTOM_DOMAIN_MONTHLY_FEE,
      billingStatus: "pending_payment"
    })
  } catch (error) {
    console.error("[/api/dealer/domain-billing]", error.message)
    return Response.json(
      { error: "Billing setup failed: " + error.message },
      { status: 500 }
    )
  }
}

// ── GET /api/dealer/domain-billing?dealership=... ──────────────────────
// Get billing records for a dealer's custom domains
export async function GET(req) {
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== "dealer") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const dealership = url.searchParams.get("dealership")

    if (!dealership) {
      return Response.json({ error: "Dealership required" }, { status: 400 })
    }

    // Verify dealer owns this dealership
    const users = await readTable("users")
    const dealer = users.find(u => u.dealership === dealership && u.id === decoded.userId)

    if (!dealer) {
      return Response.json({ error: "Unauthorized" }, { status: 403 })
    }

    const billingRecords = await readTable("domain_billing").catch(() => [])
    const dealerBilling = billingRecords.filter(b => b.dealership === dealership)

    return Response.json({
      success: true,
      billing: dealerBilling,
      summary: {
        activeDomains: dealerBilling.filter(b => b.setupFeePaid).length,
        monthlyRecurringTotal: dealerBilling.filter(b => b.recurringActive).length * CUSTOM_DOMAIN_MONTHLY_FEE,
      }
    })
  } catch (error) {
    console.error("[/api/dealer/domain-billing GET]", error.message)
    return Response.json(
      { error: "Failed to fetch billing records" },
      { status: 500 }
    )
  }
}
