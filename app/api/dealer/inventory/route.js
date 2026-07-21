import { NextResponse } from "next/server"
import { verifyToken } from "../../../../lib/auth"
import { readTable, writeTable } from "../../../../lib/store"
import { pingIndexNow } from "../../../../lib/indexnow"
import { slugify } from "../../../../lib/blog"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

// A vehicle is publicly visible (and therefore worth telling the search
// engines about) under the same rule /api/marketplace/vehicles applies.
const isPubliclyVisible = (v) =>
  v.status === "IN_STOCK" && (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED")

// Generate model key from brand+model (e.g. "Tata Nexon EV Max" → "tata-nexon-ev-max")
const getModelKey = (brand, model) => {
  if (!brand || !model) return null
  return `${brand} ${model}`.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
}

// Auto-generate article for a vehicle model if one doesn't already exist.
// Called internally after a dealer uploads a vehicle.
async function ensureModelArticle(vehicle, user) {
  if (!GEMINI_API_KEY) return null // AI not configured, skip silently

  const modelKey = getModelKey(vehicle.brand, vehicle.model)
  if (!modelKey) return null

  const posts = await readTable("blog_posts")
  const existing = posts.find(p => p.modelKey === modelKey && p.status === "published")
  if (existing) return existing.id // Article already exists for this model

  // Generate new article via Gemini
  const prompt = `You are an automotive content writer for an Indian vehicle marketplace (evcrm.in). Write a helpful, SEO-friendly buyer's guide for: "${vehicle.brand} ${vehicle.model}"${vehicle.year ? ` (${vehicle.year})` : ""}.

Requirements:
- Indian market context: prices in ₹/lakhs, charging time for EVs, service network, resale value
- Natural, trustworthy tone. NO invented specs or prices you're unsure of.
- 400-600 words, structured with 3-4 short sections.
- Focus on WHY buyers choose this model, key features, and practical considerations

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "an SEO-friendly title (max 70 chars) like 'Best reasons to buy the ${vehicle.brand} ${vehicle.model}'",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings."
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
      const slug = slugify(`${vehicle.brand} ${vehicle.model}`)
      const now = new Date().toISOString()

      const article = {
        id: `blog_${Date.now()}`,
        slug,
        modelKey,
        dealership: user.dealership,
        authorName: user.name || "EvCRM",
        title: parsed.title || `${vehicle.brand} ${vehicle.model}: Buyer's Guide`,
        excerpt: parsed.excerpt || "",
        body: parsed.body || "",
        status: "published",
        createdAt: now,
        updatedAt: now,
        publishedAt: now
      }

      posts.unshift(article)
      await writeTable("blog_posts", posts)

      // Ping search engines about the new article
      pingIndexNow([`https://evcrm.in/blog/${article.slug}`, "https://evcrm.in/blog", "https://evcrm.in/sitemap.xml"])

      return article.id
    } catch (e) {
      lastError = e.message
    }
  }

  // If generation fails, continue silently (don't block vehicle creation)
  console.error(`Failed to auto-generate article for ${modelKey}: ${lastError}`)
  return null
}

// Link a vehicle to its model article in the junction table
async function linkVehicleToArticle(vehicleId, articleId) {
  const links = await readTable("article_vehicles")
  const link = {
    id: `link_${Date.now()}`,
    articleId,
    vehicleId,
    createdAt: new Date().toISOString()
  }
  links.unshift(link)
  await writeTable("article_vehicles", links)
}

async function getUser(req) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  try { return verifyToken(token) } catch { return null }
}

// GET: dealer's own inventory
export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const { searchParams } = new URL(req.url)
  const dealership = user.dealership || searchParams.get("dealership")

  const inv = await readTable("inventory")
  const items = dealership ? inv.filter(v => v.dealership === dealership) : inv
  return NextResponse.json({ success:true, inventory:items, total:items.length })
}

