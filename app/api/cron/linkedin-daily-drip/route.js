export const dynamic = "force-dynamic"

import { generateTrendingLinkedInPost, publishToLinkedIn } from "../../../../lib/social/linkedinPublisher.js"
import { readTable } from "../../../../lib/store.js"
import { getCityPricePairs } from "../../../../lib/masterCatalog.js"

// GET /api/cron/linkedin-daily-drip?slot=morning|evening
// Generates 2 posts per day for LinkedIn, redirecting viral social traffic to EvCRM articles
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const slot = url.searchParams.get("slot") || (new Date().getHours() < 14 ? "morning" : "evening")

    let topic = null
    let targetUrl = "https://evcrm.in"
    let articleTitle = "EvCRM Indian Automotive Intelligence"

    if (slot === "morning") {
      // Morning Slot: Editorial Buyer Guide or Latest News
      const posts = await readTable("blog_posts").catch(() => [])
      const article = posts[Math.floor(Math.random() * Math.min(20, posts.length))] || posts[0]

      if (article) {
        topic = article.title
        targetUrl = `https://evcrm.in/blog/${article.slug}`
        articleTitle = article.title
      }
    } else {
      // Evening Slot: City On-Road Price & RTO Subsidy Breakdown
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
