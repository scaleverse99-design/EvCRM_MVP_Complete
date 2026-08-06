export const dynamic = "force-dynamic"

import { verifyToken, ok, err } from "../../../../../lib/auth"
import { callOpenRouter } from "../../../../../lib/orchestrator/openrouter"
import pdfParse from "pdf-parse"

const MAX_PDF_BYTES = 12 * 1024 * 1024 // 12MB — brochures are usually a few MB; generous but bounded

function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

const EXTRACTION_PROMPT = `You are extracting EV vehicle listings from a manufacturer/dealer brochure for an inventory system.

Below is the text extracted from the brochure PDF. Find EVERY distinct vehicle (each trim/variant counts separately) and return them as a JSON array. For each vehicle, extract only what's actually stated in the document — leave a field as an empty string / 0 / empty array if it isn't mentioned, never guess or invent a number.

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

Return ONLY the JSON array, no markdown blocks, no other text.`

export async function POST(req) {
  const user = getUser(req)
  if (!user) return err("Unauthorized", 401)
  if (!["dealer", "founder", "superadmin"].includes(user.role)) return err("Forbidden", 403)

  const body = await req.json()
  const dataUrl = body.pdfBase64 || ""
  const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/)
  if (!match) return err("Please upload a PDF file", 400)
  const base64 = match[1]

  const approxBytes = base64.length * 0.75
  if (approxBytes > MAX_PDF_BYTES) {
    return err(`PDF is too large (max ${Math.round(MAX_PDF_BYTES / 1024 / 1024)}MB)`, 400)
  }

  let pdfText = ""
  try {
    const pdfBuffer = Buffer.from(base64, 'base64')
    const parsed = await pdfParse(pdfBuffer)
    pdfText = parsed.text
    if (!pdfText || pdfText.trim() === "") {
      throw new Error("No readable text found in PDF.")
    }
  } catch (parseErr) {
    return err(`Could not read text from this PDF: ${parseErr.message}. Ensure it is a text-searchable PDF, not just scanned images.`, 400)
  }

  try {
    const fullPrompt = `${EXTRACTION_PROMPT}\n\n--- BROCHURE TEXT ---\n${pdfText.substring(0, 50000)}\n---------------------`
    
    // Call OpenRouter using the openai/gpt-4o model
    const { text, modelUsed } = await callOpenRouter(fullPrompt, { 
      model: "openai/gpt-4o",
      temperature: 0.2
    })

    if (!text) throw new Error("Empty AI response")

    // Clean up potential markdown formatting block if the AI ignores instructions
    let jsonStr = text.trim()
    if (jsonStr.startsWith("\`\`\`json")) jsonStr = jsonStr.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim()
    if (jsonStr.startsWith("\`\`\`")) jsonStr = jsonStr.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim()

    const vehicles = JSON.parse(jsonStr)
    if (!Array.isArray(vehicles)) throw new Error("AI did not return a vehicle list")

    return ok({ vehicles: vehicles.slice(0, 25) }) // sanity cap
  } catch (e) {
    return err(`Could not extract vehicles from brochure (${e.message}). Try a different PDF or add vehicles manually.`, 502)
  }
}
