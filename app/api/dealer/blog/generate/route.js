export const dynamic = "force-dynamic"

import { verifyToken } from "../../../../../lib/auth"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
// Same quota quirk as the search-assistant / brochure-parser routes: this
// project's key has zero 2.0-flash quota but working 2.5-flash/-lite quota.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// POST — draft a consumer-facing article with Gemini. Body: { topic,
// vehicle?: {brand,model,variant,year,fuelType,exShowroom,city} }.
// Returns a draft the dealer reviews/edits before publishing; nothing is
// persisted here.
export async function POST(req) {
  const user = await getUser(req)
  if (!user || !["dealer", "founder", "superadmin"].includes(user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!GEMINI_API_KEY) {
    return Response.json({ success: false, error: "AI writer isn't configured yet." }, { status: 503 })
  }

  const body = await req.json()
  const topic = (body.topic || "").trim()
  const vehicle = body.vehicle || null
  if (!topic && !vehicle) {
    return Response.json({ error: "Provide a topic or pick a vehicle" }, { status: 400 })
  }

  const vehicleLine = vehicle
    ? `The article should center on this specific vehicle the dealer has in stock: ${[vehicle.brand, vehicle.model, vehicle.variant, vehicle.year].filter(Boolean).join(" ")}${vehicle.fuelType ? ` (${vehicle.fuelType})` : ""}${vehicle.exShowroom ? `, priced around ₹${Number(vehicle.exShowroom).toLocaleString("en-IN")} ex-showroom` : ""}${vehicle.city ? `, available in ${vehicle.city}` : ""}.`
    : ""

  // Note to future maintainers: this generates from the model's training
  // knowledge, NOT live web data. It's accurate for well-known Indian
  // vehicles (Ertiga, Nexon, Creta, etc.). True live-web grounding would
  // need the Gemini google_search tool confirmed on this key — a follow-up.
  const prompt = `You are an automotive content writer for an Indian vehicle marketplace (evcrm.in). Write a helpful, SEO-friendly article for CAR BUYERS (not dealers) about: "${topic || `${vehicle.brand} ${vehicle.model}`}".
${vehicleLine}

Requirements:
- Indian market context: prices in ₹/lakhs, Indian roads/traffic/fuel, mileage, service network, resale.
- If it's a comparison or "vs" topic, compare honestly with 1-2 real rival models buyers actually cross-shop.
- Natural, trustworthy tone. NO invented specs or prices you're unsure of — keep claims general when unsure.
- 400-600 words, structured with a few short sections.

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "an SEO-friendly, click-worthy title (max 70 chars)",
  "excerpt": "1-2 sentence summary for search snippets and cards (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings.",
  "matchModels": ["the primary vehicle model name(s) a buyer would search for, e.g. 'Ertiga' or 'Maruti Ertiga' — 1 to 3 short strings"],
  "tags": ["3-6 short topic keywords for the article"]
}`

  let lastError = null
  for (const model of MODELS) {
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
      // If the dealer picked a vehicle, guarantee it's in matchModels so the
      // "buy from nearby dealers" block always has something to match.
      const matchModels = Array.isArray(parsed.matchModels) ? parsed.matchModels.filter(Boolean) : []
      if (vehicle?.model && !matchModels.some(m => String(m).toLowerCase().includes(vehicle.model.toLowerCase()))) {
        matchModels.unshift(vehicle.model)
      }

      return Response.json({
        success: true,
        draft: {
          title: parsed.title || topic || `${vehicle?.brand || ""} ${vehicle?.model || ""}`.trim(),
          excerpt: parsed.excerpt || "",
          body: parsed.body || "",
          matchModels: matchModels.slice(0, 3),
          tags: (Array.isArray(parsed.tags) ? parsed.tags : []).slice(0, 6),
        },
      })
    } catch (e) {
      lastError = e.message
    }
  }

  return Response.json({ success: false, error: `AI writer unavailable right now (${lastError || "unknown"}). You can still write the article manually.` }, { status: 502 })
}
