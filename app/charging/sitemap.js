import { NextResponse } from "next/server"

// ── /charging/sitemap.xml ─────────────────────────────────────────────
// Dedicated sitemap for the EV charging infrastructure section.
// Generates city-level URLs so Google can index each city's charging page
// individually (e.g., /charging?city=Hyderabad), boosting long-tail SEO
// for "EV charging stations in [city]" queries.
export const dynamic = "force-dynamic"

// Top 50 Indian cities with EV charging infrastructure
const CHARGING_CITIES = [
  "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Chennai", "Pune",
  "Ahmedabad", "Kolkata", "Lucknow", "Jaipur", "Kochi", "Coimbatore",
  "Gurugram", "Noida", "Salem", "Vijayawada", "Visakhapatnam",
  "Tirupati", "Guntur", "Kakinada", "Rajahmundry", "Nellore",
  "Kurnool", "Anantapur", "Kadapa", "Srikakulam",
  "Chandigarh", "Indore", "Nagpur", "Bhopal", "Thiruvananthapuram",
  "Mysuru", "Vadodara", "Surat", "Nashik", "Patna", "Ranchi",
  "Bhubaneswar", "Guwahati", "Dehradun", "Agra", "Varanasi",
  "Amritsar", "Jodhpur", "Udaipur", "Mangaluru", "Hubli",
  "Vizianagaram", "Warangal", "Madurai",
]

export default function sitemap() {
  const baseUrl = "https://evcrm.in"
  const now = new Date().toISOString()

  // Main charging page
  const mainRoute = {
    url: `${baseUrl}/charging`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }

  // City-level charging pages
  const cityRoutes = CHARGING_CITIES.map(city => ({
    url: `${baseUrl}/charging?city=${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  // Network-level pages
  const networks = [
    "Tata Power", "Statiq", "Ather Grid", "ChargeZone",
    "Sun Mobility", "Battery Smart", "EESL", "Jio-bp",
  ]
  const networkRoutes = networks.map(network => ({
    url: `${baseUrl}/charging?network=${encodeURIComponent(network)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  return [mainRoute, ...cityRoutes, ...networkRoutes]
}
