/**
 * 💼 Autonomous LinkedIn Auto-Poster Engine for EvCRM
 * Fetches internet trending EV & Auto news, generates viral LinkedIn posts, and publishes to LinkedIn API.
 */

import { callOpenRouter } from "../orchestrator/openrouter.js"
import { readTable, writeTable } from "../store.js"

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN
const LINKEDIN_AUTHOR_URN = process.env.LINKEDIN_AUTHOR_URN // e.g. "urn:li:person:abcdef" or "urn:li:organization:123456"

const TRENDING_TOPICS = [
  "Indian EV Sales surge 45% YoY led by Tata Nexon EV & Punch EV",
  "Ola Electric vs Ather Energy battery warranty and range test benchmark",
  "Zero percent RTO tax policy in Telangana and Karnataka driving EV adoption",
  "Top 5 electric cars launched in India in 2026 under 15 Lakhs",
  "Pre-owned EV market boom: Why Indian buyers are choosing certified used EVs",
  "ICE vs EV total cost of ownership: Saving Rs 1.5 Lakh per year on fuel"
]

/**
 * Generates a viral LinkedIn post on a trending topic with a direct link to an EvCRM article
 */
export async function generateTrendingLinkedInPost(topicOverride = null) {
  const posts = await readTable("blog_posts").catch(() => [])
  const latestArticle = posts[0] || null
  const articleUrl = latestArticle ? `https://evcrm.in/blog/${latestArticle.slug}` : "https://evcrm.in"

  const selectedTopic = topicOverride || latestArticle?.title || TRENDING_TOPICS[Math.floor(Math.random() * TRENDING_TOPICS.length)]

  const prompt = `You are a viral LinkedIn creator and automotive industry thought leader in India.
Write an engaging, high-performing LinkedIn post about this trending topic: "${selectedTopic}".
The post MUST direct readers to read the full breakdown at this link: ${articleUrl}

Requirements:
1. Hook: Start with a strong 1-line hook that creates curiosity.
2. Short paragraphs with line breaks for mobile readability.
3. 3-4 bullet points using emojis (⚡, 📊, 🚀, 💡).
4. Direct Call-To-Action asking readers to click and read the full article at ${articleUrl}.
5. End with 4 relevant hashtags (#ElectricVehicles #EvCRM #Automotive #India #EVIndia).

Return JSON only:
{
  "hook": "Single line hook",
  "content": "Full formatted post text with emojis, line breaks, link to ${articleUrl}, and hashtags",
  "topic": "${selectedTopic}",
  "targetUrl": "${articleUrl}",
  "articleTitle": "${latestArticle?.title || selectedTopic}"
}`

  try {
    const { text } = await callOpenRouter(prompt, { temperature: 0.7 })
    let draft = null
    try {
      draft = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) draft = JSON.parse(match[0])
    }

    if (!draft?.content) {
      draft = {
        hook: `⚡ ${selectedTopic}`,
        content: `⚡ ${selectedTopic}\n\nThe Indian automotive landscape is shifting faster than ever.\n\nHere are 3 key takeaways every buyer and dealer needs to know:\n\n📊 1. Total Cost of Ownership is favoring EVs heavily in 2026.\n🌱 2. State-wise RTO tax exemptions save buyers up to Rs 2 Lakh upfront.\n🚀 3. Battery infrastructure is growing across Tier-1 and Tier-2 highways.\n\n👉 Read our full deep-dive article & price specs breakdown here: ${articleUrl}\n\n#EvCRM #ElectricVehicles #AutomotiveIndia #EVs #FutureOfMobility`,
        topic: selectedTopic,
        targetUrl: articleUrl,
        articleTitle: latestArticle?.title || selectedTopic
      }
    }

    return draft
  } catch (err) {
    console.warn("⚠️ OpenRouter LinkedIn generation fallback:", err.message)
    return {
      hook: `⚡ ${selectedTopic}`,
      content: `⚡ ${selectedTopic}\n\nThe Indian automotive market is evolving rapidly in 2026.\n\n👉 Read complete price breakdowns & model specs on EvCRM: ${articleUrl}\n\n#EvCRM #ElectricVehicles #Automotive #India`,
      topic: selectedTopic,
      targetUrl: articleUrl,
      articleTitle: latestArticle?.title || selectedTopic
    }
  }
}

/**
 * Publishes post directly to LinkedIn API with clickable Article Card (or queues locally)
 */
export async function publishToLinkedIn(postData) {
  const linkedinQueue = await readTable("linkedin_posts").catch(() => [])
  
  const record = {
    id: `linkedin_${Date.now()}`,
    topic: postData.topic,
    content: postData.content,
    targetUrl: postData.targetUrl || "https://evcrm.in",
    articleTitle: postData.articleTitle || postData.topic,
    createdAt: new Date().toISOString(),
    status: "pending",
    linkedInUrn: null
  }

  if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_AUTHOR_URN) {
    console.log("ℹ️ LinkedIn API credentials not set. Saved to queue.")
    record.status = "queued_local"
    linkedinQueue.unshift(record)
    await writeTable("linkedin_posts", linkedinQueue)
    return { success: true, mode: "queued", record }
  }

  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: LINKEDIN_AUTHOR_URN,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: postData.content
            },
            shareMediaCategory: "ARTICLE",
            media: [
              {
                status: "READY",
                originalUrl: postData.targetUrl || "https://evcrm.in",
                title: {
                  text: postData.articleTitle || postData.topic
                },
                description: {
                  text: "Read full price breakdown, RTO tax exemptions, and vehicle specifications on EvCRM.in"
                }
              }
            ]
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`LinkedIn API returned ${res.status}: ${errText}`)
    }

    const resData = await res.json()
    record.status = "published_live"
    record.linkedInUrn = resData.id

    linkedinQueue.unshift(record)
    await writeTable("linkedin_posts", linkedinQueue)

    return { success: true, mode: "live", urn: resData.id, record }
  } catch (err) {
    console.error("❌ LinkedIn API publish failed:", err.message)
    record.status = "failed"
    record.error = err.message
    linkedinQueue.unshift(record)
    await writeTable("linkedin_posts", linkedinQueue)
    return { success: false, error: err.message, record }
  }
}
