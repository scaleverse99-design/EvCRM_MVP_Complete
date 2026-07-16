export const dynamic = "force-dynamic"

import { readTable } from "../../../../lib/store"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
// Same quota situation as app/api/dealer/inventory/parse-brochure/route.js —
// this project's Gemini key has zero free-tier quota on 2.0-flash but
// working quota on 2.5-flash/-lite. Keep this order in sync with that file.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

const SYSTEM_INSTRUCTIONS = `You are the shopping assistant on an Indian EV marketplace. A customer describes what
they want in plain language (budget, range, vehicle type, brand, features, use-case — "family car", "daily commute",
etc.) across a back-and-forth conversation. You are given the CURRENT live inventory as JSON — only ever recommend
vehicles that are actually in that list, never invent one. Ask a short clarifying question if the request is too
vague to narrow down (e.g. no budget or type mentioned at all) rather than guessing.

Return strictly valid JSON:
{
  "reply": "your conversational response, 1-3 sentences, friendly and concise",
  "matchedVehicleIds": ["id1", "id2"],   // 0-3 ids from the given inventory that best fit — empty array if none fit yet or you're asking a clarifying question
  "done": false                          // true ONLY if the customer's latest message clearly signals they're satisfied / found what they need / want to end the conversation (e.g. "found what I need", "perfect thanks", "that's all", "bye") — otherwise false
}`

export async function POST(req) {
  if (!GEMINI_API_KEY) {
    return Response.json({ success: false, error: "Search assistant is not configured yet." }, { status: 503 })
  }

  const body = await req.json()
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (!messages.length) return Response.json({ error: "No message provided" }, { status: 400 })

  const inv = await readTable("inventory")
  const catalog = inv
    .filter(v => v.status === "IN_STOCK")
    .map(v => ({
      id: v.id, brand: v.brand, model: v.model, variant: v.variant, type: v.type, bodyType: v.bodyType,
      range: v.range, batteryCapacity: v.batteryCapacity, topSpeed: v.topSpeed, chargingTime: v.chargingTime,
      seatingCapacity: v.seatingCapacity, exShowroom: v.exShowroom, condition: v.condition,
      features: v.features, district: v.district, state: v.state,
    }))

  const conversationText = messages.map(m => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.text}`).join("\n")
  const prompt = `${SYSTEM_INSTRUCTIONS}\n\nCURRENT INVENTORY:\n${JSON.stringify(catalog)}\n\nCONVERSATION SO FAR:\n${conversationText}\n\nRespond as the Assistant's next turn.`

  let lastError = null
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.4 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI response")

      const parsed = JSON.parse(text)
      const validIds = new Set(catalog.map(v => v.id))
      const matchedVehicleIds = (Array.isArray(parsed.matchedVehicleIds) ? parsed.matchedVehicleIds : []).filter(id => validIds.has(id))
      const matchedVehicles = inv.filter(v => matchedVehicleIds.includes(v.id))

      return Response.json({
        success: true,
        reply: parsed.reply || "Here's what I found.",
        done: !!parsed.done,
        vehicles: matchedVehicles,
      })
    } catch (e) {
      lastError = e.message
    }
  }

  return Response.json({ success: false, error: `Assistant unavailable right now (${lastError || "unknown error"}). Try browsing the marketplace directly.` }, { status: 502 })
}
