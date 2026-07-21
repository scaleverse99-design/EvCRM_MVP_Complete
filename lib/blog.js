import { readTable, writeTable } from "./store"
import { pingIndexNow } from "./indexnow"

// Turn a title into a URL-safe slug. A short random suffix guarantees
// uniqueness without a collision-check round-trip (two "Maruti Ertiga
// Review 2026" posts must not clobber each other's URL).
export function slugify(title) {
  const base = (title || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "post"
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

// Model-hub key from brand+model (e.g. "Tata Nexon EV Max" → "tata-nexon-ev-max").
// Shared by every code path that can introduce a vehicle into inventory
// (manual Add Vehicle, Procurement→Purchased conversion, future imports) so
// they all land on the same one-article-per-model hub page.
export function getModelKey(brand, model) {
  if (!brand || !model) return null
  return `${brand} ${model}`.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
}

// Auto-generate a model-hub article if one doesn't already exist for this
// vehicle's model. Called by every inventory-creating code path so dealers
// never have to think about it. `author` only needs { dealership, name }.
export async function ensureModelArticle(vehicle, author) {
  if (!GEMINI_API_KEY) return null // AI not configured, skip silently

  const modelKey = getModelKey(vehicle.brand, vehicle.model)
  if (!modelKey) return null

  const posts = await readTable("blog_posts")
  const existing = posts.find(p => p.modelKey === modelKey && p.status === "published")
  if (existing) return existing.id // Article already exists for this model

  const prompt = `You are an automotive content writer for an Indian vehicle marketplace (evcrm.in). Write a helpful, SEO-friendly buyer's guide for: "${vehicle.brand} ${vehicle.model}"${vehicle.year ? ` (${vehicle.year})` : ""}.

Requirements:
- Indian market context: prices in ₹/lakhs, charging time for EVs, service network, resale value
- Natural, trustworthy tone. NO invented specs or prices you're unsure of.
- 400-600 words, structured with 3-4 short sections.
- Focus on WHY buyers choose this model, key features, and practical considerations

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "an SEO-friendly title (max 70 chars) like 'Best reasons to buy the ${vehicle.brand} ${vehicle.model}'",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings."
}`

  let lastError = null
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI response")

      const parsed = JSON.parse(text)
      const slug = slugify(`${vehicle.brand} ${vehicle.model}`)
      const now = new Date().toISOString()

      const article = {
        id: `blog_${Date.now()}`,
        slug,
        modelKey,
        dealership: author?.dealership || "",
        authorName: author?.name || "EvCRM",
        title: parsed.title || `${vehicle.brand} ${vehicle.model}: Buyer's Guide`,
        excerpt: parsed.excerpt || "",
        body: parsed.body || "",
        status: "published",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      }

      posts.unshift(article)
      await writeTable("blog_posts", posts)

      pingIndexNow([`https://evcrm.in/blog/${article.slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])

      return article.id
    } catch (e) {
      lastError = e.message
    }
  }

  console.error(`Failed to auto-generate article for ${modelKey}: ${lastError}`)
  return null
}

// Link a vehicle to its model's article in the junction table.
export async function linkVehicleToArticle(vehicleId, articleId) {
  const links = await readTable("article_vehicles")
  links.unshift({
    id: `link_${Date.now()}`,
    articleId,
    vehicleId,
    createdAt: new Date().toISOString(),
  })
  await writeTable("article_vehicles", links)
}

export const KNOWLEDGE_CATEGORIES = ["EV Fundamentals", "ICE Fundamentals", "Buying Guides", "Tech Trends"]

// Answer a visitor's typed search query as a standalone Knowledge Hub
// article — used by /api/learn/search when no existing article already
// covers the question closely enough. Written from Gemini's own trained
// knowledge (same as the seed batch), not live web grounding — sufficient
// for evergreen "how does X work" / "which is better X or Y" questions,
// which is the vast majority of what a search bar on an education hub gets
// asked. Returns the parsed draft or null if generation fails outright.
export async function generateKnowledgeAnswer(query) {
  if (!GEMINI_API_KEY) return null

  const prompt = `You are answering a real visitor's question typed into the search bar on EvCRM's "Learn" knowledge hub (evcrm.in/learn) — an Indian vehicle marketplace's educational content section. The question:

"${query}"

Write a complete, standalone article that fully answers this question so the reader has no reason to look anywhere else.

Requirements:
- Written for a curious first-time reader — explain technical terms in plain language before using them
- Indian market context where relevant (₹ pricing, Indian roads/regulations, availability in India)
- Accurate — no invented statistics, specs, or prices you're not confident about
- 400-650 words, structured with 2-4 clear sections
- If the question isn't really about vehicles/EVs/automobiles, still answer it helpfully but briefly (100-150 words), and gently note this site focuses on vehicles
- Use plain straight quotes only in the body text — no curly/smart quotes — so the JSON stays valid

Also produce, to make the page visual instead of a wall of text:
- keyTakeaways: 3-5 short punchy points (each under 12 words), each with one representative emoji — the reader should get the gist just from these
- pullQuote: one striking, standalone sentence pulled or adapted from the article (under 20 words) — something worth highlighting visually
- comparisonTable: ONLY if the topic is naturally comparative (e.g. "X vs Y", transmission/engine/battery types, buying options) — a small table with a title, 2-4 short column headers, and 2-5 rows comparing them (use a single word, a short phrase, or 🟢/🟡/🔴 for quick visual comparison). Set to null if the topic isn't naturally comparative — don't force one.

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "a clear title that answers the question (max 70 chars)",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings.",
  "category": "one of exactly: EV Fundamentals, ICE Fundamentals, Buying Guides, Tech Trends",
  "coverEmoji": "one emoji that best represents this topic",
  "keyTakeaways": [{"icon": "⚙️", "text": "short punchy point"}],
  "pullQuote": "one striking sentence, or empty string if nothing fits",
  "comparisonTable": {"title": "short title", "headers": ["", "Option A", "Option B"], "rows": [["Metric", "value", "value"]]}
}`

  let lastError = null
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.6 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI response")
      return JSON.parse(text)
    } catch (e) {
      lastError = e.message
    }
  }

  console.error(`Failed to generate answer for query "${query}": ${lastError}`)
  return null
}

