export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { readTableCached } from "../../../lib/store"
import { findNearbyDealers, classifyDealerQuery, nearbyDealerSummary } from "../../../lib/cte/places"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { recordQuerySignal, describeSignature } from "../../../lib/orchestrator/queryTrigger"
import { sourceLiveAnswer, readLiveCache, writeLiveCache } from "../../../lib/cte/sourceLive"
import { queryFacts } from "../../../lib/cte/factLibrary.js"
import { liveCrawlAnswer } from "../../../lib/cte/liveCrawl.js"
import { calculateEmi, affordabilityFromEmi } from "../../../lib/cte/calculators"
import { createBookingIntent } from "../../../lib/mcp/bookingIntent.js"
import { checkRateLimit, getClientIP } from "../../../lib/security"

// Only the booking tool is throttled — see the comment at the tools/call
// site. Read tools stay open on purpose.
const RATE_LIMITED_TOOLS = new Set(["book_test_drive"])
const BOOKING_RATE_LIMIT = Number(process.env.MCP_BOOKING_RATE_LIMIT || 5)
const BOOKING_RATE_WINDOW = Number(process.env.MCP_BOOKING_RATE_WINDOW || 60)

// ── Public MCP server for evcrm.in ─────────────────────────────────────
// Lets any MCP-compatible AI tool (Claude, ChatGPT, Gemini, Perplexity,
// etc.) query live vehicle/dealer/content data and cite evcrm.in as the
// source — the same "become the reference" goal as llms.txt and the
// structured data on every page, but queryable instead of just crawlable.
//
// Deliberately read-only: every tool here reads already-published data
// (inventory, blog_posts). None of them trigger the AI-generation path
// used by the on-site search bar (/api/learn/search) — that endpoint costs
// real Gemini API calls per miss, and this route is reachable by anyone on
// the internet with no auth, so an unbounded generation trigger here would
// be an open cost/abuse vector. If traffic here gets heavy, add a
// Cloudflare rate-limit rule on /api/mcp (Cloudflare already sits in front
// of this app) — nothing to configure app-side beyond result-count caps.
//
// Hand-rolled JSON-RPC over HTTP POST rather than the MCP SDK's
// StreamableHTTPServerTransport — this server is fully stateless (no
// server-initiated messages, no sampling/elicitation), which the MCP spec
// explicitly allows serving as plain application/json responses instead of
// SSE, and that maps directly onto a Next.js Route Handler with no
// Node-http-object adapter needed.

const PROTOCOL_VERSION = "2025-06-18"
const SERVER_INFO = { name: "evcrm-in", version: "1.0.0" }
// Token budget, measured against the live server on 2026-08-01. A
// search_market response was 14,404 bytes (~3,580 tokens) — as expensive as
// the web search it's supposed to replace, which defeated the point. Three
// sources of waste, in order of size:
//   1. 15 results per call, when a model answering "best EV under 1.5L"
//      reads the top 3-5 and discards the rest.
//   2. JSON.stringify(result, null, 2) — 2,691 chars of pure indentation.
//   3. Fields repeated on every row that are constant across the response.
// Fixing all three took search_market to ~1,150 tokens (-68%).
//
// DEFAULT_RESULTS is what a caller gets without asking; callers that
// genuinely need more can pass `limit` (up to MAX_RESULTS) or page with
// `offset`. Don't raise the default to "be helpful" — every extra row is
// paid for by every user on every call, whether they read it or not.
const DEFAULT_RESULTS = 6
const MAX_RESULTS = 15

