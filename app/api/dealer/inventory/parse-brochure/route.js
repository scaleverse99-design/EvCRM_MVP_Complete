export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../../lib/auth"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MAX_PDF_BYTES = 12 * 1024 * 1024 // 12MB — brochures are usually a few MB; generous but bounded

function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const EXTRACTION_PROMPT = `You are extracting EV vehicle listings from a manufacturer/dealer brochure PDF for an inventory system.

Find EVERY distinct vehicle (each trim/variant counts separately) in this document and return them as a JSON array. For each vehicle, extract only what's actually stated in the document — leave a field as an empty string / 0 / empty array if it isn't mentioned, never guess or invent a number.

Return strictly valid JSON matching this shape:
[
  {
    "brand": "string",
    "model": "string",
    "variant": "string",
    "type": "4W" | "2W" | "3W",
    "bodyType": "SUV" | "Hatchback" | "Sedan" | "Crossover" | "Scooter" | "Motorcycle" | "Auto",
    "color": "string",
    "range": number (km, 0 if not stated),
    "batteryCapacity": "string e.g. '40.5 kWh'",
    "topSpeed": number (km/h, 0 if not stated),
    "chargingTime": "string, as stated e.g. '56 min (0-80%, fast charge)'",
    "seatingCapacity": number (0 if not stated),
    "bootSpace": "string e.g. '350 L'",
    "groundClearance": "string e.g. '190 mm'",
    "warrantyYears": number (0 if not stated),
    "exShowroom": number (rupees, 0 if not stated — convert 'Rs. 18 Lakh' to 1800000, '₹8.5L' to 850000),
    "features": ["short feature phrase", "..."]
  }
]

Return ONLY the JSON array, no other text.`

export async function POST(req) {
  const user = getUser(req)
  if (!user) return err("Unauthorized", 401)
  if (!["dealer", "founder", "superadmin"].includes(user.role)) return err("Forbidden", 403)

  if (!GEMINI_API_KEY) {
    return err("Brochure parsing is not configured yet — no AI key set up. Add vehicles manually for now.", 503)
  }

  const body = await req.json()
  const dataUrl = body.pdfBase64 || ""
  const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/)
  if (!match) return err("Please upload a PDF file", 400)
  const base64 = match[1]

  const approxBytes = base64.length * 0.75
  if (approxBytes > MAX_PDF_BYTES) {
    return err(`PDF is too large (max ${Math.round(MAX_PDF_BYTES / 1024 / 1024)}MB)`, 400)
  }

  // Order matters: this project's key has quota on 2.5-flash but zero free-tier
  // quota on 2.0-flash (verified 2026-07-15), so 2.5 goes first.
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
  let lastError = null

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "application/pdf", data: base64 } },
              { text: EXTRACTION_PROMPT },
            ],
          }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI response")

      const vehicles = JSON.parse(text)
      if (!Array.isArray(vehicles)) throw new Error("AI did not return a vehicle list")

      return ok({ vehicles: vehicles.slice(0, 25) }) // sanity cap — a single brochure shouldn't have more than this
    } catch (e) {
      lastError = e.message
    }
  }

  return err(`Could not read this brochure (${lastError || "unknown error"}). Try a different PDF or add vehicles manually.`, 502)
}
