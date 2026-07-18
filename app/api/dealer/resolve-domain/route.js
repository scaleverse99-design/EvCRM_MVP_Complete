export const dynamic = "force-dynamic"

import { readTable } from "../../../../lib/store"

// ── GET /api/dealer/resolve-domain?domain=ramdealers.evcrm.in ────────────
// Resolves a subdomain or custom domain to a dealer's public profile
// Returns: { dealership, dealershipName, city, phone, email, dealerSubdomain, customDomain, inventoryCount, message }
export async function GET(req) {
  try {
    const url = new URL(req.url)
    let domain = url.searchParams.get("domain")

    // If no domain param, try to get from Host header (fallback for direct requests)
    if (!domain) {
      domain = req.headers.get("host") || ""
    }

    if (!domain) {
      return Response.json(
        { error: "No domain provided" },
        { status: 400 }
      )
    }

    // Extract subdomain/domain part (remove port if present)
    domain = domain.split(":")[0].toLowerCase()

    // Extract the prefix (e.g., "ramdealers" from "ramdealers.evcrm.in")
    let prefix = ""

    if (domain.endsWith(".evcrm.in")) {
      // Subdomain: "ramdealers.evcrm.in"
      prefix = domain.replace(".evcrm.in", "")
    } else {
      // Custom domain: could be "ramdealers.in" or any custom domain
      // For now, treat entire domain as potential custom domain
      prefix = domain.split(".")[0] // Take first part as fallback
    }

    // Read all users to find matching dealer
    const users = await readTable("users")
    const inventory = await readTable("inventory")

    // Search by dealerSubdomain (subdomain match)
    let dealer = users.find(
      u => u.dealerSubdomain?.toLowerCase() === prefix.toLowerCase() && u.role === "dealer"
    )

    // If not found by subdomain, search by customDomain (exact domain match)
    if (!dealer) {
      dealer = users.find(
        u => u.customDomain?.toLowerCase() === domain && u.role === "dealer"
      )
    }

    if (!dealer) {
      return Response.json(
        { error: "Dealer not found", domain, prefix },
        { status: 404 }
      )
    }

    // Count IN_STOCK inventory for this dealer
    const dealerInventory = inventory.filter(
      v => v.dealership === dealer.dealership && v.status === "IN_STOCK"
    )

    return Response.json({
      success: true,
      dealer: {
        dealership: dealer.dealership,
        dealershipName: dealer.dealershipName,
        city: dealer.city || "Not specified",
        phone: dealer.phone || "Not provided",
        email: dealer.email,
        dealerSubdomain: dealer.dealerSubdomain,
        customDomain: dealer.customDomain,
        customDomainVerified: dealer.customDomainVerified || false,
      },
      inventoryCount: dealerInventory.length,
      inventoryItems: dealerInventory.slice(0, 50), // Return up to 50 for storefront
    })
  } catch (error) {
    console.error("[/api/dealer/resolve-domain]", error.message)
    return Response.json(
      { error: "Failed to resolve domain" },
      { status: 500 }
    )
  }
}
