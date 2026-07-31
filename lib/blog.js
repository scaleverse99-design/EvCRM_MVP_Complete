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

// Gather the real, model-specific facts we actually hold: verified CTE
// market data (specs/pricing cross-checked across sources) plus our own live
// dealer inventory. This is the material that makes an article worth
// publishing — it's data no other site has, and it differs per model.
// Returns null when we know essentially nothing concrete.
async function gatherModelFacts(vehicle) {
  const facts = { listings: [], comparables: [] }

  // 1. Live inventory for this exact model across dealers.
  try {
    const inventory = await readTable("inventory")
    const sameModel = inventory.filter(v =>
      v.status === "IN_STOCK" &&
      (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED") &&
      v.brand?.toLowerCase() === vehicle.brand?.toLowerCase() &&
      v.model?.toLowerCase() === vehicle.model?.toLowerCase()
    )
    facts.listings = sameModel.map(v => ({
      variant: v.variant || undefined,
      year: v.year,
      condition: v.condition,
      kmDriven: v.condition === "used" ? v.km : undefined,
      exShowroomPriceINR: v.exShowroom || undefined,
      onRoadPriceINR: v.onRoadPrice || undefined,
      rangeKm: v.range || undefined,
      city: v.district,
      state: v.state,
      dealerName: v.dealerName,
    }))
    const prices = sameModel.map(v => v.exShowroom).filter(p => p > 0)
    if (prices.length) {
      facts.livePriceRangeINR = { low: Math.min(...prices), high: Math.max(...prices), listingCount: prices.length }
    }
    const cities = [...new Set(sameModel.map(v => v.district).filter(Boolean))]
    if (cities.length) facts.availableCities = cities
  } catch { /* inventory unavailable — fall through */ }

  // 2. CTE verified market data for this model + real comparables in the
  //    same category, so the article can make a grounded comparison rather
  //    than a generic one.
  try {
    const { getSupabaseAdmin } = await import("./supabaseAdmin")
    const sb = getSupabaseAdmin()
    if (sb) {
      const { data: matches } = await sb.from("products").select("*")
        .ilike("name", `%${vehicle.model}%`).limit(1)
      const product = matches?.[0]
      if (product) {
        facts.verified = {
          name: product.name,
          currentPriceINR: product.current_price || undefined,
          specs: product.specs || undefined,
          transparencyScores: {
            overall: product.overall_score,
            quality: product.quality_score,
            value: product.value_score,
            satisfaction: product.satisfaction_score,
          },
          sourcedFrom: product.source,
          asOf: product.crawled_at,
        }

        const { data: peers } = await sb.from("products").select("name,brand,current_price,specs,overall_score")
          .eq("category", product.category).neq("id", product.id)
          .order("overall_score", { ascending: false, nullsFirst: false }).limit(4)
        facts.comparables = (peers || []).map(p => ({
          name: p.name, brand: p.brand, priceINR: p.current_price || undefined,
          specs: p.specs || undefined, overallScore: p.overall_score,
        }))
      }
    }
  } catch { /* CTE unavailable — fall through */ }

  // Nothing concrete to say → don't publish filler. A page that only
  // restates what a model is, with no real pricing, specs, availability, or
  // comparison, is exactly the "thin content / little added value" Google's
  // spam policy names — and it drags down every other page on the domain.
  const hasSubstance = facts.verified || facts.listings.length > 0
  return hasSubstance ? facts : null
}

// Auto-generate a model-hub article if one doesn't already exist for this
// vehicle's model. Called by every inventory-creating code path so dealers
// never have to think about it. `author` only needs { dealership, name }.
//
// Articles are grounded in real data we hold (verified CTE specs/pricing +
// live dealer inventory) rather than written from the model's own general
// knowledge. The earlier version prompted for a fixed 400-600 word shape
// with a templated title ("Best reasons to buy the {brand} {model}"), which
// produced near-identical cookie-cutter pages across every model — flagged
// live by AdSense as "low value content" (2026-07-31). Grounding in
// per-model real data is what makes these pages genuinely distinct.
export async function ensureModelArticle(vehicle, author) {
  if (!GEMINI_API_KEY) return null // AI not configured, skip silently

  const modelKey = getModelKey(vehicle.brand, vehicle.model)
  if (!modelKey) return null

  const posts = await readTable("blog_posts")
  const existing = posts.find(p => p.modelKey === modelKey && p.status === "published")
  if (existing) return existing.id // Article already exists for this model

  const facts = await gatherModelFacts(vehicle)
  if (!facts) {
    console.warn(`Skipping article for ${modelKey}: no verified specs or live listings to ground it in.`)
    return null
  }

  const prompt = `You are an automotive journalist writing for EvCRM.in, an Indian vehicle marketplace. Write a buyer's guide for the ${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ""}.

You have been given REAL, VERIFIED DATA below — cross-checked specs and pricing from our market database, plus our own live dealer inventory. This data is the whole point of the article: it is current, specific, and not available on other sites. Build the piece around it.

REAL DATA:
${JSON.stringify(facts, null, 2)}

RULES — these matter more than style:
- Use ONLY the figures in the data above. Do not add specs, prices, or claims that are not there. If something isn't in the data (charging time, boot space, warranty terms), simply don't discuss it — do not estimate or fill it in from general knowledge.
- Lead with what is concretely true about THIS model right now: its actual price, its actual verified specs, what's actually in stock and where.
- If comparables are provided, make a real comparison using their real numbers — how it actually stacks up, including where it loses. An honest weakness is more useful to a buyer than a list of strengths, and it's what makes the page worth reading.
- If live listings exist, say what's genuinely available (price range, cities, new vs used) — that's information a buyer can act on today.
- Prices in Indian format (Rs. or lakhs). Write "Rs." not the rupee symbol.
- No marketing voice. No "look no further", no "in today's fast-paced world", no invented owner quotes. Write like someone who has actually looked at the numbers.

STRUCTURE — vary it to fit this specific model's story; do not follow a fixed template:
- Roughly 700-1000 words.
- Use '## ' headings that describe what's actually in each section for THIS model, not generic labels like "Features" or "Conclusion".
- Open with the single most useful concrete fact for a buyer, not a preamble about the brand.

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "specific, honest title under 70 chars — reflect this model's actual standout fact (a real price, a real range figure, a real trade-off). Do NOT use a fill-in-the-blank formula.",
  "excerpt": "1-2 sentence summary with a concrete number in it (max 160 chars)",
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

      // Require a real title AND a substantive body. The previous version
      // fell back to a templated "{brand} {model}: Buyer's Guide" title and
      // would publish with `body: ""` — an empty page, live and indexed.
      // A failed generation should retry on the next model, not ship a stub.
      if (!parsed.title?.trim()) throw new Error("Generation returned no title")
      if (!parsed.body || parsed.body.trim().length < 500) {
        throw new Error(`Generation returned a too-short body (${parsed.body?.trim().length || 0} chars)`)
      }

      const slug = slugify(`${vehicle.brand} ${vehicle.model}`)
      const now = new Date().toISOString()

      const article = {
        id: `blog_${Date.now()}`,
        slug,
        modelKey,
        dealership: author?.dealership || "",
        authorName: author?.name || "EvCRM",
        title: parsed.title.trim(),
        excerpt: parsed.excerpt || "",
        body: parsed.body,
        // Traceability: which real data this article was grounded in, so a
        // later reader can tell verified-data articles from anything else.
        groundedIn: {
          verifiedProduct: !!facts.verified,
          liveListings: facts.listings.length,
          comparables: facts.comparables.length,
        },
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

