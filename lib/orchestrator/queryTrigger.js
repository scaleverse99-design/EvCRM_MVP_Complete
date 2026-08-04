// Trending-query auto-publish trigger.
//
// Every real-world MCP call (search_market / compare_vehicles) is a real
// user's question, asked through whatever AI tool they've connected our
// server to. This module counts how often the *same* question shape comes
// in, and once enough people have asked it, auto-publishes a keyword-rich
// article about it — then every future matching query gets the cached
// answer PLUS a link back to that article, driving traffic to evcrm.in.
//
// Cost/abuse note: this endpoint is public and unauthenticated (see the
// header comment in app/api/mcp/route.js — that's an explicit, deliberate
// design decision, not an oversight). Without limits, a scripted burst of
// identical queries could force-trigger unlimited paid Gemini generations.
// Two independent guards:
//   1. Atomic claim (conditional UPDATE ... WHERE published_article_slug IS
//      NULL) — only one concurrent request can win the race to generate for
//      a given signature, no duplicate generations.
//   2. A hard daily cap on auto-generated articles regardless of how many
//      distinct signatures cross the threshold that day.
import { getSupabaseAdmin } from "../supabaseAdmin"
import { callGemini, extractJson, isGeminiConfigured } from "./gemini"
import { fetchPeopleAlsoAsk } from "./intentEngine.js"
import { checkArticle } from "../blog/prePublishCheck.js"
import { WRITER_RULES } from "../blog/writerRules.js"
import { pingIndexNow } from "../indexnow"
import { slugify } from "../blog"
import { readTable, writeTable } from "../store"

const THRESHOLD = Number(process.env.CTE_ARTICLE_TRIGGER_THRESHOLD || 1)
const DAILY_ARTICLE_CAP = Number(process.env.CTE_ARTICLE_DAILY_CAP || 50)

// Normalize tool+args into a stable signature so "cheapest EV under 1.5L"
// and a re-ordered/re-cased version of the same query group together,
// without needing embeddings/semantic matching — bucketed exact-match on
// the meaningful filter fields is good enough at this stage and free.
function buildSignature(toolName, args = {}) {
  if (toolName === "search_market") {
    const category = (args.category || "any").toLowerCase()
    const brand = (args.brand || "any").toLowerCase()
    // Bucket price into 50k bands so 148000 and 150000 count as the same
    // "under 1.5L" question instead of splintering into separate signatures.
    const priceBucket = args.maxPrice ? Math.ceil(Number(args.maxPrice) / 50000) * 50000 : "any"
    const query = (args.query || "").toLowerCase().trim()
    return `search_market|cat=${category}|brand=${brand}|price<=${priceBucket}|q=${query}`
  }
  if (toolName === "compare_vehicles") {
    const names = (Array.isArray(args.names) ? args.names : [])
      .map(n => String(n).toLowerCase().trim()).sort()
    return `compare_vehicles|${names.join("+")}`
  }
  return null // only these two tools drive articles for now
}

// Exported: the MCP route turns a no-results search_market call into a
// natural-language topic for live sourcing, and must phrase it the same way
// the article writer does — one definition, not two that drift.
export function describeSignature(toolName, args = {}) {
  if (toolName === "search_market") {
    const parts = []
    if (args.category) parts.push(args.category.replace(/_/g, " "))
    if (args.brand) parts.push(args.brand)
    if (args.maxPrice) parts.push(`under ₹${Number(args.maxPrice).toLocaleString("en-IN")}`)
    if (args.query) parts.push(args.query)
    return parts.length ? parts.join(" ") : "EV market search"
  }
  if (toolName === "compare_vehicles") {
    return `${(args.names || []).join(" vs ")}`
  }
  return "vehicle query"
}

