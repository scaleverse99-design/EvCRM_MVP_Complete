/**
 * 🤖 Bulk OpenRouter AI Article Generator
 * Writes comprehensive 1,000-1,400 word AI articles for all Indian OEM models using OpenRouter free models.
 */

import fs from "fs"
import path from "path"

// Load .env manually
try {
  const envPath = path.resolve(process.cwd(), ".env")
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8")
    envConfig.split("\n").forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ""
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        process.env[key] = value
      }
    })
  }
} catch (e) { /* ignore */ }

import { HISTORIC_AND_MODERN_OEM_REGISTRY } from "../lib/fullIndianAutoRegistry.js"
import { callOpenRouter } from "../lib/orchestrator/openrouter.js"
import { readTable, writeTable } from "../lib/store.js"
import { slugify } from "../lib/blog.js"
import { pingIndexNow } from "../lib/indexnow.js"

const FREE_MODELS = [
  "openrouter/auto"
]

function extractJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return null }
    }
    return null
  }
}

export async function generateAllArticlesWithOpenRouter() {
  console.log("🚀 Starting Bulk OpenRouter AI Article Generation for all 113 Indian Auto Models...")
  const posts = await readTable("blog_posts").catch(() => [])
  let successCount = 0
  let skippedCount = 0

  for (let i = 0; i < HISTORIC_AND_MODERN_OEM_REGISTRY.length; i++) {
    const v = HISTORIC_AND_MODERN_OEM_REGISTRY[i]
    const targetSlug = slugify(`${v.brand} ${v.model} comprehensive review price specs`)
    
    // Check if an AI-written article already exists for this exact vehicle
    const alreadyExists = posts.some(p => 
      p.sourceNote?.includes("OpenRouter AI Writer") && (p.title?.includes(v.model) || p.slug?.includes(v.model.toLowerCase()))
    )

    if (alreadyExists) {
      console.log(`[${i+1}/${HISTORIC_AND_MODERN_OEM_REGISTRY.length}] AI Article already exists for ${v.brand} ${v.model} — skipping.`)
      skippedCount++
      continue
    }

    console.log(`[${i+1}/${HISTORIC_AND_MODERN_OEM_REGISTRY.length}] Generating OpenRouter AI Article for "${v.brand} ${v.model}"...`)

    const isEV = v.fuelType === "EV" || v.fuelType === "Hybrid"
    const modelToUse = FREE_MODELS[i % FREE_MODELS.length] // Cycle through free models

    const prompt = `You are a senior Indian automotive journalist writing for EvCRM.in, India's leading vehicle marketplace.
Write a comprehensive, engaging, search-optimized 900-1200 word buyer guide for the "${v.brand} ${v.model}".

Vehicle Context:
- Brand: ${v.brand}
- Model: ${v.model}
- Powertrain: ${v.fuelType}
- Category: ${v.category} (${v.type})
- First Launched in India: ${v.launchYear}
- Price Range: Rs. ${(v.priceMin / 100000).toFixed(2)} Lakh to Rs. ${(v.priceMax / 100000).toFixed(2)} Lakh
- ${isEV ? `Battery Claimed Range: ${v.rangeKm} km` : `Fuel Range: ${v.rangeKm} km`}

Formatting Requirements:
1. Use '## ' for section headings.
2. Structure:
   - ## Overview & Launch History in India
   - ## Engine / Motor Specs, Performance & Range
   - ## Key Features, Dashboard Tech & Safety
   - ## Variant Price Breakdown & Ownership Costs
   - ## Pros & Cons for Indian Road Conditions
   - ## Final Verdict: Should You Buy New or Used?
3. Use 'Rs.' for rupees (no special symbols). Plain text body with double-newline paragraph breaks.

Return ONLY a JSON object:
{
  "title": "SEO Title (max 70 chars)",
  "excerpt": "Compelling 2-sentence summary (max 160 chars)",
  "body": "Full article body with '## ' headings and double newlines",
  "coverEmoji": "representative emoji"
}`

    try {
      const { text } = await callOpenRouter(prompt, { model: modelToUse, temperature: 0.7 })
      const draft = extractJson(text)

      if (draft?.title && draft?.body) {
        const slug = slugify(draft.title)
        const nowIso = new Date().toISOString()
        const cleanBody = draft.body.replace(/([^\n])\s*##\s+/g, "$1\n\n## ")

        const article = {
          id: `blog_ai_${v.brand.toLowerCase()}_${v.model.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`,
          slug,
          type: "news",
          category: isEV ? "ev" : "buyer_guide",
          authorName: "EvCRM AI Editorial",
          title: draft.title,
          excerpt: draft.excerpt || `Complete 2026 buyer review and specs guide for the ${v.brand} ${v.model}.`,
          body: cleanBody,
          coverEmoji: draft.coverEmoji || "🚗",
          tags: [v.brand, v.model, v.fuelType, "Buyer Guide", "India"],
          status: "published",
          createdAt: nowIso,
          updatedAt: nowIso,
          publishedAt: nowIso,
          sourceNote: `OpenRouter AI Writer (${modelToUse})`,
        }

        posts.unshift(article)
        successCount++

        // Write batch back to disk every 3 articles to save progress
        if (successCount % 3 === 0) {
          await writeTable("blog_posts", posts)
          console.log(`💾 Saved batch. Total published articles: ${posts.length}`)
        }

        // Ping IndexNow for immediate search engine crawling
        try {
          pingIndexNow([`https://evcrm.in/blog/${slug}`, "https://evcrm.in/blog"])
        } catch { /* best effort */ }

        // Slight pause to respect OpenRouter free tier rate limits
        await new Promise(r => setTimeout(r, 1500))
      }
    } catch (err) {
      console.warn(`⚠️ Failed OpenRouter generation for ${v.brand} ${v.model}:`, err.message)
      // Fallback: Continue without crashing
    }
  }

  await writeTable("blog_posts", posts)
  console.log(`✅ Completed OpenRouter Generation! Published: ${successCount}, Skipped: ${skippedCount}, Total Articles: ${posts.length}`)
  return { successCount, skippedCount, totalPublished: posts.length }
}

generateAllArticlesWithOpenRouter().catch(console.error)
