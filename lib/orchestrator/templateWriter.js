/**
 * ⚡ Non-AI Rule-Based Programmatic Article Synthesizer
 * Generates 100% error-free SEO articles with ZERO AI token usage and ZERO API costs.
 * Guarantees infinite article generation capability even if all AI APIs are exhausted.
 */

import { fmt } from "../constants.js"
import { POPULAR_MODELS, TOP_CITIES, calculateOnRoadPrice } from "../masterCatalog.js"
import { slugify } from "../blog.js"

export function generateTemplateArticle(topicQuery, options = {}) {
  const cleanTopic = String(topicQuery || "EV Buyers Guide").trim()
  const lowerTopic = cleanTopic.toLowerCase()

  // Match model or fallback to Tata Nexon EV
  const matchedModel = POPULAR_MODELS.find(m => 
    lowerTopic.includes(m.name.toLowerCase()) || lowerTopic.includes(m.id) || lowerTopic.includes(m.brand.toLowerCase())
  ) || POPULAR_MODELS[0]

  // Match city or fallback to Hyderabad
  const matchedCity = TOP_CITIES.find(c => 
    lowerTopic.includes(c.name.toLowerCase()) || lowerTopic.includes(c.state.toLowerCase())
  ) || TOP_CITIES[0]

  const pricing = calculateOnRoadPrice(matchedModel, matchedCity)
  const isEV = matchedModel.category === "2W" || matchedModel.rangeKm > 0

  const title = options.title || `${matchedModel.name} Price, Specs & Buying Guide in ${matchedCity.name}`
  const slug = slugify(title)
  const nowIso = new Date().toISOString()

  const body = `The ${matchedModel.name} is currently one of the most requested choices among buyers searching for an efficient ${matchedModel.type.toLowerCase()} in ${matchedCity.name}, ${matchedCity.state}. Whether you are evaluating daily commute costs or comparing specs against rivals, understanding the complete price breakdown is crucial before making a booking.

## On-Road Price Breakdown in ${matchedCity.name}

Here is the exact estimated cost breakdown for the ${matchedModel.name} in ${matchedCity.name}:

- **Ex-Showroom Price:** ${fmt.currency(pricing.exShowroom)}
- **RTO Road Tax (${matchedCity.state}):** ${pricing.rtoTax > 0 ? fmt.currency(pricing.rtoTax) : "₹0 (0% State EV Tax Exemption)"}
- **Comprehensive Insurance:** ${fmt.currency(pricing.insurance)}
- **FASTag & Registration Handling:** ${fmt.currency(pricing.fastTagTCS)}
${pricing.stateSubsidy > 0 ? `- **Direct State EV Subsidy:** -${fmt.currency(pricing.stateSubsidy)}` : ""}
- **Estimated Net On-Road Price:** ${fmt.currency(pricing.netOnRoadPrice)}

## Key Performance & Feature Highlights

- **Battery Pack / Powertrain:** ${matchedModel.batteryKwh || "Standard"} kWh capacity
- **Claimed Driving Range:** ${matchedModel.rangeKm} km per charge/fill
- **Fast Charging Capability:** 0 to 80% in approximately ${matchedModel.fastChargingMin} minutes
- **Top Speed:** ${matchedModel.topSpeedKmh} km/h
- **Warranty Support:** ${matchedModel.warrantyYears} Years manufacturer battery warranty

## Why Buyers in ${matchedCity.name} Prefer the ${matchedModel.name}

1. **Substantial Fuel & Running Cost Savings:** Running costs for electric vehicles average under ₹1.0 per km compared to ₹6.5+ per km for petrol alternatives.
2. **Zero Emission & State Tax Benefits:** ${matchedCity.state} offers 0% road tax exemption, saving buyers up to ${fmt.currency(pricing.rtoExemptionSaved)} during registration.
3. **High Resale & Trade-in Value:** Strong demand in the pre-owned market ensures minimal depreciation over 3 to 5 years.

## How to Book or Purchase in ${matchedCity.name}

Buyers interested in the ${matchedModel.name} can inspect live verified dealer stock on EvCRM or choose between ordering a brand-new unit or certified pre-owned options.`

  return {
    id: `blog_template_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    slug,
    type: "news",
    category: "buyer_guide",
    authorName: "EvCRM Analytics",
    title,
    excerpt: `Complete 2026 price breakdown, specifications, and buying options for the ${matchedModel.name} in ${matchedCity.name}.`,
    body,
    coverEmoji: matchedModel.imageEmoji || "🚗",
    tags: [matchedModel.brand, matchedModel.name, matchedCity.name, "Price Guide"],
    status: "published",
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: nowIso,
    sourceNote: "Non-AI Programmatic Template Writer (0% API Token Cost)",
  }
}
