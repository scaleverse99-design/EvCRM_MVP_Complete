export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { readTable } from "../../../lib/store"

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
const MAX_RESULTS = 15

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
  const inventory = await readTable("inventory")
  let items = inventory.filter(isPubliclyVisible)

  if (args.brand) items = items.filter(v => v.brand?.toLowerCase() === String(args.brand).toLowerCase())
  if (args.model) items = items.filter(v => v.model?.toLowerCase().includes(String(args.model).toLowerCase()))
  if (args.type) items = items.filter(v => v.type === args.type)
  if (args.fuelType) items = items.filter(v => (v.fuelType || "Electric").toLowerCase() === String(args.fuelType).toLowerCase())
  if (args.city) items = items.filter(v => v.district?.toLowerCase() === String(args.city).toLowerCase())
  if (args.maxPrice) items = items.filter(v => (v.exShowroom || 0) <= Number(args.maxPrice))

  items.sort((a, b) => (a.exShowroom || 0) - (b.exShowroom || 0))
  const results = items.slice(0, MAX_RESULTS).map(vehicleSummary)

  return {
    totalMatches: items.length,
    showing: results.length,
    vehicles: results,
    marketplaceUrl: "https://evcrm.in/showroom",
  }
}

async function toolGetVehicleDetails(args = {}) {
  if (!args.vehicleId) return { error: "vehicleId is required" }
  const inventory = await readTable("inventory")
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
  const posts = await readTable("blog_posts")
  const now = new Date()
  let items = posts.filter(p => p.status === "published" && p.type !== "knowledge" && (!p.publishedAt || new Date(p.publishedAt) <= now))

  if (args.query) {
    const q = String(args.query).toLowerCase()
    items = items.filter(p => `${p.title} ${p.excerpt}`.toLowerCase().includes(q))
  }

  items.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
  return {
    totalMatches: items.length,
    articles: items.slice(0, MAX_RESULTS).map(p => ({
      slug: p.slug,
      url: `https://evcrm.in/blog/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
    })),
  }
}

async function toolGetBlogArticle(args = {}) {
  if (!args.slug) return { error: "slug is required" }
  const posts = await readTable("blog_posts")
  const post = posts.find(p => p.slug === args.slug && p.status === "published" && p.type !== "knowledge")
  if (!post) return { error: "Article not found" }

  const links = await readTable("article_vehicles")
  const linkedIds = links.filter(l => l.articleId === post.id).map(l => l.vehicleId)
  const inventory = await readTable("inventory")
  const vehicles = inventory.filter(v => linkedIds.includes(v.id) && isPubliclyVisible(v)).slice(0, MAX_RESULTS).map(vehicleSummary)

  return {
    url: `https://evcrm.in/blog/${post.slug}`,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    availableListings: vehicles,
  }
}

const KNOWLEDGE_CATEGORIES = ["EV Fundamentals", "ICE Fundamentals", "Buying Guides", "Tech Trends"]

async function toolSearchKnowledgeHub(args = {}) {
  const posts = await readTable("blog_posts")
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
    articles: items.slice(0, MAX_RESULTS).map(p => ({
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
  const posts = await readTable("blog_posts")
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

async function toolFindDealers(args = {}) {
  const users = await readTable("users")
  let dealers = users.filter(u => u.role === "dealer" && u.is_active !== false && u.dealerSubdomain)

  if (args.city) dealers = dealers.filter(u => u.city?.toLowerCase() === String(args.city).toLowerCase())
  if (args.category) dealers = dealers.filter(u => (u.dealerCategory || "EV") === args.category)

  return {
    totalMatches: dealers.length,
    dealers: dealers.slice(0, MAX_RESULTS).map(u => ({
      name: u.dealershipName,
      url: `https://evcrm.in/${u.dealerSubdomain}`,
      city: u.city || undefined,
      category: u.dealerCategory || "EV",
    })),
  }
}

const TOOLS = [
  {
    name: "search_vehicles",
    description: "Search live vehicle inventory across all verified dealers on EvCRM (evcrm.in) — new and used cars, EVs, and two-wheelers for sale in India. Returns real listings with price, dealer, and a direct evcrm.in link.",
    inputSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Vehicle brand, e.g. 'Tata', 'Honda', 'Ather'" },
        model: { type: "string", description: "Vehicle model name or partial match, e.g. 'Nexon'" },
        type: { type: "string", enum: ["2W", "4W", "3W"], description: "2-wheeler, 4-wheeler, or 3-wheeler" },
        fuelType: { type: "string", enum: ["Electric", "Petrol", "Diesel", "CNG", "Hybrid"] },
        city: { type: "string", description: "Dealer city/district" },
        maxPrice: { type: "number", description: "Maximum ex-showroom price in INR" },
      },
    },
    handler: toolSearchVehicles,
  },
  {
    name: "get_vehicle_details",
    description: "Get full specifications for one vehicle listing on EvCRM by its ID (from search_vehicles results) — engine/motor details, battery, features, warranty, etc.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    handler: toolGetVehicleDetails,
  },
  {
    name: "search_blog_articles",
    description: "Search EvCRM's per-model vehicle buyer's guides (evcrm.in/blog). Each article covers one vehicle model and links to every dealer currently stocking it.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Model name or keyword" } } },
    handler: toolSearchBlogArticles,
  },
  {
    name: "get_blog_article",
    description: "Get the full text of one EvCRM buyer's guide article, plus its currently available inventory across dealers.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    handler: toolGetBlogArticle,
  },
  {
    name: "search_knowledge_hub",
    description: "Search EvCRM's Learn knowledge base (evcrm.in/learn) — educational articles on how EVs and automobiles actually work, buying guides, and current industry tech trends.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: KNOWLEDGE_CATEGORIES },
      },
    },
    handler: toolSearchKnowledgeHub,
  },
  {
    name: "get_knowledge_article",
    description: "Get the full text of one EvCRM Learn article by its slug.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    handler: toolGetKnowledgeArticle,
  },
  {
    name: "find_dealers",
    description: "Find verified vehicle dealers on EvCRM with their own storefront pages, optionally filtered by city or category (EV vs used-car dealer).",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        category: { type: "string", enum: ["EV", "ICE"] },
      },
    },
    handler: toolFindDealers,
  },
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
        return jsonRpcResult(id, {
          tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        })

      case "tools/call": {
        const tool = TOOLS.find(t => t.name === params?.name)
        if (!tool) return jsonRpcError(id, -32602, `Unknown tool: ${params?.name}`)
        try {
          const result = await tool.handler(params?.arguments || {})
          return jsonRpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
