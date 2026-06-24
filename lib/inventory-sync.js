import * as cheerio from "cheerio"
import { db } from "./firebase-client"
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore"

/**
 * lib/inventory-sync.js
 * Pattern-based generalized scraping for EV showrooms.
 */

const OEM_CONFIGS = {
  ather: {
    selectors: {
      model: "h2.vehicle-name, .model-title",
      price: ".on-road-price, .price-value",
      stock: ".availability-badge, .stock-status"
    },
    patterns: [/atherenergy\.com\/showrooms/i]
  },
  ola: {
    selectors: {
      model: ".scooter-name, h3",
      price: ".price-tag, span:contains('₹')",
      stock: ".available-status"
    },
    patterns: [/olaelectric\.com/i]
  }
}

export async function syncDealerInventory(dealerId, inventoryUrl) {
  if (!inventoryUrl) return { success: false, error: "No inventory URL provided" }

  try {
    // 1. Fetch the showroom page
    const response = await fetch(inventoryUrl, {
      headers: { "User-Agent": "EvCRM-Inventory-Sync/1.0" }
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    // 2. Detect OEM strategy
    const oemKey = Object.keys(OEM_CONFIGS).find(key => 
      OEM_CONFIGS[key].patterns.some(p => p.test(inventoryUrl))
    ) || "generic"

    const config = OEM_CONFIGS[oemKey] || { selectors: { model: "h2, h3", price: ".price", stock: ".stock" } }

    // 3. Extract items (Generalized logic)
    const items = []
    $(config.selectors.model).each((i, el) => {
      const modelName = $(el).text().trim()
      if (!modelName) return

      // Find nearest price/stock info (this is the "generalized" part)
      const parent = $(el).closest("div, section, article")
      const priceText = parent.find(config.selectors.price).first().text().trim()
      const stockText = parent.find(config.selectors.stock).first().text().trim()

      items.push({
        model: modelName,
        price: parseInt(priceText.replace(/[^0-9]/g, "")) || 0,
        stockStatus: stockText.toLowerCase().includes("out") ? "OUT_OF_STOCK" : "IN_STOCK",
        lastSynced: new Date().toISOString()
      })
    })

    if (items.length === 0) {
      // Fallback: Check for JSON-LD scripts
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html())
          if (json["@type"] === "Product" || json["@type"] === "Offer") {
             items.push({
               model: json.name,
               price: json.offers?.price || 0,
               stockStatus: "IN_STOCK", // Best guess
               lastSynced: new Date().toISOString()
             })
          }
        } catch (e) {}
      })
    }

    // 4. Update Firestore
    const results = await updateFirestoreInventory(dealerId, items)
    return { success: true, count: items.length, results }

  } catch (error) {
    console.error("Sync failed:", error)
    return { success: false, error: error.message }
  }
}

async function updateFirestoreInventory(dealerId, items) {
  const inventoryRef = collection(db, "evcrm_inventory")
  const syncResults = { updated: 0, created: 0 }

  for (const item of items) {
    const q = query(inventoryRef, where("dealerId", "==", dealerId), where("model", "==", item.model))
    const snap = await getDocs(q)

    if (!snap.empty) {
      const existingDoc = snap.docs[0]
      await updateDoc(doc(db, "evcrm_inventory", existingDoc.id), {
        exShowroomPrice: item.price,
        status: item.stockStatus,
        lastSynced: serverTimestamp()
      })
      syncResults.updated++
    } else {
      await addDoc(inventoryRef, {
        dealerId,
        model: item.model,
        exShowroomPrice: item.price,
        status: item.stockStatus,
        lastSynced: serverTimestamp()
      })
      syncResults.created++
    }
  }

  return syncResults
}