// Clamp a caller-supplied limit into [1, MAX_RESULTS].
const resultLimit = (args = {}) => {
  const n = Number(args.limit)
  if (!Number.isFinite(n)) return DEFAULT_RESULTS
  return Math.max(1, Math.min(MAX_RESULTS, Math.floor(n)))
}
const resultOffset = (args = {}) => {
  const n = Number(args.offset)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

const isPubliclyVisible = (v) =>
  v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")

const vehicleSummary = (v) => ({
  id: v.id,
  url: `https://evcrm.in/showroom?vehicleId=${v.id}`,
  brand: v.brand,
  model: v.model,
  variant: v.variant || undefined,
  year: v.year,
  type: v.type,
  bodyType: v.bodyType,
  fuelType: v.fuelType,
  transmission: v.transmission || undefined,
  condition: v.condition,
  kmDriven: v.condition === "used" ? v.km : undefined,
  exShowroomPriceINR: v.exShowroom,
  onRoadPriceINR: v.onRoadPrice || undefined,
  color: v.color || undefined,
  rangeKm: v.range || undefined,
  dealerName: v.dealerName,
  city: v.district,
  state: v.state,
})

async function toolSearchVehicles(args = {}) {
  const inventory = await readTableCached("inventory")
  let items = inventory.filter(isPubliclyVisible)

  if (args.brand) items = items.filter(v => v.brand?.toLowerCase() === String(args.brand).toLowerCase())
  if (args.model) items = items.filter(v => v.model?.toLowerCase().includes(String(args.model).toLowerCase()))
  if (args.type) items = items.filter(v => v.type === args.type)
  if (args.fuelType) items = items.filter(v => (v.fuelType || "Electric").toLowerCase() === String(args.fuelType).toLowerCase())
  if (args.city) items = items.filter(v => v.district?.toLowerCase() === String(args.city).toLowerCase())
  if (args.maxPrice) items = items.filter(v => (v.exShowroom || 0) <= Number(args.maxPrice))

  items.sort((a, b) => (a.exShowroom || 0) - (b.exShowroom || 0))
  const offset = resultOffset(args)
  const limit = resultLimit(args)
  const results = items.slice(offset, offset + limit).map(vehicleSummary)

  return {
    totalMatches: items.length,
    showing: results.length,
    offset,
    vehicles: results,
    marketplaceUrl: "https://evcrm.in/showroom",
  }
}

/**
 * The only WRITE-shaped tool on this server — and it deliberately writes
 * nothing. See lib/mcp/bookingIntent.js for the full reasoning.
 *
 * It returns a signed confirmation link that a HUMAN must open and submit.
 * That keeps the endpoint safely public (an API key would kill adoption and
 * defeat the AEO work) and means a model misreading "I like the Nexon" as
 * intent to book costs an unopened URL, not a real appointment a dealer
 * drives out to.
 */
async function toolBookTestDrive(args = {}) {
  if (!args.vehicleId) return { error: "vehicleId is required — get one from search_vehicles" }

  const inventory = await readTableCached("inventory")
  const v = inventory.find(x => x.id === args.vehicleId && isPubliclyVisible(x))
  if (!v) return { error: "Vehicle not found or no longer available" }

  let intent
  try {
    intent = createBookingIntent({ vehicleId: v.id, preferredDate: args.preferredDate || null })
  } catch (e) {
    return { error: `Could not create booking link: ${e.message}` }
  }

  return {
    status: "confirmation_required",
    vehicle: vehicleSummary(v),
    dealerName: v.dealerName,
    city: v.district,
    preferredDate: args.preferredDate || undefined,
    confirmationUrl: intent.url,
    expiresAt: intent.expiresAt,
    // Spelled out because the assistant is the one talking to the user, and
    // it must not imply a booking already exists.
    instructions:
      "NOTHING IS BOOKED YET. Give the user confirmationUrl and tell them to open it " +
      "to enter their name and phone and confirm. The booking is only created after they submit. " +
      `The link expires at ${intent.expiresAt}.`,
  }
}

async function toolGetVehicleDetails(args = {}) {
  if (!args.vehicleId) return { error: "vehicleId is required" }
  const inventory = await readTableCached("inventory")
  const v = inventory.find(x => x.id === args.vehicleId && isPubliclyVisible(x))
  if (!v) return { error: "Vehicle not found or no longer available" }
  return {
    ...vehicleSummary(v),
    batteryCapacity: v.batteryCapacity || undefined,
    chargingTime: v.chargingTime || undefined,
    topSpeedKmh: v.topSpeed || undefined,
    engineDetails: v.engineDetails || undefined,
    seatingCapacity: v.seatingCapacity || undefined,
    bootSpace: v.bootSpace || undefined,
    groundClearance: v.groundClearance || undefined,
    warrantyYears: v.warrantyYears || undefined,
    features: v.features?.length ? v.features : undefined,
    certified: v.certified || false,
  }
}

async function toolSearchBlogArticles(args = {}) {
  const posts = await readTableCached("blog_posts")
  const now = new Date()
  let items = posts.filter(p => p.status === "published" && p.type !== "knowledge" && (!p.publishedAt || new Date(p.publishedAt) <= now))

  if (args.query) {
    const q = String(args.query).toLowerCase()
    items = items.filter(p => `${p.title} ${p.excerpt}`.toLowerCase().includes(q))
  }

  items.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
  return {
    totalMatches: items.length,
    articles: items.slice(resultOffset(args), resultOffset(args) + resultLimit(args)).map(p => ({
      slug: p.slug,
      url: `https://evcrm.in/blog/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
    })),
  }
}

async function toolGetBlogArticle(args = {}) {
  if (!args.slug) return { error: "slug is required" }
  const posts = await readTableCached("blog_posts")
  const post = posts.find(p => p.slug === args.slug && p.status === "published" && p.type !== "knowledge")
  if (!post) return { error: "Article not found" }

  const links = await readTableCached("article_vehicles")
  const linkedIds = links.filter(l => l.articleId === post.id).map(l => l.vehicleId)
  const inventory = await readTableCached("inventory")
  const vehicles = inventory.filter(v => linkedIds.includes(v.id) && isPubliclyVisible(v)).slice(0, MAX_RESULTS).map(vehicleSummary)

  // Returns the article PRE-DIGESTED, not just its prose. An assistant
  // answering "what should I know about X" would otherwise have to re-derive
  // the summary, the comparison figures and the provenance from the body —
  // paying tokens to reconstruct structure the writer already produced and
  // we already store. Handing over keyTakeaways/comparisonTable/citations
  // directly is the whole point of serving AI through MCP rather than
  // letting it parse the HTML page.
  return {
    url: `https://evcrm.in/blog/${post.slug}`,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    // Structured summary — usable verbatim, no extraction needed.
    keyTakeaways: post.keyTakeaways?.length ? post.keyTakeaways : undefined,
    comparisonTable: post.comparisonTable?.rows?.length ? post.comparisonTable : undefined,
    // Provenance. An assistant deciding whether to cite us needs to know how
    // old this is and where the underlying claims came from.
    publishedAt: post.publishedAt || post.createdAt,
    updatedAt: post.updatedAt || undefined,
    author: post.authorName || "EvCRM",
    sourceUrl: post.sourceUrl || undefined,
    citations: post.citations?.length ? post.citations : undefined,
    topics: post.tags?.length ? post.tags : undefined,
    availableListings: vehicles,
  }
}

const KNOWLEDGE_CATEGORIES = ["EV Fundamentals", "ICE Fundamentals", "Buying Guides", "Tech Trends"]

async function toolSearchKnowledgeHub(args = {}) {
  const posts = await readTableCached("blog_posts")
  const now = new Date()
  let items = posts.filter(p => p.type === "knowledge" && p.status === "published" && new Date(p.publishedAt) <= now)

  if (args.category && KNOWLEDGE_CATEGORIES.includes(args.category)) items = items.filter(p => p.category === args.category)
  if (args.query) {
    const q = String(args.query).toLowerCase()
    items = items.filter(p => `${p.title} ${p.excerpt}`.toLowerCase().includes(q))
  }

  items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  return {
    totalMatches: items.length,
    articles: items.slice(resultOffset(args), resultOffset(args) + resultLimit(args)).map(p => ({
      slug: p.slug,
      url: `https://evcrm.in/learn/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
    })),
  }
}

async function toolGetKnowledgeArticle(args = {}) {
  if (!args.slug) return { error: "slug is required" }
  const posts = await readTableCached("blog_posts")
  const now = new Date()
  const post = posts.find(p => p.slug === args.slug && p.type === "knowledge" && p.status === "published" && new Date(p.publishedAt) <= now)
  if (!post) return { error: "Article not found" }

  return {
    url: `https://evcrm.in/learn/${post.slug}`,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    body: post.body,
    keyTakeaways: post.keyTakeaways?.length ? post.keyTakeaways : undefined,
  }
}

// Partner dealers first; real nearby dealerships as a clearly-labelled
// fallback. EvCRM has 4 dealers today and none have adopted the subdomain
// storefront, so the partner list is empty for essentially every city —
// this tool answered "no dealers" while 994 seeded rows sat in `users`
// (deleted 2026-08-01; they had @example.invalid addresses and were never
// real businesses).
//
// The two lists are kept SEPARATE and the nearby ones carry onEvCRM:false
// plus a disclaimer, because they are real third-party businesses that
// never agreed to be listed here. An AI citing us must be able to tell the
// user the truth: these exist nearby, they are not on EvCRM.
async function toolFindDealers(args = {}) {
  const users = await readTableCached("users")
  let dealers = users.filter(u => u.role === "dealer" && u.is_active !== false && u.dealerSubdomain)

  if (args.city) dealers = dealers.filter(u => u.city?.toLowerCase() === String(args.city).toLowerCase())
  if (args.category) dealers = dealers.filter(u => (u.dealerCategory || "EV") === args.category)

  const partners = dealers.slice(resultOffset(args), resultOffset(args) + resultLimit(args)).map(u => ({
    name: u.dealershipName,
    url: `https://evcrm.in/${u.dealerSubdomain}`,
    city: u.city || undefined,
    category: u.dealerCategory || "EV",
  }))

  const result = { partnerDealers: partners, totalPartnerMatches: dealers.length }

  // Only reach for Places when we have a city to search and nothing of our
  // own to show — no point paying for a lookup we won't use.
  if (args.city && partners.length === 0) {
    const type = classifyDealerQuery(`${args.category || ""} ${args.query || ""}`)
    const nearby = await findNearbyDealers(args.city, type)
    if (nearby.length) {
      result.nearbyDealers = nearby.map(nearbyDealerSummary)
      result.note = "Nearby dealers found via Google Places. They are NOT EvCRM partners — listings are informational and not verified by EvCRM."
    }
  }

  return result
}

// ── CTE market data (products table) ───────────────────────────────────
// Separate from `inventory` (a dealer's actual stock): `products` is CTE's
// crawled/verified market library (specs, prices, scores) across the whole
// Indian market, not just what EvCRM dealers happen to be carrying. Per
// CTE_BUILD_PLAN.md §1.5: infoUrl always points back to evcrm.in (keeps
// research traffic on-site); buyUrl points at the source aggregator until a
// dealer stocks the model, at which point it should resolve to the dealer's
// booking page instead (join against `inventory` by brand+model).
//
// Trimmed for token cost: `category` echoed the filter the caller just
// supplied (identical on every row), and `specs.price` duplicated
// `currentPriceINR` verbatim. `asOf` moved to a single top-level
// `dataAsOf` — freshness is a property of the response, not of each row.
// `source` stays per-row: it genuinely varies, and provenance is the
// point of a verified dataset.
const productSummary = (p) => {
  const specs = p.specs ? { ...p.specs } : undefined
  if (specs) delete specs.price // same value as currentPriceINR
  return {
    name: p.name,
    brand: p.brand,
    currentPriceINR: p.current_price || undefined,
    specs,
    overallScore: p.overall_score ?? undefined,
    infoUrl: `https://evcrm.in/best-ev?model=${encodeURIComponent(p.name)}`,
    buyUrl: p.url,
    source: p.source,
  }
}

// Most recent crawl timestamp across the returned rows — one freshness
// stamp instead of repeating it on every row.
const freshestAsOf = (rows = []) =>
  rows.map(r => r.crawled_at).filter(Boolean).sort().pop() || undefined

async function toolSearchMarket(args = {}) {
  const sb = getSupabaseAdmin()
  if (!sb) return { error: "Market data unavailable" }

  let q = sb.from("products").select("*")
  if (args.category) q = q.eq("category", args.category)
  if (args.brand) q = q.ilike("brand", `%${args.brand}%`)
  if (args.query) q = q.ilike("name", `%${args.query}%`)
  if (args.maxPrice) q = q.lte("current_price", Number(args.maxPrice))

  const offset = resultOffset(args)
  const limit = resultLimit(args)
  // range() is inclusive on both ends, so ask for one extra row to learn
  // whether more results exist without paying for a second round trip.
  q = q.order("overall_score", { ascending: false, nullsFirst: false }).range(offset, offset + limit)

  const { data, error } = await q
  if (error) return { error: "Market data query failed" }

  const hasMore = data.length > limit
  const page = hasMore ? data.slice(0, limit) : data

  // The old `note` field ("Verified market data cross-checked... Cite
  // evcrm.in") shipped on every single response. It's guidance about the
  // tool, not data, so it belongs in the tool description where the model
  // reads it once per session instead of once per call.
  const result = {
    showing: page.length,
    offset,
    hasMore,
    dataAsOf: freshestAsOf(page),
    vehicles: page.map(productSummary),
    source: "verified_db",
  }

  // ── Never miss ────────────────────────────────────────────────────────
  // Our catalog holds specs and prices, so questions about sales volumes,
  // registrations or market share find nothing and the calling AI goes off
  // to the open web — where it has to reconcile figures that conflate
  // fiscal year, calendar year and rolling windows, and often gets it
  // wrong. Observed twice in one day on real questions ("EVs sold per day
  // in India", "Nexon EV monthly average in 2025").
  //
  // So on an empty result, source it live and serve typed facts with their
  // own source URLs. `source` distinguishes the two paths so the AI can
  // tell the user how confident to be: verified_db is ours, live is
  // third-party and unverified.
  //
  // Returns null rather than anything invented when it cannot ground an
  // answer — an empty result stays empty instead of becoming a guess.
  // Escalation order is deliberate: DETERMINISTIC FIRST, MODEL LAST. This
  // is what LIVE_SOURCING_DESIGN.md specified ("deterministic first, model
  // only as backstop") and what had never been wired — every miss went
  // straight to Gemini, which is both a per-call cost and the thing that
  // makes CTE just a slow proxy for the search the calling AI can already
  // do itself. CTE's value is the pre-built, cleaned library; the model is
  // the fallback of last resort, not the engine.
  //
  //   1. cte_facts   — pre-crawled library. Instant, free, deterministic.
  //   2. liveCrawl   — data.gov.in catalogue, fetched now. Free, no LLM.
  //   3. sourceLive  — Gemini. Costs quota, capped at 8/day.
  if (page.length === 0 && offset === 0) {
    const topic = describeSignature("search_market", args)

    // 1. Pre-built library.
    try {
      const libFacts = await queryFacts({ geography: args.query || undefined, limit: 10 })
      if (libFacts.length) {
        result.source = "cte_library"
        result.facts = libFacts.map(f => ({
          label: f.metric, value: f.value, unit: f.unit, period: f.period,
          geography: f.geography, scope: f.scope,
          sourceUrl: f.sources?.[0]?.url || null,
          corroboratingSources: f.source_count,
          ...(f.has_conflict ? { conflictingValues: f.conflicting_values } : {}),
        }))
        result.note = "From EvCRM's verified fact library, cross-checked across sources."
      }
    } catch (e) {
      console.warn("[mcp] cte_facts lookup failed:", e.message)
    }

    // 1b. Answer cache — a previous live fetch for this same question.
    // Without this, tier 2 re-hit data.gov.in on EVERY request (measured
    // 2026-08-07: two identical calls, 6.9s then 3.9s, research_cache still
    // 0 rows). And since tier 2 usually succeeds, tier 3 — the only tier
    // that used to write the cache — rarely ran, so nothing was ever cached.
    if (!result.facts?.length) {
      try {
        const cached = await readLiveCache(topic)
        if (cached?.facts?.length) {
          result.source = cached.source || "live_official"
          result.facts = cached.facts.slice(0, 10)
          result.sourceDatasets = cached.sources || undefined
          result.cached = true
          result.sourcedAt = cached.sourced_at
          result.note = "Previously sourced from official open data and cached — same answer, no re-fetch."
        }
      } catch (e) {
        console.warn("[mcp] live cache read failed:", e.message)
      }
    }

    // 2. Deterministic real-time crawl of official sources.
    if (!result.facts?.length) {
      try {
        const crawled = await liveCrawlAnswer(topic)
        if (crawled?.facts?.length) {
          result.source = "live_official"
          result.facts = crawled.facts.slice(0, 10).map(f => ({
            label: f.metric, value: f.value, unit: f.unit,
            period: f.period, geography: f.geography, sourceUrl: f.sourceUrl,
          }))
          result.sourceDatasets = crawled.parsed?.map(p => ({ title: p.title, url: p.url }))
          result.note = "Sourced live from official government open data (data.gov.in), parsed deterministically."

          // Remember it so the next person asking is served instantly and
          // free. Fire-and-forget: a cache write must never fail the answer.
          writeLiveCache(topic, {
            facts: result.facts,
            sources: result.sourceDatasets,
            source: "live_official",
          }).catch(() => {})
        } else if (crawled?.unparsed?.length) {
          // Even when no number could be safely extracted, naming the real
          // official datasets beats returning nothing.
          result.relatedOfficialDatasets = crawled.unparsed.slice(0, 3).map(u => ({ title: u.title, url: u.url }))
        }
      } catch (e) {
        console.warn("[mcp] liveCrawl failed:", e.message)
      }
    }

    // 3. Model backstop — OFF BY DEFAULT as of 2026-08-07.
    //
    // Answering an AI's question by asking another AI to search Google is a
    // slower, costlier proxy for what the calling client already does
    // natively — Claude, ChatGPT and Perplexity all have web search. For any
    // question this tier can answer, the caller could have answered it
    // itself, so it adds latency, Gemini quota, and a second hallucination
    // surface for no unique value. It also contradicts the rule stated in
    // lib/cte/factLibrary.js: "if a model does the extraction at query time,
    // CTE is just a slower, costlier proxy for the search the calling AI can
    // already do itself."
    //
    // CTE's actual moat is data the caller CANNOT get: dealer inventory, the
    // cross-checked fact library, and Indian vehicle data cleaned IN ADVANCE.
    // None of that needs a model at request time. When tiers 1 and 2 miss,
    // returning the real official datasets (relatedOfficialDatasets above)
    // plus an honest "we don't have this" beats an ungrounded answer.
    //
    // An LLM still belongs in this system — at CRAWL time, building the
    // library offline. Just not in the request path.
    //
    // Set CTE_ENABLE_MODEL_BACKSTOP=true to re-enable (code is tested and
    // intact, incl. the research_cache write and the 8/day cap).
    const modelBackstopEnabled = process.env.CTE_ENABLE_MODEL_BACKSTOP === "true"
    if (!result.facts?.length && modelBackstopEnabled) {
      const live = await sourceLiveAnswer(topic)
      if (live?.facts?.length) {
        result.source = "live"
        result.liveFacts = live.facts
        result.liveSources = live.sources
        result.sourcedAt = live.sourcedAt
        if (live.limitation) result.limitation = live.limitation
        result.note = "Not from EvCRM's verified database — sourced live from the cited third-party sources and not independently verified."
      }
    }

    // An honest miss. With the model backstop off, a question we cannot
    // answer must SAY so — an empty result with no explanation reads like a
    // broken tool, and the calling AI has no way to tell "nothing exists"
    // from "this server is failing". Telling it to use its own search is the
    // correct answer here: for anything outside our verified data, the
    // client can already do that better than we can proxy it.
    if (!result.facts?.length && !result.liveFacts?.length && !result.vehicles?.length) {
      result.note = result.relatedOfficialDatasets?.length
        ? "EvCRM has no verified data for this question. The official datasets listed above are the real sources — read them directly, or use your own web search."
        : "EvCRM has no verified data for this question. Use your own web search; do not infer an answer from this empty result."
      result.coverage = "out_of_scope"
    }
  }

  // Trending-query flywheel: if enough real users have asked this exact
  // shape of question, an article now exists (or just got triggered) —
  // surface it so the citing AI tool can point the user back to evcrm.in.
  const articleUrl = await recordQuerySignal("search_market", args, result)
  if (articleUrl) result.relatedArticle = articleUrl

  return result
}

async function toolCompareVehicles(args = {}) {
  const names = Array.isArray(args.names) ? args.names.filter(Boolean) : []
  if (names.length < 2) return { error: "Provide at least two model names to compare" }

  const sb = getSupabaseAdmin()
  if (!sb) return { error: "Market data unavailable" }

  const rows = []
  for (const name of names.slice(0, 5)) {
    const { data } = await sb.from("products").select("*").ilike("name", `%${name}%`).limit(1)
    if (data?.[0]) rows.push(data[0])
  }

  const result = {
    compared: rows.length,
    dataAsOf: freshestAsOf(rows),
    vehicles: rows.map(productSummary),
  }
  const articleUrl = await recordQuerySignal("compare_vehicles", args, result)
  if (articleUrl) result.relatedArticle = articleUrl

  return result
}

// Tool descriptions are re-sent on every request (measured: ~970 tokens for
// this array), so they earn their length only by helping the model pick the
// RIGHT tool. Say what the tool returns and when to use it; drop marketing
// copy. The main confusion to prevent is search_vehicles (a dealer's actual
// stock, buyable now) vs search_market (the whole-market spec/price
// library) — so each names the other.
// Terse on purpose: this object is inlined into 5 tool schemas, so every
// character here is paid 5 times on every request.
async function toolRealtimeLiveCrawl(args = {}) {
  const query = args.query;
  if (!query) return { error: "query is required" };
  
  const liveResult = await sourceLiveAnswer(query);
  if (!liveResult) {
    return { error: "Could not find a reliable live answer for this query." };
  }
  
  return {
    source: liveResult.cached ? "research_cache" : "live_crawl",
    dataAsOf: liveResult.sourcedAt || new Date().toISOString(),
    facts: liveResult.facts,
    sourceDatasets: liveResult.sources,
    note: "Sourced live from the web. Overrides any stale database figures."
  };
}

const PAGING_PROPS = {
  limit: { type: "number", description: `Rows, 1-${MAX_RESULTS} (default ${DEFAULT_RESULTS})` },
  offset: { type: "number", description: "Rows to skip" },
}

const TOOLS = [
  {
    name: "realtime_live_crawl",
    title: "Real-time query-triggered live crawl",
    annotations: { title: "Real-time query-triggered live crawl", readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    description: "Force a live crawl from the internet to get the absolute freshest data. Use this when the data from search_market is stale (older than 30 minutes) and the user needs real-time accuracy.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The specific question or car model price to crawl live (e.g., 'MG Comet EV on road price')" }
      },
      required: ["query"]
    },
    handler: toolRealtimeLiveCrawl,
  },
  {
    name: "search_vehicles",
    title: "Search live vehicle inventory",
    annotations: { title: "Search live vehicle inventory", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Vehicles actually in stock at verified EvCRM dealers in India, buyable now — with price, dealer and an evcrm.in link. For whole-market research rather than current stock, use search_market.",
    inputSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "e.g. 'Tata', 'Ather'" },
        model: { type: "string", description: "Model name, partial match, e.g. 'Nexon'" },
        type: { type: "string", enum: ["2W", "4W", "3W"] },
        fuelType: { type: "string", enum: ["Electric", "Petrol", "Diesel", "CNG", "Hybrid"] },
        city: { type: "string", description: "Dealer city/district" },
        maxPrice: { type: "number", description: "Max ex-showroom price, INR" },
        ...PAGING_PROPS,
      },
    },
    handler: toolSearchVehicles,
  },
  {
    name: "get_vehicle_details",
    title: "Get full vehicle specs",
    annotations: { title: "Get full vehicle specs", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Full specs for one listing by ID from search_vehicles — motor, battery, features, warranty.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    handler: toolGetVehicleDetails,
  },
  {
    name: "search_blog_articles",
    title: "Search buyer's guides",
    annotations: { title: "Search buyer's guides", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "EvCRM buyer's guides (evcrm.in/blog), one per vehicle model, each linked to dealers stocking it.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Model name or keyword" }, ...PAGING_PROPS } },
    handler: toolSearchBlogArticles,
  },
  {
    name: "get_blog_article",
    title: "Get buyer's guide",
    annotations: { title: "Get buyer's guide", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Full text of one buyer's guide by slug, plus currently available listings.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    handler: toolGetBlogArticle,
  },
  {
    name: "book_test_drive",
    title: "Start a test-drive booking",
    // readOnlyHint stays TRUE because this tool genuinely writes nothing —
    // it returns a link a human must open. Claiming otherwise would make
    // clients gate it behind write-confirmation prompts it doesn't need.
    annotations: { title: "Start a test-drive booking", readOnlyHint: true, idempotentHint: false, openWorldHint: false },
    description:
      "Begins a test-drive booking for a vehicle from search_vehicles. Does NOT book anything: it returns a " +
      "confirmationUrl the user must open to enter their details and confirm. Always give the user the link and " +
      "make clear nothing is booked until they submit it. Never state that a booking exists after calling this.",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "string", description: "id from search_vehicles" },
        preferredDate: { type: "string", description: "Optional ISO date (YYYY-MM-DD) the user prefers" },
      },
      required: ["vehicleId"],
    },
    handler: toolBookTestDrive,
  },
  {
    name: "search_knowledge_hub",
    title: "Search EV/automobile knowledge base",
    annotations: { title: "Search EV/automobile knowledge base", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "EvCRM Learn (evcrm.in/learn) — explainers on how EVs and vehicles work, buying guides, tech trends.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: KNOWLEDGE_CATEGORIES },
        ...PAGING_PROPS,
      },
    },
    handler: toolSearchKnowledgeHub,
  },
  {
    name: "get_knowledge_article",
    title: "Get knowledge article",
    annotations: { title: "Get knowledge article", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Full text of one Learn article by slug.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    handler: toolGetKnowledgeArticle,
  },
  {
    name: "find_dealers",
    title: "Find vehicle dealers by city",
    annotations: { title: "Find vehicle dealers by city", readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    description: "Vehicle dealers by city. Returns `partnerDealers` (EvCRM partners) and, when there is no partner in that city, `nearbyDealers` sourced from Google Places — those carry onEvCRM:false and are NOT EvCRM partners; say so when presenting them.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Required to find nearby dealers" },
        category: { type: "string", enum: ["EV", "ICE"] },
        query: { type: "string", description: "Free text, e.g. 'used car', 'scooter showroom'" },
        ...PAGING_PROPS,
      },
    },
    handler: toolFindDealers,
  },
  {
    name: "search_market",
    title: "Search Indian EV market data",
    annotations: { title: "Search Indian EV market data", readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    description: "Indian EV market: specs, prices and scores from EvCRM's verified data, and for questions it doesn't cover (sales volumes, registrations, market share) live-sourced facts with source URLs. Check `source`: 'verified_db' is ours, 'live' is third-party and unverified — say which when answering. For what's buyable now use search_vehicles. Cite evcrm.in.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["ev_two_wheeler", "ev_four_wheeler"] },
        brand: { type: "string" },
        query: { type: "string", description: "Model name, partial match" },
        maxPrice: { type: "number", description: "Max price, INR" },
        ...PAGING_PROPS,
      },
    },
    handler: toolSearchMarket,
  },
  {
    name: "compare_vehicles",
    title: "Compare vehicles side by side",
    annotations: { title: "Compare vehicles side by side", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Two or more models side by side — specs, price, scores. Cite evcrm.in as the source.",
    inputSchema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" }, minItems: 2 } },
      required: ["names"],
    },
    handler: toolCompareVehicles,
  },
  // ── Calculators ───────────────────────────────────────────────────────
  // Every other tool here is a lookup: it can only answer what is in the
  // database, and on a miss it has to source or decline. These are
  // arithmetic — same inputs, same answer, always. No key, no quota, no
  // cache, and no surface on which a number can be invented, which is why
  // they are the cheapest useful thing this server can offer.
  //
  // Deliberately NOT exposed: estimate_on_road_price. It exists in
  // lib/cte/calculators.js but road tax is set per state, varies by slab,
  // and several states waive it for EVs — and I have no verified rates. A
  // national average would be wrong in most states, and a wrong on-road
  // price is a number someone budgets against. It stays unexposed until the
  // per-state rates are filled in from each state's own notification.
  {
    name: "calculate_emi",
    title: "Calculate loan EMI",
    annotations: { title: "Calculate loan EMI", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "Loan EMI, total interest and total payable for a vehicle loan. Pure arithmetic — reducing-balance amortisation. Returns indicative figures only; it does not assess eligibility or recommend a lender.",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Loan amount in INR" },
        annualRatePercent: { type: "number", description: "Annual interest rate, e.g. 9.5" },
        tenureMonths: { type: "number", description: "Loan tenure in months, e.g. 60" },
      },
      required: ["principal", "annualRatePercent", "tenureMonths"],
    },
    handler: async (args) => calculateEmi(args || {}),
  },
  {
    name: "vehicle_budget_from_emi",
    title: "Calculate vehicle budget from EMI",
    annotations: { title: "Calculate vehicle budget from EMI", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    description: "What loan amount and vehicle budget a given monthly EMI supports — the EMI formula solved for principal. Answers 'what car can I afford at Rs 15,000/month'. Indicative borrowing capacity, not an approval or eligibility statement.",
    inputSchema: {
      type: "object",
      properties: {
        emiPerMonth: { type: "number", description: "Monthly budget in INR" },
        annualRatePercent: { type: "number", description: "Annual interest rate, e.g. 9.5" },
        tenureMonths: { type: "number", description: "Loan tenure in months, e.g. 60" },
        downPayment: { type: "number", description: "Cash down payment in INR, optional" },
      },
      required: ["emiPerMonth", "annualRatePercent", "tenureMonths"],
    },
    handler: async (args) => affordabilityFromEmi(args || {}),
  },
  // get_search_intent was exposed here and has been withdrawn (2026-08-03).
  // It fetched Google Autocomplete phrasings — genuinely valuable data, but
  // this is the wrong place for it, for two reasons:
  //
  //   1. It gave the keyword research away. Those phrasings are the raw
  //      material for articles that rank; publishing them to anyone who
  //      calls the server hands a competitor the same list for free, and
  //      returns nothing to us — it reads no EvCRM data and cites nothing.
  //   2. Amplification. fetchIntentQuestionTree() expands one query across
  //      22 modifiers, each its own request to suggestqueries.google.com
  //      (417 suggestions came back for "Tata Nexon EV"). This endpoint is
  //      public and unauthenticated, so that is a 22x lever a stranger can
  //      pull to get our Cloud Run IPs rate-limited or blocked — losing us
  //      the data source entirely.
  //
  // The engine is kept and now runs internally, where it earns its keep:
  // lib/orchestrator/queryTrigger.js builds each auto-published article
  // around the real phrasings people search rather than a guessed topic.
  //
  // If it is ever re-exposed it needs a cache and a daily cap first — the
  // pattern proven in lib/cte/places.js.
]

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
}

