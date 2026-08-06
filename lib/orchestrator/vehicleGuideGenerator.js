/**
 * 🚘 Full Vehicle History & Buyer Guide Generator
 * Generates SEO-optimized buyer guides for every Indian vehicle model (EV + ICE)
 * from launch history to current 2026 specs.
 */

import { INDIAN_AUTO_REGISTRY } from "../fullIndianAutoRegistry.js"
import { readTable, writeTable } from "../store.js"
import { slugify } from "../blog.js"
import { pingIndexNow } from "../indexnow.js"

export async function generateFullRegistryGuides() {
  const posts = await readTable("blog_posts").catch(() => [])
  let generatedCount = 0

  for (const v of INDIAN_AUTO_REGISTRY) {
    const slug = slugify(`${v.brand} ${v.model} buyer guide price specs`)
    const exists = posts.some(p => p.slug === slug || p.title?.includes(v.model))

    if (exists) continue

    const nowIso = new Date().toISOString()
    const isEV = v.fuelType === "EV" || v.fuelType === "Hybrid"

    const article = {
      id: `blog_guide_${v.brand.toLowerCase()}_${v.model.toLowerCase().replace(/\s+/g, "_")}`,
      slug,
      // "guide", NOT "news" — these are evergreen per-model buyer guides.
      // Typing them as news put all 139 of them into the news-dedup pool
      // that discover.js / cte-core check before queueing a topic, and
      // because every guide title contains a brand + model, ANY real
      // breaking story about a vehicle that already had a guide was
      // rejected as a duplicate. Measured 2026-08-06: the Tata Nexon Camo
      // launch (5 publishers, 2.6h old) was blocked by "Tata Nexon EV
      // Buyer Guide" — and "Tata Safari (New) Buyer Guide" blocked it too,
      // on {tata, new} alone, a different vehicle entirely.
      //
      // Sitemap behaviour is unchanged: it only special-cases
      // type === "knowledge", and "guide" falls in the same bucket "news"
      // did.
      type: "guide",
      category: isEV ? "ev" : "buyer_guide",
      authorName: "EvCRM Editorial Team",
      title: `${v.brand} ${v.model} Buyer Guide: Price, Specs, Range & Buying Options`,
      excerpt: `Complete 2026 buyer guide for the ${v.brand} ${v.model} in India. Check ex-showroom price, ${isEV ? "battery range" : "fuel efficiency"}, specifications, and available new or used listings.`,
      coverEmoji: v.imageEmoji || "🚗",
      tags: [v.brand, v.model, v.type, v.fuelType, "India"],
      body: `The ${v.brand} ${v.model} remains one of the most notable ${v.type.toLowerCase()} choices in the Indian automotive market. First introduced in ${v.launchYear}, the ${v.model} offers an impressive blend of performance, practical features, and strong resale value across both new and pre-owned segments.

## Key Specifications & Performance Highlights

The ${v.brand} ${v.model} is designed to cater to modern Indian driving conditions. Here are the core specifications:

- **Ex-Showroom Price Range:** ₹${v.priceMin ? (v.priceMin / 100000).toFixed(2) : "2.50"} Lakh to ₹${v.priceMax ? (v.priceMax / 100000).toFixed(2) : "5.00"} Lakh
- **Fuel / Powertrain Type:** ${v.fuelType || "Petrol"}
- **Vehicle Category:** ${v.category || "4W"} (${v.type || "Vehicle"})
${isEV ? `- **Claimed Battery Range:** ${v.rangeKm || 150} km per full charge` : `- **Estimated Driving Range:** ${v.rangeKm || 400} km per tank`}
- **Market Segment:** ${v.popular ? "Top Seller in India" : "Indian Automotive Master Segment"}

## Why Buyers Choose the ${v.brand} ${v.model}

1. **Proven Reliability:** Long-term durability and wide service network coverage across major Indian cities.
2. **Modern Connectivity:** Loaded with smart dashboard technology, safety features, and comfortable cabin ergonomics.
3. **Strong Resale Value:** High demand in the pre-owned market makes it a financially sound choice.

## Buying New vs Pre-Owned ${v.brand} ${v.model}

Whether you are looking to purchase a brand-new ${v.brand} ${v.model} straight from the showroom or looking for a certified pre-owned vehicle, inspect available dealer listings or route to verified OEM and used marketplace partners below.`,
      status: "published",
      createdAt: nowIso,
      updatedAt: nowIso,
      publishedAt: nowIso,
      sourceNote: "Indian Auto Registry Master Guide",
    }

    posts.unshift(article)
    generatedCount++

    try {
      pingIndexNow([`https://evcrm.in/blog/${slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
    } catch { /* best effort */ }
  }

  if (generatedCount > 0) {
    await writeTable("blog_posts", posts)
  }

  return {
    totalRegistryModels: INDIAN_AUTO_REGISTRY.length,
    newGuidesGenerated: generatedCount,
    totalPublishedArticles: posts.length
  }
}
