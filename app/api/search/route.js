export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../lib/store.js"
import { fetchPeopleAlsoAsk } from "../../../lib/orchestrator/intentEngine.js"
import { callGemini, extractJson, isGeminiConfigured } from "../../../lib/orchestrator/gemini.js"
import { pingIndexNow } from "../../../lib/indexnow.js"
import { slugify } from "../../../lib/blog.js"

// GET /api/search?q=query
// Search API with Just-In-Time (JIT) Dynamic Article Generation & IndexNow
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()

  if (!q) {
    return Response.json({ success: true, articles: [], vehicles: [], totalMatches: 0 })
  }

  try {
    const [posts, inventory] = await Promise.all([
      readTable("blog_posts").catch(() => []),
      readTable("inventory").catch(() => [])
    ])

    const lowerQ = q.toLowerCase()

    // Filter matching published articles & inventory
    let matchedArticles = posts.filter(p => 
      p.status === "published" && 
      (p.title?.toLowerCase().includes(lowerQ) || p.excerpt?.toLowerCase().includes(lowerQ) || (p.tags || []).some(t => t.toLowerCase().includes(lowerQ)))
    )

    let matchedVehicles = inventory.filter(v =>
      v.status === "IN_STOCK" &&
      (`${v.brand} ${v.model} ${v.variant || ""}`.toLowerCase().includes(lowerQ) || v.type?.toLowerCase().includes(lowerQ))
    )

    let generatedArticle = null

    // ⚡ JIT DYNAMIC GENERATION: If no articles match the user's search query, generate one on the fly!
    if (matchedArticles.length === 0 && q.length >= 3 && isGeminiConfigured()) {
      try {
        console.log(`[JIT Search Engine] No articles found for "${q}" — generating on-demand article...`)
        
        // Fetch real Google Autocomplete & PAA questions for grounding
        let paaQuestions = []
        try {
          const intent = await fetchPeopleAlsoAsk(q)
          paaQuestions = (intent?.peopleAlsoAsk || []).slice(0, 6)
        } catch { /* best effort */ }

        const prompt = `You are a senior automotive journalist for EvCRM.in, an Indian vehicle marketplace.
A user searched Google/EvCRM for this query: "${q}".

${paaQuestions.length ? `Real questions people ask on Google about this topic:
${paaQuestions.map(p => `- ${p}`).join("\n")}` : ""}

Write a helpful, scannable, 600-800 word article directly answering this query for Indian buyers.
Format rules:
- Title must include main query keyword early.
- Plain text body with '## ' headings on their own lines. Double-newline paragraph breaks.
- Straight quotes only. Use Rs. for rupees.

Return ONLY a JSON object:
{
  "title": "Search-friendly title (max 70 chars)",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars)",
  "body": "Full article plain text with '## ' headings and double newlines",
  "coverEmoji": "representative emoji",
  "tags": ["EV", "India", "Buyer Guide"]
}`

        const { text } = await callGemini(prompt, { grounded: false, temperature: 0.6 })
        const draft = extractJson(text)

        if (draft?.title && draft?.body) {
          const slug = slugify(draft.title)
          const nowIso = new Date().toISOString()
          
          // Ensure headings are properly formatted
          const cleanBody = draft.body.replace(/([^\n])\s*##\s+/g, "$1\n\n## ")

          generatedArticle = {
            id: `blog_jit_${Date.now()}`,
            slug,
            type: "news",
            category: "buyer_guide",
            authorName: "EvCRM Intelligence",
            title: draft.title,
            excerpt: draft.excerpt || "",
            body: cleanBody,
            coverEmoji: draft.coverEmoji || "⚡",
            tags: draft.tags || ["EV", "India"],
            status: "published",
            createdAt: nowIso,
            updatedAt: nowIso,
            publishedAt: nowIso,
            sourceNote: "JIT Dynamic Search Engine",
          }

          // Save to database
          posts.unshift(generatedArticle)
          await writeTable("blog_posts", posts)
          matchedArticles.push(generatedArticle)

          // ⚡ PING INDEXNOW INSTANTLY (Notifies Bing/Google search crawlers within 5 seconds)
          try {
            pingIndexNow([`https://evcrm.in/blog/${slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
            console.log(`[JIT Search Engine] IndexNow ping sent for https://evcrm.in/blog/${slug}`)
          } catch (e) {
            console.warn("[JIT Search Engine] IndexNow ping warning:", e.message)
          }
        }
      } catch (err) {
        console.warn("[JIT Search Engine] Dynamic article generation warning:", err.message)
      }
    }

    return Response.json({
      success: true,
      query: q,
      jitGenerated: !!generatedArticle,
      articles: matchedArticles.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        coverEmoji: p.coverEmoji || "🚗",
        category: p.category,
        publishedAt: p.publishedAt,
        url: `/blog/${p.slug}`
      })),
      vehicles: matchedVehicles.map(v => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        variant: v.variant,
        price: v.price || v.exShowroom,
        image: v.images?.[0] || null,
        url: `/showroom?vehicleId=${v.id}`
      }))
    })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
