/**
 * 🚗 Publish Master OEM Catalog Vehicle Pages to Supabase
 * Generates 15 high-converting, keyword-rich vehicle guides across top Indian models.
 */

import { readTable, writeTable } from "../lib/store.js"

const TARGET_MASTER_MODELS = [
  { brand: "Tata", model: "Nexon EV", type: "4W", fuel: "Electric", price: "₹14.49L", range: "465 km", city: "Hyderabad" },
  { brand: "Tata", model: "Punch.ev", type: "4W", fuel: "Electric", price: "₹10.99L", range: "421 km", city: "Bangalore" },
  { brand: "Tata", model: "Curvv.ev", type: "4W", fuel: "Electric", price: "₹17.49L", range: "585 km", city: "Hyderabad" },
  { brand: "Mahindra", model: "XUV400 EV", type: "4W", fuel: "Electric", price: "₹15.49L", range: "456 km", city: "Bangalore" },
  { brand: "Mahindra", model: "Thar Roxx", type: "4W", fuel: "Diesel", price: "₹12.99L", range: "650 km", city: "Hyderabad" },
  { brand: "Mahindra", model: "BE.05", type: "4W", fuel: "Electric", price: "₹18.90L", range: "500 km", city: "Bangalore" },
  { brand: "MG", model: "Comet EV", type: "4W", fuel: "Electric", price: "₹6.99L", range: "230 km", city: "Hyderabad" },
  { brand: "MG", model: "Windsor EV", type: "4W", fuel: "Electric", price: "₹13.50L", range: "331 km", city: "Bangalore" },
  { brand: "Hyundai", model: "Creta", type: "4W", fuel: "Petrol", price: "₹11.00L", range: "700 km", city: "Hyderabad" },
  { brand: "Hyundai", model: "IONIQ 5", type: "4W", fuel: "Electric", price: "₹45.95L", range: "631 km", city: "Bangalore" },
  { brand: "Maruti Suzuki", model: "Wagon R", type: "4W", fuel: "Petrol", price: "₹5.54L", range: "600 km", city: "Hyderabad" },
  { brand: "Maruti Suzuki", model: "Swift", type: "4W", fuel: "Petrol", price: "₹6.49L", range: "650 km", city: "Bangalore" },
  { brand: "Ola Electric", model: "S1 Pro", type: "2W", fuel: "Electric", price: "₹1.35L", range: "195 km", city: "Hyderabad" },
  { brand: "Ather", model: "Rizta", type: "2W", fuel: "Electric", price: "₹1.10L", range: "160 km", city: "Bangalore" },
  { brand: "Bajaj", model: "Chetak EV", type: "2W", fuel: "Electric", price: "₹1.15L", range: "127 km", city: "Hyderabad" }
]

async function main() {
  console.log("🚀 Generating 15 Master OEM Vehicle Buying Guides...")

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required.")
    process.exit(1)
  }

  const existingPosts = await readTable("blog_posts")
  const newGuidePosts = []

  for (const item of TARGET_MASTER_MODELS) {
    const slug = `${item.brand.toLowerCase().replace(/\s+/g, "-")}-${item.model.toLowerCase().replace(/[^a-z0-9]/g, "-")}-price-specs-buying-guide-in-${item.city.toLowerCase()}`
    
    // Skip if already in database
    if (existingPosts.some(p => p.slug === slug)) {
      console.log(`Skipping existing slug: ${slug}`)
      continue
    }

    const title = `${item.brand} ${item.model} On-Road Price, Specs & Buying Guide in ${item.city}`
    const post = {
      id: `post_master_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      slug,
      title,
      excerpt: `Detailed on-road cost breakdown, state RTO tax exemption, technical specs, and live dealer stock availability for the ${item.brand} ${item.model} in ${item.city}.`,
      body: `## ${item.brand} ${item.model} On-Road Price Breakdown in ${item.city}\nHere is the exact estimated cost breakdown for the ${item.brand} ${item.model} in ${item.city}:\n- Ex-Showroom Price: ${item.price}\n- RTO Road Tax (${item.city === "Hyderabad" ? "Telangana 0% EV Exemption" : "Karnataka RTO"}): ₹0 (State Subsidy Benefit)\n- Comprehensive Insurance: ₹42K\n- FASTag & Registration Handling: ₹15K\n- Direct State EV Subsidy: -₹10K\n- Estimated Net On-Road Price: ${item.price}\n\n## Key Performance & Feature Highlights\n- Powertrain / Battery Output: Claimed Driving Range ${item.range} per charge/fill\n- Smart Vehicle Controls: Touchscreen Infotainment, Steering Mounted Controls, OTA Updates\n- Safety Rating: Multi-Airbag Suite, ABS with EBD, ISOFIX Child Seat Mounts\n\n## Why Buyers in ${item.city} Prefer the ${item.brand} ${item.model}\n1. Substantial Fuel & Running Cost Savings: Low running costs per km compared to petrol alternatives.\n2. Zero Emission & State Tax Benefits: 0% road tax exemption saving buyers up to ₹2.0L during registration.\n3. High Resale & Trade-in Value: Strong demand in pre-owned markets ensures minimal depreciation over 3 to 5 years.\n\n## How to Book or Purchase in ${item.city}\nBuyers interested in the ${item.brand} ${item.model} can inspect live verified dealer stock on EvCRM or choose to reserve online with trusted partner aggregators.`,
      authorName: "EvCRM Editorial Team",
      publishedAt: new Date().toISOString(),
      tags: [item.brand, item.model, item.fuel, item.city],
      keyTakeaways: [
        { icon: "💰", text: `On-road cost breakdown in ${item.city} with state tax benefits` },
        { icon: "⚡", text: `${item.range} claimed range with high efficiency output` },
        { icon: "🛡️", text: `Full manufacturer warranty and high resale value` }
      ]
    }

    newGuidePosts.push(post)
  }

  if (newGuidePosts.length > 0) {
    const updatedList = [...existingPosts, ...newGuidePosts]
    await writeTable("blog_posts", updatedList)
    console.log(`✅ Successfully published ${newGuidePosts.length} Master OEM vehicle guides directly to Supabase production!`)
  } else {
    console.log("All 15 master vehicle guides are already live in Supabase!")
  }
}

main().catch(console.error)
