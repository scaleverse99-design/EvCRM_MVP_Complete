export const dynamic = "force-dynamic"

import { generateTrendingLinkedInPost, publishToLinkedIn } from "../../../../lib/social/linkedinPublisher.js"
import { readTable } from "../../../../lib/store.js"
import { getCityPricePairs } from "../../../../lib/masterCatalog.js"

// GET /api/cron/linkedin-daily-drip?slot=morning|afternoon|evening
// Generates 3 posts per day for LinkedIn, redirecting viral social traffic to EvCRM pages
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const currentHour = new Date().getHours()
    
    // Auto-detect slot based on India local hours if not passed explicitly
    let slot = url.searchParams.get("slot")
    if (!slot) {
      if (currentHour < 12) slot = "morning"
      else if (currentHour < 16) slot = "afternoon"
      else slot = "evening"
    }

    let topic = null
    let targetUrl = "https://evcrm.in"
    let articleTitle = "EvCRM Indian Automotive Intelligence"

    if (slot === "morning") {
      // 🌅 Morning Slot: Editorial Buyer Guide or Latest News
      const posts = await readTable("blog_posts").catch(() => [])
      const article = posts[Math.floor(Math.random() * Math.min(20, posts.length))] || posts[0]

      if (article) {
        topic = article.title
        targetUrl = `https://evcrm.in/blog/${article.slug}`
        articleTitle = article.title
      }
    } else if (slot === "afternoon") {
      // ☀️ Afternoon Slot: Model vs Model Comparisons
      const pairs = [
        { s: "tata-nexon-ev-vs-mg-zs-ev", t: "Tata Nexon EV vs MG ZS EV" },
        { s: "ola-s1-pro-vs-ather-450x", t: "Ola S1 Pro vs Ather 450X" },
        { s: "mahindra-xuv400-ev-vs-tata-nexon-ev", t: "Mahindra XUV400 EV vs Tata Nexon EV" },
        { s: "byd-atto-3-vs-hyundai-ioniq-5", t: "BYD Atto 3 vs Hyundai Ioniq 5" },
        { s: "tvs-iqube-vs-ola-s1-air", t: "TVS iQube vs Ola S1 Air" }
      ]
      const randomComp = pairs[Math.floor(Math.random() * pairs.length)]
      topic = `${randomComp.t} head-to-head comparison review`
      targetUrl = `https://evcrm.in/compare/${randomComp.s}`
      articleTitle = randomComp.t
    } else {
      // 🌆 Evening Slot: City On-Road Price & RTO Subsidy Breakdown
      const pairs = getCityPricePairs()
      const randomPair = pairs[Math.floor(Math.random() * pairs.length)]

      if (randomPair) {
        topic = `${randomPair.model.name} On-Road Price, RTO Tax & Subsidies in ${randomPair.city.name}`
        targetUrl = `https://evcrm.in/price/${randomPair.slug}`
        articleTitle = `${randomPair.model.name} Price in ${randomPair.city.name}`
      }
    }

    const postData = await generateTrendingLinkedInPost(topic)
    postData.targetUrl = targetUrl
    postData.articleTitle = articleTitle

    const result = await publishToLinkedIn(postData)

    return Response.json({
      success: true,
      message: `LinkedIn Daily Drip execution completed for slot: ${slot}`,
      slot,
      postGenerated: postData,
      publishResult: result
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