async function claimAndGenerate(sb, signature, toolName, args, sampleResult) {
  // Daily cap check first — cheap, avoids wasting the atomic claim if we're
  // already at the limit for today.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await sb.from("query_signals")
    .select("*", { count: "exact", head: true })
    .gte("published_at", since)
  if ((count || 0) >= DAILY_ARTICLE_CAP) return null

  // Atomic claim: only succeeds for exactly one concurrent caller.
  const { data: claimed, error: claimErr } = await sb
    .from("query_signals")
    .update({ published_article_slug: "PENDING" })
    .eq("signature", signature)
    .is("published_article_slug", null)
    .select()
    .maybeSingle()
  if (claimErr || !claimed) return null // lost the race, or already published

  try {
    if (!isGeminiConfigured()) throw new Error("Gemini not configured")

    const topic = describeSignature(toolName, args)

    // Real phrasings people type into Google for this topic, from
    // Autocomplete. This is what makes the article rank: "how much tata
    // nexon ev cost per km" is not a heading anyone would invent, but it is
    // what someone actually searched. 417 such phrasings came back for
    // "Tata Nexon EV" in testing.
    //
    // Internal-only on purpose — this used to be a public MCP tool
    // (get_search_intent), which gave the keyword research away and let a
    // stranger fan one call out into 22 requests to Google against our IPs.
    // Withdrawn from the public tool list 2026-08-03; the engine lives on
    // here, where it feeds our own content instead of a competitor's.
    //
    // Best-effort: never block or fail article generation on it. Google can
    // rate-limit or change this undocumented endpoint at any time, and an
    // article grounded in real data is still worth publishing without it.
    let realPhrasings = []
    try {
      const intent = await fetchPeopleAlsoAsk(topic)
      realPhrasings = (intent?.peopleAlsoAsk || []).slice(0, 8)
    } catch (e) {
      console.warn("[queryTrigger] intent lookup failed, writing without it:", e.message)
    }

    const prompt = `You are an automotive journalist for EvCRM.in, an Indian vehicle marketplace. ${THRESHOLD}+ real users asked AI assistants a version of this question: "${topic}".

Real matching data from our verified database:
${JSON.stringify(sampleResult, null, 2)}
${realPhrasings.length ? `
Real questions people search on Google about this topic — answer the ones the data above actually supports, using their wording as section headings so the article matches how people ask:
${realPhrasings.map(q => `- ${q}`).join("\n")}

Skip any question the data cannot answer. Do NOT invent an answer to make a heading work.
` : ""}
Write a useful 600-900 word article answering this question directly.

${WRITER_RULES}

Return ONLY a JSON object, no code fences:
{
  "title": "Search-friendly title, max 70 chars",
  "excerpt": "1-2 sentence summary, max 160 chars",
  "body": "Full article, plain text, '## ' headings only, double-newline paragraphs",
  "coverEmoji": "one emoji"
}`

    const { text } = await callGemini(prompt, { grounded: false, temperature: 0.6 })
    const draft = extractJson(text)
    if (!draft?.title || !draft?.body) throw new Error("Writer output missing title or body")

    const slug = slugify(draft.title)
    const nowIso = new Date().toISOString()
    const article = {
      id: `blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slug,
      type: "news",
      category: args.category || "auto_news",
      authorName: "EvCRM Newsroom",
      title: draft.title,
      excerpt: draft.excerpt || "",
      body: draft.body,
      coverEmoji: draft.coverEmoji || "🚗",
      status: "published",
      createdAt: nowIso,
      updatedAt: nowIso,
      publishedAt: nowIso,
      sourceNote: "Auto-published: trending query signal (CTE)",
    }

    const posts = await readTable("blog_posts")

    // Gate before publish, not after. This path publishes automatically
    // with no human in the loop, which is exactly where thin and templated
    // content has escaped before — the 2026-07-31 AdSense flag and the
    // 2026-08-04 batch of 15 identical "buying guides" both reached
    // production unreviewed. A blocked article is a topic we failed to
    // write well, not a page worth shipping.
    const verdict = checkArticle(article, posts, { category: args.category })
    if (!verdict.pass) {
      console.warn(`[queryTrigger] BLOCKED "${article.slug}": ${verdict.blockers.join(" | ")}`)
      throw new Error(`Pre-publish check failed: ${verdict.blockers[0]}`)
    }
    if (verdict.warnings.length) {
      console.warn(`[queryTrigger] published "${article.slug}" with warnings: ${verdict.warnings.join(" | ")}`)
    }

    posts.unshift(article)
    await writeTable("blog_posts", posts)

    try {
      pingIndexNow([`https://evcrm.in/blog/${slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])
    } catch { /* best-effort */ }

    await sb.from("query_signals")
      .update({ published_article_slug: slug, published_at: nowIso })
      .eq("signature", signature)

    return slug
  } catch (e) {
    // Release the claim on failure so a future query can retry instead of
    // permanently getting stuck on "PENDING".
    await sb.from("query_signals").update({ published_article_slug: null }).eq("signature", signature)
    console.error("[queryTrigger] article generation failed:", e.message)
    return null
  }
}

// Call this after computing a search_market/compare_vehicles result.
// Fire-and-forget from the caller's perspective is NOT safe here (we need
// the articleUrl for THIS response if one already exists), but the
// threshold-crossing generation path only runs for the rare triggering
// call, not every request — most calls just do a fast upsert+read.
export async function recordQuerySignal(toolName, args, sampleResult) {
  const signature = buildSignature(toolName, args)
  if (!signature) return null

  const sb = getSupabaseAdmin()
  if (!sb) return null

  try {
    const { data: existing } = await sb.from("query_signals").select("*").eq("signature", signature).maybeSingle()
    const nowIso = new Date().toISOString()

    if (existing) {
      await sb.from("query_signals").update({
        hit_count: (existing.hit_count || 1) + 1,
        last_seen: nowIso,
      }).eq("signature", signature)

      if (existing.published_article_slug && existing.published_article_slug !== "PENDING") {
        return `https://evcrm.in/blog/${existing.published_article_slug}`
      }
      if (!existing.published_article_slug && (existing.hit_count || 1) + 1 >= THRESHOLD) {
        const slug = await claimAndGenerate(sb, signature, toolName, args, sampleResult)
        return slug ? `https://evcrm.in/blog/${slug}` : null
      }
      return null
    }

    await sb.from("query_signals").insert({
      signature,
      tool_name: toolName,
      sample_args: args,
      hit_count: 1,
      first_seen: nowIso,
      last_seen: nowIso,
    })
    return null
  } catch (e) {
    console.error("[queryTrigger] recordQuerySignal failed:", e.message)
    return null // never let signal-logging break the actual MCP response
  }
}
