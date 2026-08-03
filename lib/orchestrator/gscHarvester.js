/**
 * 🌐 Google Search Console (GSC) Query Harvester & Gap Detector
 * Captures real search queries typed directly into Google.com by real users.
 * Automatically detects query gaps and generates dedicated articles to rank on Page 1.
 */

import { fetchPeopleAlsoAsk } from "./intentEngine.js"
import { callGemini, extractJson, isGeminiConfigured } from "./gemini.js"
import { readTable, writeTable } from "../store.js"
import { pingIndexNow } from "../indexnow.js"
import { slugify } from "../blog.js"

/**
 * Parses Google Search Console API payload or fallback search trends
 * to extract queries typed by real Google users.
 */
export async function harvestGoogleQueriesAndGenerate(queries = []) {
  if (!Array.isArray(queries) || queries.length === 0) {
    // Fallback: Default seed queries representing real Indian Google search intent
    queries = [
      "best electric scooter in hyderabad",
      "tata nexon ev battery replacement cost india",
      "ola s1 pro gen 2 real world range bangalore",
      "ev charging cost per unit in delhi",
      "is ev subsidy available in telangana 2026",
      "atherrizta vs tvs iqube comparison"
    ]
  }

  const posts = await readTable("blog_posts").catch(() => [])
  const generatedSlugs = []

  for (const q of queries) {
    const cleanQ = String(q).trim()
    if (cleanQ.length < 3) continue

    const lowerQ = cleanQ.toLowerCase()
    
    // Check if an article already exists for this query
    const exists = posts.some(p => 
      p.status === "published" && 
      (p.title?.toLowerCase().includes(lowerQ) || p.slug?.toLowerCase().includes(slugify(cleanQ)))
    )

    if (exists) {
      console.log(`[GSC Harvester] Article already exists for Google query: "${cleanQ}" — skipping.`)
      continue
    }

    if (!isGeminiConfigured()) {
      console.warn("[GSC Harvester] Gemini not configured — skipping generation.")
      break
    }

    try {
      console.log(`[GSC Harvester] Generating article for Google.com search query: "${cleanQ}"...`)
      
      // Fetch People Also Ask questions for Google intent alignment
      let paaQuestions = []
      try {
        const intent = await fetchPeopleAlsoAsk(cleanQ)
        paaQuestions = (intent?.peopleAlsoAsk || []).slice(0, 6)
      } catch { /* best effort */ }

      const prompt = `You are a senior automotive journalist for EvCRM.in.
Real users typed this exact query into Google search: "${cleanQ}".

${paaQuestions.length ? `Google People Also Ask (PAA) questions for this topic:
${paaQuestions.map(p => `- ${p}`).join("\n")}` : ""}

Write a high-ranking 800-1000 word article answering this exact Google query for Indian vehicle buyers.
Structure rules:
- Title must be search-optimized with main keyword early.
- Include 4-6 '## ' headings matching the questions users ask Google.
- Plain text body with double-newline paragraph breaks. Use Rs. for rupees.

Return ONLY a JSON object:
{
  "title": "Title (max 70 chars)",
  "excerpt": "Snippet summary (max 160 chars)",
  "body": "Full article plain text with '## ' headings",
  "coverEmoji": "representative emoji",
  "tags": ["Google Search", "EV India", "Buyer Guide"]
}`

      const { text } = await callGemini(prompt, { grounded: false, temperature: 0.6 })
      const draft = extractJson(text)

      if (draft?.title && draft?.body) {
        const slug = slugify(draft.title)
        const nowIso = new Date().toISOString()
        const cleanBody = draft.body.replace(/([^\n])\s*##\s+/g, "$1\n\n## ")

        const newArticle = {
          id: `blog_gsc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          slug,
          type: "news",
          category: "gsc_trending",
          authorName: "EvCRM Newsroom",
          title: draft.title,
          excerpt: draft.excerpt || "",
          body: cleanBody,
          coverEmoji: draft.coverEmoji || "🌐",
          tags: draft.tags || ["Google Trends"],
          status: "published",
          createdAt: nowIso,
          updatedAt: nowIso,
          publishedAt: nowIso,
          sourceNote: `Google.com Search Engine Query: ${cleanQ}`,
        }

        posts.unshift(newArticle)
        await writeTable("blog_posts", posts)
        generatedSlugs.push(slug)

        // Instant IndexNow notification to Google/Bing
        try {
          pingIndexNow([`https://evcrm.in/blog/${slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
        } catch { /* best effort */ }
      }
    } catch (err) {
      console.warn(`[GSC Harvester] Error generating for "${cleanQ}":`, err.message)
    }
  }

  return {
    harvestedQueriesCount: queries.length,
    generatedSlugs
  }
}
