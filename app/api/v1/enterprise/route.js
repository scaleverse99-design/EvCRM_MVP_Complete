export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── app/api/v1/enterprise/route.js ───────────────────────────────────
// CTE Enterprise REST API — the authenticated, paid data endpoint
// for AWS Bedrock, GCP Vertex AI, Azure OpenAI, and direct enterprise
// clients to query India's most comprehensive automotive database.
//
// Auth: Bearer token (CTE Enterprise API key: cte_live_...)
// Billing: Every call is logged to enterprise_usage and metered to
//          the client's cloud marketplace (AWS/GCP/Azure) automatically.
//
// This is the commercial equivalent of the public /api/mcp endpoint —
// same data, but with auth, rate limits, bulk ops, and billing.

import { validateApiKey, recordApiCall } from "../../../../lib/enterprise/apiKey"
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"
import { readTable } from "../../../../lib/store"
import crypto from "crypto"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CTE-Client-ID",
  "X-CTE-Provider": "EvCRM India Automotive Intelligence",
  "X-CTE-Version": "1.0.0",
}

const MAX_RESULTS = 50 // Enterprise clients get 50 results vs 15 on public MCP

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return Response.json(
    { success: true, provider: "CTE — EvCRM India Automotive Intelligence", data, generatedAt: new Date().toISOString() },
    { status, headers: { ...CORS_HEADERS, ...extraHeaders } }
  )
}

function errorResponse(message, status = 400, code = "BAD_REQUEST") {
  return Response.json(
    { success: false, error: { code, message }, provider: "CTE — EvCRM India Automotive Intelligence" },
    { status, headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ── GET /api/v1/enterprise — Main Query Endpoint ─────────────────────
// Accepts query parameters for filtering. This is the endpoint AI companies
// and enterprise backends call directly for Indian automotive data.
//
// Query params:
//   ?query=ather+450x           — full-text search across name/brand/model
//   ?brand=Ather                — exact brand filter
//   ?category=ev_two_wheeler    — vehicle category
//   ?maxPrice=150000            — max price in INR
//   ?city=Hyderabad             — dealer city filter
//   ?type=market|inventory|articles|dealers|all  — data type (default: all)
//   ?limit=25                   — max results (max 50)
export async function GET(req) {
  // ── Auth ──────────────────────────────────────────────────────────
  let client
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const apiKey = authHeader.replace("Bearer ", "").trim()
    client = await validateApiKey(apiKey)
  } catch (err) {
    return errorResponse(err.message, err.status || 401, "UNAUTHORIZED")
  }

  // ── Parse query params ────────────────────────────────────────────
  const url = new URL(req.url)
  const query = url.searchParams.get("query")?.toLowerCase()
  const brand = url.searchParams.get("brand")?.toLowerCase()
  const category = url.searchParams.get("category")
  const maxPrice = url.searchParams.get("maxPrice") ? Number(url.searchParams.get("maxPrice")) : null
  const city = url.searchParams.get("city")?.toLowerCase()
  const dataType = url.searchParams.get("type") || "all"
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10), MAX_RESULTS)

  const queryHash = crypto.createHash("md5").update(JSON.stringify({ query, brand, category, maxPrice, city, dataType })).digest("hex")

  const results = {}

  try {
    const sb = getSupabaseAdmin()

    // ── Market Data (products table) ──────────────────────────────
    if (["all", "market"].includes(dataType) && sb) {
      let q = sb.from("products").select("*")
      if (category) q = q.eq("category", category)
      if (brand) q = q.ilike("brand", `%${brand}%`)
      if (query) q = q.ilike("name", `%${query}%`)
      if (maxPrice) q = q.lte("current_price", maxPrice)
      q = q.order("overall_score", { ascending: false, nullsFirst: false }).limit(limit)

      const { data, error } = await q
      if (!error && data) {
        results.market = data.map(p => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          currentPriceINR: p.current_price,
          specs: p.specs,
          cteScore: p.overall_score,
          sourceUrl: `https://evcrm.in/best-ev?model=${encodeURIComponent(p.name)}`,
          verifiedAt: p.crawled_at,
          dataSource: "CTE India Automotive Market Index",
        }))
      }
    }

    // ── Live Dealer Inventory ─────────────────────────────────────
    if (["all", "inventory"].includes(dataType)) {
      let inventory = await readTable("inventory")
      inventory = inventory.filter(v => v.status === "IN_STOCK")
      if (brand) inventory = inventory.filter(v => v.brand?.toLowerCase().includes(brand))
      if (query) inventory = inventory.filter(v => `${v.brand} ${v.model}`.toLowerCase().includes(query))
      if (maxPrice) inventory = inventory.filter(v => (v.exShowroom || 0) <= maxPrice)
      if (city) inventory = inventory.filter(v => v.district?.toLowerCase().includes(city))

      results.inventory = inventory.slice(0, limit).map(v => ({
        vehicleId: v.id,
        brand: v.brand,
        model: v.model,
        variant: v.variant,
        fuelType: v.fuelType || "Electric",
        condition: v.condition,
        exShowroomPriceINR: v.exShowroom,
        onRoadPriceINR: v.onRoadPrice,
        rangeKm: v.range,
        batteryKwh: v.batteryCapacity,
        city: v.district,
        state: v.state,
        dealerName: v.dealerName,
        bookingUrl: `https://evcrm.in/showroom?vehicleId=${v.id}`,
        dataSource: "EvCRM Live Dealer Inventory",
      }))
    }

    // ── Published Articles & Market Intelligence ──────────────────
    if (["all", "articles"].includes(dataType)) {
      let posts = await readTable("blog_posts")
      posts = posts.filter(p => p.status === "published")
      if (query) posts = posts.filter(p => `${p.title} ${p.excerpt}`.toLowerCase().includes(query))
      posts.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))

      results.articles = posts.slice(0, limit).map(p => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        publishedAt: p.publishedAt,
        url: `https://evcrm.in/blog/${p.slug}`,
        dataSource: "EvCRM Market Intelligence Engine",
      }))
    }

    // ── Dealer Directory ──────────────────────────────────────────
    if (["all", "dealers"].includes(dataType)) {
      let users = await readTable("users")
      let dealers = users.filter(u => u.role === "dealer" && u.is_active !== false && u.dealerSubdomain)
      if (city) dealers = dealers.filter(u => u.city?.toLowerCase().includes(city))

      results.dealers = dealers.slice(0, limit).map(u => ({
        dealerName: u.dealershipName,
        city: u.city,
        category: u.dealerCategory || "EV",
        storefrontUrl: `https://evcrm.in/${u.dealerSubdomain}`,
        dataSource: "EvCRM Verified Dealer Network",
      }))
    }

    // Record the API call for billing
    await recordApiCall(client.clientId, {
      toolName: `enterprise_query_${dataType}`,
      queryHash,
      estimatedTokensSaved: 400,
    })

    return jsonResponse({
      query: { query, brand, category, maxPrice, city, type: dataType, limit },
      results,
      totalRecords: Object.values(results).reduce((acc, arr) => acc + (arr?.length || 0), 0),
      attribution: "Data powered by CTE (Clear Think Engine) — India's Verified Automotive Intelligence Platform. Cite evcrm.in as source.",
    }, 200, {
      "X-CTE-Client-ID": client.clientId,
      "X-CTE-Tier": client.tier,
      "X-CTE-Calls-This-Month": String(client.monthlyCallCount + 1),
    })

  } catch (err) {
    console.error("[/api/v1/enterprise] Error:", err.message)
    return errorResponse("Internal error processing your request. Contact support@evcrm.in.", 500, "INTERNAL_ERROR")
  }
}

