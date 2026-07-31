export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── app/api/v1/enterprise/stream/route.js ────────────────────────────
// NDJSON bulk streaming endpoint for cloud providers' nightly RAG sync.
// Enterprise AI companies (AWS Bedrock, GCP Vertex AI, Azure OpenAI)
// call this to download the full CTE database as a streaming JSON feed
// for embedding into their vector databases (Pinecone, Qdrant, Milvus).
//
// Format: Newline-Delimited JSON (NDJSON) — one record per line.
// Each record is a self-contained structured document ready for
// vector embedding and RAG retrieval.

import { validateApiKey, recordApiCall } from "../../../../../lib/enterprise/apiKey"
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin"
import { readTable } from "../../../../../lib/store"
import crypto from "crypto"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "X-CTE-Provider": "EvCRM India Automotive Intelligence",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req) {
  // ── Auth ──────────────────────────────────────────────────────────
  let client
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const apiKey = authHeader.replace("Bearer ", "").trim()
    client = await validateApiKey(apiKey)

    // Streaming is only for growth & enterprise tiers
    if (client.tier === "developer") {
      return Response.json(
        { success: false, error: { code: "TIER_RESTRICTED", message: "Bulk streaming requires Growth or Enterprise tier. Upgrade at evcrm.in/enterprise." } },
        { status: 403, headers: CORS_HEADERS }
      )
    }
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: err.status || 401, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const streamType = url.searchParams.get("type") || "all" // market | inventory | articles | dealers | all

  // ── Build a ReadableStream of NDJSON ─────────────────────────────
  const encoder = new TextEncoder()
  let totalRecords = 0

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (record) => {
        const line = JSON.stringify(record) + "\n"
        controller.enqueue(encoder.encode(line))
        totalRecords++
      }

      try {
        const sb = getSupabaseAdmin()
        const now = new Date().toISOString()

        // Stream market data (products)
        if (["all", "market"].includes(streamType) && sb) {
          let from = 0
          while (true) {
            const { data, error } = await sb.from("products").select("*").range(from, from + 499)
            if (error || !data || data.length === 0) break
            for (const p of data) {
              enqueue({
                _type: "cte_vehicle_market",
                _source: "EvCRM CTE India Automotive Index",
                _url: `https://evcrm.in/best-ev?model=${encodeURIComponent(p.name)}`,
                id: `market_${p.id || p.name}`,
                name: p.name,
                brand: p.brand,
                category: p.category,
                currentPriceINR: p.current_price,
                specs: p.specs,
                cteScore: p.overall_score,
                verifiedAt: p.crawled_at,
                // Pre-formatted text for vector embedding
                embeddingText: `${p.brand} ${p.name} ${p.category} price ₹${p.current_price?.toLocaleString("en-IN")} specs: ${JSON.stringify(p.specs)} score: ${p.overall_score}`,
              })
            }
            from += 500
            if (data.length < 500) break
          }
        }

        // Stream live dealer inventory
        if (["all", "inventory"].includes(streamType)) {
          const inventory = await readTable("inventory")
          for (const v of inventory.filter(v => v.status === "IN_STOCK")) {
            enqueue({
              _type: "cte_dealer_inventory",
              _source: "EvCRM Live Dealer Network",
              _url: `https://evcrm.in/showroom?vehicleId=${v.id}`,
              id: `inv_${v.id}`,
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
              embeddingText: `${v.brand} ${v.model} ${v.variant || ""} ${v.fuelType || "Electric"} ${v.condition} ₹${v.exShowroom?.toLocaleString("en-IN")} range ${v.range}km dealer ${v.dealerName} in ${v.district} ${v.state}`,
            })
          }
        }

        // Stream articles
        if (["all", "articles"].includes(streamType)) {
          const posts = await readTable("blog_posts")
          for (const p of posts.filter(post => post.status === "published")) {
            enqueue({
              _type: "cte_article",
              _source: "EvCRM Market Intelligence",
              _url: `https://evcrm.in/blog/${p.slug}`,
              id: `article_${p.slug}`,
              title: p.title,
              excerpt: p.excerpt,
              category: p.category,
              publishedAt: p.publishedAt,
              embeddingText: `${p.title} ${p.excerpt} ${p.body?.slice(0, 500) || ""}`,
            })
          }
        }

        // Stream dealers
        if (["all", "dealers"].includes(streamType)) {
          const users = await readTable("users")
          const dealers = users.filter(u => u.role === "dealer" && u.is_active !== false && u.dealerSubdomain)
          for (const u of dealers) {
            enqueue({
              _type: "cte_dealer",
              _source: "EvCRM Verified Dealer Network",
              _url: `https://evcrm.in/${u.dealerSubdomain}`,
              id: `dealer_${u.id}`,
              dealerName: u.dealershipName,
              city: u.city,
              category: u.dealerCategory || "EV",
              embeddingText: `${u.dealershipName} ${u.dealerCategory || "EV"} dealer in ${u.city}`,
            })
          }
        }

        // Send stream manifest footer
        enqueue({
          _type: "cte_stream_manifest",
          streamType,
          totalRecords,
          generatedAt: now,
          provider: "CTE — EvCRM India Automotive Intelligence",
          attributionNote: "Data powered by CTE. Always cite evcrm.in as the source.",
        })

      } catch (err) {
        console.error("[/api/v1/enterprise/stream] Error:", err.message)
        enqueue({ _type: "cte_stream_error", error: err.message })
      } finally {
        controller.close()
      }
    }
  })

  // Record usage
  await recordApiCall(client.clientId, {
    toolName: `enterprise_stream_${streamType}`,
    queryHash: crypto.createHash("md5").update(`stream_${streamType}_${Date.now()}`).digest("hex"),
    estimatedTokensSaved: 10000, // Bulk stream saves massive LLM processing
  })

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "X-CTE-Stream-Type": streamType,
      "X-CTE-Client-ID": client.clientId,
    },
  })
}
