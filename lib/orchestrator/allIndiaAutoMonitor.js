/**
 * 🤖 All-India Automotive Multi-Site Trend Monitor Engine
 * Monitors Autocar India, Team-BHP, CarDekho, CarWale, RushLane, MotorBeam, ET Auto for breaking launches & price trends.
 */

import { ALL_INDIAN_OEM_MODELS } from "../constants/allIndianVehicleCatalog.js"

export const INDIAN_AUTO_NEWS_FEEDS = [
  { name: "Autocar India", url: "https://www.autocarindia.com/rss/news" },
  { name: "Team-BHP", url: "https://www.team-bhp.com/forum/external.php?type=RSS2" },
  { name: "RushLane", url: "https://www.rushlane.com/feed" },
  { name: "MotorBeam", url: "https://www.motorbeam.com/feed/" },
  { name: "CarWale News", url: "https://www.carwale.com/news/rss/" },
  { name: "CarDekho News", url: "https://www.cardekho.com/rss/car-news.xml" },
  { name: "ET Auto", url: "https://auto.economictimes.indiatimes.com/rss/topstories" },
  { name: "NDTV Auto", url: "https://feeds.feedburner.com/carandbike-news" }
]

export async function scanIndianAutoTrends() {
  console.log("🔍 Scanning all Indian automotive news portals for breaking trends & launches...")
  const detectedTrends = []

  for (const feed of INDIAN_AUTO_NEWS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      })
      if (!res.ok) continue
      const text = await res.text()

      // Match against our catalog of all Indian OEM models
      for (const item of ALL_INDIAN_OEM_MODELS) {
        const regex = new RegExp(`\\b${item.brand}\\s+${item.model}\\b`, "i")
        if (regex.test(text)) {
          detectedTrends.push({
            source: feed.name,
            brand: item.brand,
            model: item.model,
            fuelType: item.fuelType,
            type: item.type,
            detectedAt: new Date().toISOString()
          })
        }
      }
    } catch (e) {
      console.log(`Note: Could not scan ${feed.name} RSS directly, skipping fallback.`)
    }
  }

  // Deduplicate trends by brand + model
  const uniqueTrends = []
  const seen = new Set()
  for (const t of detectedTrends) {
    const key = `${t.brand}_${t.model}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueTrends.push(t)
    }
  }

  console.log(`✅ Detected ${uniqueTrends.length} active automotive trends across Indian portals!`)
  return uniqueTrends
}
