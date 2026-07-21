export const dynamic = "force-dynamic"

import { readTable, writeTable } from "../../../../lib/store"
import { pingIndexNow } from "../../../../lib/indexnow"
import { slugify, generateKnowledgeAnswer, KNOWLEDGE_CATEGORIES } from "../../../../lib/blog"

// Brand list used to tag a search query with a mentioned vehicle brand —
// this is what makes the query log useful as a dealer-facing trend signal
// later, not just a customer-facing Q&A cache. Deliberately simple substring
// matching rather than an extra AI call per search (keeps every search fast
// and free when it hits an existing article).
const KNOWN_BRANDS = [
  "Tata Motors", "Tata", "Maruti Suzuki", "Maruti", "Hyundai", "Kia", "Mahindra",
  "Honda", "Toyota", "MG", "Ola Electric", "Ola", "Ather Energy", "Ather", "Bajaj",
  "TVS", "Ampere", "Okaya", "BYD", "Hero", "Renault", "Skoda", "Volkswagen",
  "Nissan", "Citroen", "Jeep", "Volvo", "Audi", "BMW", "Mercedes", "Lexus",
  "Ford", "Chevrolet", "Yamaha", "Royal Enfield", "Revolt",
]

function extractBrand(query) {
  const q = query.toLowerCase()
  const hit = KNOWN_BRANDS.find(b => q.includes(b.toLowerCase()))
  return hit || null
}

// Cheap relevance score between a query and an existing article — fraction
// of the query's significant words (len > 2) found in the article's
// title+excerpt+category. No vector/embedding infra; good enough to catch
// "does this already answer it" without re-generating duplicates.
function scoreMatch(query, article) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return 0
  const hay = `${article.title || ""} ${article.excerpt || ""} ${article.category || ""}`.toLowerCase()
  const hits = words.filter(w => hay.includes(w)).length
  return hits / words.length
}

const MATCH_THRESHOLD = 0.6

// POST { query, location?: { state, district } } — searches existing
// Knowledge Hub + model-hub content first; if nothing answers it closely
// enough, generates a brand-new Knowledge Hub article on the spot (~10-20s)
// and saves it so the next matching search is instant. Every call is logged
// (query text, matched/generated result, extracted brand, visitor location)
// — that log is what powers the dealer-facing "Trending Research" insights.
export async function POST(req) {
  const body = await req.json()
  const query = (body.query || "").trim().slice(0, 200)
  const location = body.location || null
  if (!query) return Response.json({ error: "query is required" }, { status: 400 })

  const now = new Date()
  const posts = await readTable("blog_posts")
  const live = posts.filter(p =>
    p.status === "published" && (!p.publishedAt || new Date(p.publishedAt) <= now)
  )

  let best = null, bestScore = 0
  for (const p of live) {
    const s = scoreMatch(query, p)
    if (s > bestScore) { bestScore = s; best = p }
  }

  let resultSlug, resultType, isNew = false, error = null

  if (best && bestScore >= MATCH_THRESHOLD) {
    resultSlug = best.slug
    resultType = best.type === "knowledge" ? "learn" : "blog"
  } else {
    const draft = await generateKnowledgeAnswer(query)
    if (!draft) {
      error = "AI answer generation is unavailable right now — please try again shortly."
    } else {
      const slug = slugify(draft.title || query)
      const nowIso = now.toISOString()
      const article = {
        id: `blog_${Date.now()}`,
        slug,
        type: "knowledge",
        category: KNOWLEDGE_CATEGORIES.includes(draft.category) ? draft.category : "Buying Guides",
        authorName: "EvCRM",
        title: draft.title || query,
        excerpt: draft.excerpt || "",
        body: draft.body || "",
        coverEmoji: draft.coverEmoji || "📘",
        status: "published",
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: nowIso,
      }
      posts.unshift(article)
      await writeTable("blog_posts", posts)
      pingIndexNow([`https://evcrm.in/learn/${slug}`, "https://evcrm.in/learn", "https://evcrm.in/sitemap.xml"])
      resultSlug = slug
      resultType = "learn"
      isNew = true
    }
  }

  // Best-effort logging — never let a logging failure break the response
  // the visitor is waiting on.
  try {
    const logs = await readTable("search_queries")
    logs.unshift({
      id: `sq_${Date.now()}`,
      query,
      brand: extractBrand(query),
      resultSlug: resultSlug || null,
      resultType: resultType || null,
      isNew,
      state: location?.state || "",
      district: location?.district || "",
      createdAt: now.toISOString(),
    })
    await writeTable("search_queries", logs)
  } catch (e) {
    console.error("[search log] failed:", e.message)
  }

  if (error) return Response.json({ error }, { status: 502 })
  return Response.json({ success: true, slug: resultSlug, type: resultType, isNew })
}
