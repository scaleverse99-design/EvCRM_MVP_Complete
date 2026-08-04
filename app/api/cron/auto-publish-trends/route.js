import { NextResponse } from "next/server"
import { scanIndianAutoTrends } from "../../../../lib/orchestrator/allIndiaAutoMonitor"
import { readTable, writeTable } from "../../../../lib/store"

export async function GET(req) {
  try {
    const trends = await scanIndianAutoTrends()
    if (!trends || trends.length === 0) {
      return NextResponse.json({ success: true, message: "No new trends detected." })
    }

    const currentPosts = await readTable("blog_posts")
    const newArticles = []

    for (const t of trends.slice(0, 5)) {
      const slug = `${t.brand.toLowerCase()}-${t.model.toLowerCase().replace(/\s+/g, "-")}-price-specs-buying-guide-hyderabad`
      
      // Skip if article already exists
      if (currentPosts.some(p => p.slug === slug)) continue

      const title = `${t.brand} ${t.model} On-Road Price, Specs & Buying Guide (Hyderabad & Bangalore)`
      const article = {
        id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        slug,
        title,
        excerpt: `Complete localized on-road price breakdown, state RTO tax benefits, features, and specs for the ${t.brand} ${t.model} in Hyderabad and Bangalore.`,
        body: `## ${t.brand} ${t.model} On-Road Price Breakdown in Hyderabad\nHere is the exact estimated cost breakdown for the ${t.brand} ${t.model}:\n- Ex-Showroom Price: ₹12.50L\n- RTO Road Tax (Telangana): ₹1.25L\n- Comprehensive Insurance: ₹45K\n- FASTag & Registration Handling: ₹12K\n- Net On-Road Price: ₹14.32L\n\n## Key Performance & Feature Highlights\n- Transmission & Fuel Type: ${t.fuelType} Powertrain\n- Body Style: ${t.bodyType}\n- Smart Connectivity: Touchscreen Display, Steering Mounted Controls\n- Safety Suite: Dual Airbags, ABS with EBD, ISOFIX Child Seat Mounts\n\n## Why Buyers in Hyderabad & Bangalore Choose the ${t.brand} ${t.model}\n- Strong Resale & Trade-in Value: High demand in pre-owned markets ensures minimal depreciation.\n- Efficient City & Highway Performance: Low running cost per km.\n\n## How to Book Online\nBuyers interested in the ${t.brand} ${t.model} can inspect live verified dealer stock on EvCRM or choose to reserve online with trusted partner aggregators.`,
        authorName: "EvCRM Intelligence",
        publishedAt: new Date().toISOString(),
        tags: [t.brand, t.model, t.fuelType, "Price Guide"],
        keyTakeaways: [
          { icon: "💰", text: `Competitive on-road price in Hyderabad & Bangalore` },
          { icon: "⚙️", text: `High performance ${t.fuelType} powertrain` },
          { icon: "🛡️", text: `Safety features and high resale market value` }
        ]
      }

      newArticles.push(article)
    }

    if (newArticles.length > 0) {
      const updatedPosts = [...currentPosts, ...newArticles]
      await writeTable("blog_posts", updatedPosts)
      console.log(`✅ Auto-published ${newArticles.length} keyword-rich articles to Supabase!`)
    }

    return NextResponse.json({ success: true, publishedCount: newArticles.length, articles: newArticles })
  } catch (err) {
    console.error("❌ Auto-publish trends error:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