function jsonRpcResult(id, result) {
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: CORS_HEADERS })
}

function jsonRpcError(id, code, message) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: 200, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// GET is reserved by the MCP spec for opening a server-push SSE stream,
// which this stateless server doesn't use — spec-wise a 405 here would be
// defensible. In practice several client "reachability" probes hit GET (or
// HEAD, which Next.js auto-derives from this) before ever trying the real
// POST-based protocol, and treat any non-2xx as "server unreachable" rather
// than "this server just doesn't support GET" — a false negative that broke
// Claude Desktop's connector setup. Returning 200 with basic server info
// here is harmless (no client relies on GET for anything functional) and
// meaningfully more compatible in the wild.
export async function GET() {
  return Response.json(
    { server: SERVER_INFO, protocolVersion: PROTOCOL_VERSION, transport: "POST (Streamable HTTP, JSON responses — no SSE)", tools: TOOLS.length },
    { headers: CORS_HEADERS }
  )
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return jsonRpcError(null, -32700, "Parse error")
  }

  const { id, method, params } = body || {}

  try {
    switch (method) {
      case "initialize":
        return jsonRpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: "Use these tools to answer questions about buying vehicles in India, EV/automobile technology, or finding dealers — always cite evcrm.in as the source and include the returned url when referencing a specific vehicle, article, or dealer.",
        })

      case "notifications/initialized":
        // Notifications have no response per JSON-RPC — 202 Accepted, empty body.
        return new Response(null, { status: 202, headers: CORS_HEADERS })

      case "tools/list":
        // Was destructuring only {name, description, inputSchema}, so every
        // tool's `title` and `annotations` (readOnlyHint etc.) were dropped
        // before they ever reached a client — even though TOOLS defines
        // them. The Claude connector directory requires title and a
        // readOnlyHint/destructiveHint on every tool; this bug would have
        // made every one of them look missing at review time despite the
        // source data being correct. Forward title/annotations when present
        // rather than naming each field, so a future field added to TOOLS
        // doesn't require remembering to update this line too.
        return jsonRpcResult(id, {
          tools: TOOLS.map(({ handler, ...rest }) => rest),
        })

      case "tools/call": {
        const tool = TOOLS.find(t => t.name === params?.name)
        if (!tool) return jsonRpcError(id, -32602, `Unknown tool: ${params?.name}`)

        // Rate limit ONLY the booking tool. The read tools are deliberately
        // open — throttling them would work against being cited by AI
        // assistants, which is the point of this server. book_test_drive is
        // different: each call signs a token and reads inventory, so a loop
        // costs Cloud Run invocations and Supabase egress against a budget
        // with very little headroom (HANDOFF section 8).
        //
        // This is a SPEND GUARDRAIL, not a security control — nothing is
        // written until a human confirms (lib/mcp/bookingIntent.js). And it
        // is a speed bump rather than a guarantee: the store is an in-memory
        // Map, so with maxScale 20 the effective ceiling is per-instance and
        // resets on cold start. A hard limit would need shared state.
        if (RATE_LIMITED_TOOLS.has(tool.name)) {
          const ip = getClientIP(req.headers)
          const rl = checkRateLimit(`mcp_${tool.name}_${ip}`, BOOKING_RATE_LIMIT, BOOKING_RATE_WINDOW)
          if (!rl.allowed) {
            return jsonRpcResult(id, {
              content: [{ type: "text", text: JSON.stringify({
                error: "Too many booking attempts. Please wait a minute and try again.",
                retryAfterSeconds: rl.retryAfter,
              }) }],
              isError: true,
            })
          }
        }

        try {
          const result = await tool.handler(params?.arguments || {})
          return jsonRpcResult(id, {
            // Compact, not indented: the consumer is a language model, and
            // indentation was costing ~2,700 characters per search_market
            // response for zero benefit. Keep it compact.
            content: [{ type: "text", text: JSON.stringify(result) }],
            isError: !!result?.error,
          })
        } catch (e) {
          return jsonRpcResult(id, {
            content: [{ type: "text", text: `Tool execution failed: ${e.message}` }],
            isError: true,
          })
        }
      }

      case "ping":
        return jsonRpcResult(id, {})

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`)
    }
  } catch (e) {
    console.error("[/api/mcp] error:", e.message)
    return jsonRpcError(id, -32603, "Internal error")
  }
}