// POST: add new vehicle to inventory
export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })
  if (!["dealer","founder","superadmin"].includes(user.role)) return NextResponse.json({ error:"Forbidden" }, { status:403 })

  const body = await req.json()
  const dealership = user.dealership || body.dealership

  const inv = await readTable("inventory")

  // 5.7 VIN Uniqueness Check
  if (body.vin && inv.some(v => v.vin && v.vin === body.vin)) {
    return NextResponse.json({ error: `VIN ${body.vin} already exists in inventory` }, { status: 409 })
  }

  const item = {
    id:          `inv_${Date.now()}`,
    dealership,
    dealerName:  body.dealerName || user.name,
    brand:       body.brand,
    model:       body.model,
    variant:     body.variant || "",
    type:        body.type || "4W",
    bodyType:    body.bodyType || "Sedan",
    year:        body.year || new Date().getFullYear(),
    km:          body.km || 0,
    // Dealer can now set this explicitly (Used-Car toggle in the Add/Edit form);
    // falls back to the old km-based inference when not sent, so nothing already
    // calling this API without the field changes behavior.
    condition:   body.condition || (body.km > 0 ? "used" : "new"),
    fuelType:    body.fuelType || "Electric",
    color:       body.color || "",
    range:       body.range || 0,
    batteryCapacity: body.batteryCapacity || "",
    topSpeed:    body.topSpeed || 0,
    chargingTime:    body.chargingTime || "",
    seatingCapacity: body.seatingCapacity || "",
    bootSpace:       body.bootSpace || "",
    groundClearance: body.groundClearance || "",
    warrantyYears:   body.warrantyYears || "",
    certified:       body.certified || false,
    exShowroom:  body.exShowroom || 0,
    onRoadPrice: body.onRoadPrice || 0,
    emi:         body.emi || 0,
    tokenAmount: 1000,
    status:      body.status || "IN_STOCK",
    statusReason: body.statusReason || "",
    // Used vehicles must be approved by the dealer before they're visible on the
    // marketplace (see the approval gate in /api/marketplace/vehicles). New
    // vehicles never get an inspectionReport, so this stays null for them.
    inspectionReport: body.condition === "used" && body.inspectionReport
      ? { ...body.inspectionReport, approvalStatus: "PENDING", submittedAt: new Date().toISOString() }
      : null,
    vin:         body.vin || "",
    isDemo:      body.isDemo || false,
    demoMileage: body.isDemo ? (body.demoMileage || 0) : null,
    images:      body.images || ["🚗"],
    features:    body.features || [],
    tags:        body.tags || [],
    state:       body.state || "",
    district:    body.district || "",
    rating:      0,
    reviews:     0,
    stockLog:    [{ event:"received", note:"Added to inventory", date:new Date().toISOString() }],
    createdAt:   new Date().toISOString()
  }

  inv.unshift(item)
  await writeTable("inventory", inv)

  // Auto-generate article for this vehicle's model if one doesn't exist yet
  // (fire-and-forget, never blocks vehicle creation response)
  const articleId = await ensureModelArticle(item, user)
  if (articleId) {
    await linkVehicleToArticle(item.id, articleId)
  }

  // Tell the search engines about the new listing immediately (free
  // instant indexing — fire-and-forget, never blocks the response).
  if (isPubliclyVisible(item)) {
    pingIndexNow([`https://evcrm.in/vehicles/${item.id}`, "https://evcrm.in/sitemap.xml"])
  }

  return NextResponse.json({ success:true, item })
}

// PATCH: update vehicle status / details
export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 })

  const inv = await readTable("inventory")
  const idx = inv.findIndex(v => v.id === id)
  if (idx === -1) return NextResponse.json({ error:"Not found" }, { status:404 })

  // Dealers can only edit their own inventory
  if (user.role === "dealer" && inv[idx].dealership !== user.dealership) {
    return NextResponse.json({ error:"Forbidden" }, { status:403 })
  }

  // 5.7 VIN Uniqueness Check (on edit)
  if (updates.vin && inv.some(v => v.id !== id && v.vin && v.vin === updates.vin)) {
    return NextResponse.json({ error: `VIN ${updates.vin} already exists in inventory` }, { status: 409 })
  }

  // 5.3 Stock Count Update audit trail — log status transitions
  if (updates.status && updates.status !== inv[idx].status) {
    inv[idx].stockLog = inv[idx].stockLog || []
    inv[idx].stockLog.unshift({ event: updates.status.toLowerCase(), note: `Status changed ${inv[idx].status} → ${updates.status}${updates.statusReason ? ` (${updates.statusReason})` : ""}`, date: new Date().toISOString() })
  }

  const wasVisible = isPubliclyVisible(inv[idx])
  inv[idx] = { ...inv[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeTable("inventory", inv)

  // Ping on any visibility change or edit of a visible listing — covers a
  // used vehicle's inspection getting approved (newly visible) and a sold
  // vehicle leaving the marketplace (engines should re-crawl and see it gone).
  if (wasVisible || isPubliclyVisible(inv[idx])) {
    pingIndexNow([`https://evcrm.in/vehicles/${inv[idx].id}`, "https://evcrm.in/sitemap.xml"])
  }

  return NextResponse.json({ success:true, item:inv[idx] })
}

// DELETE: remove vehicle
export async function DELETE(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 })

  let inv = await readTable("inventory")
  const target = inv.find(v => v.id === id)
  if (!target) return NextResponse.json({ error:"Not found" }, { status:404 })
  if (user.role === "dealer" && target.dealership !== user.dealership) return NextResponse.json({ error:"Forbidden" }, { status:403 })

  inv = inv.filter(v => v.id !== id)
  await writeTable("inventory", inv)
  return NextResponse.json({ success:true })
}
