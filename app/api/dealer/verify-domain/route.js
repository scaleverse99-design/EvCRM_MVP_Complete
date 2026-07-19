export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../../lib/store"
import { verifyToken } from "../../../../lib/auth"
import dns from "dns"
import { promisify } from "util"

const resolveCname = promisify(dns.resolveCname)

// ── PATCH /api/dealer/verify-domain ──────────────────────────────────
// Verify a custom domain's CNAME record points to evcrm.in
// Body: { dealership, customDomain }
export async function PATCH(req) {
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== "dealer") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { dealership, customDomain } = body

    if (!customDomain || !customDomain.trim()) {
      return Response.json({ error: "Domain is required" }, { status: 400 })
    }

    const domain = customDomain.trim().toLowerCase()

    // Validate domain format (basic check)
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/.test(domain)) {
      return Response.json({ error: "Invalid domain format" }, { status: 400 })
    }

    // Read dealer to verify ownership. Ownership is checked against the
    // JWT's `dealership` claim, not a user-id match — generateToken()
    // (lib/auth.js) signs the id under the standard `sub` claim, not
    // `userId`, so a `decoded.userId` comparison here always failed with a
    // false 403 (found while building the sell-car-toggle endpoint, which
    // copied this exact pattern — see app/api/dealer/sell-car-toggle).
    if (!dealership || decoded.dealership !== dealership) {
      return Response.json({ error: "Dealer not found or unauthorized" }, { status: 403 })
    }

    const users = await readTable("users")
    const dealer = users.find(u => u.dealership === dealership && u.role === "dealer")
    if (!dealer) {
      return Response.json({ error: "Dealer not found" }, { status: 404 })
    }

    // Check if domain is already taken by another dealer
    const existingDomain = users.find(u => u.customDomain?.toLowerCase() === domain && u.dealership !== dealership)
    if (existingDomain) {
      return Response.json({ error: "This domain is already registered to another dealer" }, { status: 409 })
    }

    try {
      // Verify CNAME record points to evcrm.in
      const cnames = await resolveCname(domain)
      const hasValidCname = cnames?.some(cname =>
        cname.toLowerCase().includes("evcrm.in") ||
        cname.toLowerCase() === "evcrm.in."
      )

      if (!hasValidCname) {
        return Response.json({
          error: `CNAME record not pointing to evcrm.in. Found: ${cnames?.join(", ") || "none"}`
        }, { status: 400 })
      }
    } catch (dnsErr) {
      // DNS lookup failed — might be temporary or domain doesn't exist
      console.error(`[verify-domain] DNS lookup failed for ${domain}:`, dnsErr.message)
      return Response.json({
        error: `DNS verification failed. Please ensure CNAME is added and DNS propagated (wait 5-10 minutes). Error: ${dnsErr.message}`
      }, { status: 400 })
    }

    // Update dealer record with verified custom domain
    const updatedDealers = users.map(u => {
      if (u.dealership === dealership && u.role === "dealer") {
        return {
          ...u,
          customDomain: domain,
          customDomainVerified: true,
          customDomainVerifiedAt: new Date().toISOString(),
          customDomainBillingStatus: "verified" // Ready for billing
        }
      }
      return u
    })

    await writeTable("users", updatedDealers)

    // Trigger billing for setup fee + monthly recurring
    // (This would integrate with Razorpay in production)
    try {
      const billingRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://evcrm.in"}/api/dealer/domain-billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ dealership, customDomain: domain })
      })
      const billingData = await billingRes.json()
      console.log("[verify-domain] Billing initiated:", billingData)
    } catch (billingErr) {
      console.error("[verify-domain] Billing initiation failed:", billingErr.message)
      // Don't fail domain verification if billing fails — can be retried later
    }

    return Response.json({
      success: true,
      message: "Domain verified successfully!",
      domain,
      billingStatus: "Setup fee (₹1,000) + monthly fee (₹100) will be processed",
      nextSteps: "Billing has been initiated. Check your dashboard for payment instructions."
    })
  } catch (error) {
    console.error("[/api/dealer/verify-domain]", error.message)
    return Response.json(
      { error: "Verification failed: " + error.message },
      { status: 500 }
    )
  }
}
