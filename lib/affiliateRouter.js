/**
 * 🔀 Smart Dealer Stock & Fallback Marketplace Router
 * Connects EvCRM buyers to live EvCRM dealer inventory when available,
 * or routes them to OEM / Spinny / CarWale for New & Pre-Owned options.
 */

import { readTableCached } from "./store.js"
import { INDIAN_AUTO_REGISTRY } from "./fullIndianAutoRegistry.js"

export async function resolveVehiclePurchaseOptions(brandName, modelName) {
  if (!brandName || !modelName) return null

  const normBrand = String(brandName).toLowerCase().trim()
  const normModel = String(modelName).toLowerCase().trim()

  // 1. Check live EvCRM partner dealer inventory
  let evcrmListings = []
  try {
    const inventory = await readTableCached("inventory")
    evcrmListings = inventory.filter(v => 
      v.status === "IN_STOCK" &&
      v.brand?.toLowerCase().trim() === normBrand &&
      v.model?.toLowerCase().trim().includes(normModel)
    )
  } catch (err) {
    console.warn("[AffiliateRouter] EvCRM inventory check warning:", err.message)
  }

  // 2. Find matching entry in master Indian Auto Registry
  const registryItem = INDIAN_AUTO_REGISTRY.find(r => 
    r.brand.toLowerCase().trim() === normBrand && 
    (r.model.toLowerCase().trim() === normModel || normModel.includes(r.model.toLowerCase().trim()))
  ) || {
    brand: brandName,
    model: modelName,
    buyNewUrl: `https://www.carwale.com/search/?q=${encodeURIComponent(`${brandName} ${modelName}`)}`,
    buyUsedUrl: `https://www.spinny.com/used-cars/`
  }

  const hasEvcrmStock = evcrmListings.length > 0

  return {
    brand: registryItem.brand,
    model: registryItem.model,
    hasEvcrmDealerStock: hasEvcrmStock,
    evcrmListingsCount: evcrmListings.length,
    evcrmListings: evcrmListings.map(v => ({
      id: v.id,
      variant: v.variant,
      price: v.price || v.exShowroom,
      dealerName: v.dealerName,
      city: v.district || v.city,
      url: `/showroom?vehicleId=${v.id}`
    })),
    // Fallback Routing options when EvCRM stock is building up
    fallbackRoutes: {
      buyNew: {
        label: `Order New ${registryItem.brand} ${registryItem.model}`,
        provider: registryItem.buyNewUrl.includes("tatamotors") ? "Tata Official" : 
                  registryItem.buyNewUrl.includes("mgmotor") ? "MG Official" :
                  registryItem.buyNewUrl.includes("ather") ? "Ather Official" : "CarWale / OEM",
        url: registryItem.buyNewUrl,
        isExternal: true
      },
      buyUsed: {
        label: `Buy Verified Used ${registryItem.brand} ${registryItem.model}`,
        provider: "Spinny / Cars24 Verified",
        url: registryItem.buyUsedUrl,
        isExternal: true
      }
    }
  }
}