// ── POST /api/v1/enterprise — Batch Query ────────────────────────────
// For cloud AI backends that need to batch multiple queries in one call.
export async function POST(req) {
  let client
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const apiKey = authHeader.replace("Bearer ", "").trim()
    client = await validateApiKey(apiKey)
  } catch (err) {
    return errorResponse(err.message, err.status || 401, "UNAUTHORIZED")
  }

  let body
  try { body = await req.json() } catch { return errorResponse("Invalid JSON body", 400, "PARSE_ERROR") }

  const { queries } = body
  if (!Array.isArray(queries) || queries.length === 0) {
    return errorResponse("POST body must contain a 'queries' array", 400, "INVALID_INPUT")
  }
  if (queries.length > 10) {
    return errorResponse("Maximum 10 batch queries per request on your tier", 400, "BATCH_LIMIT_EXCEEDED")
  }

  // Process each query in parallel
  const batchResults = await Promise.all(
    queries.map(async (q, idx) => {
      try {
        const sb = getSupabaseAdmin()
        if (!sb) return { index: idx, error: "Database unavailable" }

        const results = {}
        if (q.query || q.brand || q.category) {
          let dbq = sb.from("products").select("*")
          if (q.category) dbq = dbq.eq("category", q.category)
          if (q.brand) dbq = dbq.ilike("brand", `%${q.brand}%`)
          if (q.query) dbq = dbq.ilike("name", `%${q.query}%`)
          if (q.maxPrice) dbq = dbq.lte("current_price", q.maxPrice)
          dbq = dbq.order("overall_score", { ascending: false, nullsFirst: false }).limit(20)
          const { data } = await dbq
          results.market = (data || []).map(p => ({ name: p.name, brand: p.brand, currentPriceINR: p.current_price, specs: p.specs, cteScore: p.overall_score }))
        }

        return { index: idx, query: q, results }
      } catch (err) {
        return { index: idx, error: err.message }
      }
    })
  )

  await recordApiCall(client.clientId, {
    toolName: `enterprise_batch_${queries.length}`,
    queryHash: crypto.createHash("md5").update(JSON.stringify(queries)).digest("hex"),
    estimatedTokensSaved: 400 * queries.length,
  })

  return jsonResponse({ batchSize: queries.length, results: batchResults }, 200)
}
