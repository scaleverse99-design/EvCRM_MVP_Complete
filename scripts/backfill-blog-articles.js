#!/usr/bin/env node

/**
 * Backfill blog articles for existing inventory.
 *
 * One-time script to generate articles for all vehicle models in the inventory
 * and link all matching vehicles to their model's article. Run after deploying
 * the model-hub blog feature.
 *
 * Usage:
 *   node scripts/backfill-blog-articles.js
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Helper: extract model key from brand+model
const getModelKey = (brand, model) => {
  if (!brand || !model) return null
  return `${brand} ${model}`.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
}

// Helper: slugify title for article URL
const slugify = (text) => {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}

// Generate article via Gemini
async function generateArticle(brand, model, year) {
  if (!GEMINI_API_KEY) {
    console.warn(`⚠️  Gemini not configured, skipping article for ${brand} ${model}`)
    return null
  }

  const prompt = `You are an automotive content writer for an Indian vehicle marketplace (evcrm.in). Write a helpful, SEO-friendly buyer's guide for: "${brand} ${model}"${year ? ` (${year})` : ""}.

Requirements:
- Indian market context: prices in ₹/lakhs, charging time for EVs, service network, resale value
- Natural, trustworthy tone. NO invented specs or prices you're unsure of.
- 400-600 words, structured with 3-4 short sections.
- Focus on WHY buyers choose this model, key features, and practical considerations

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "an SEO-friendly title (max 70 chars) like 'Best reasons to buy the ${brand} ${model}'",
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

      return JSON.parse(text)
    } catch (e) {
      lastError = e.message
      // Try next model
    }
  }

  throw new Error(`Failed to generate article for ${brand} ${model}: ${lastError}`)
}

// Main backfill function
async function backfillArticles() {
  console.log("🚀 Starting blog article backfill...\n")

  try {
    // Fetch all inventory
    console.log("📦 Reading inventory...")
    const { data: inventoryData, error: invError } = await sb
      .from("inventory")
      .select("data")
      .limit(10000) // Supabase pagination limit

    if (invError) throw invError
    const inventory = inventoryData.map(row => row.data).filter(Boolean)
    console.log(`✅ Found ${inventory.length} vehicles\n`)

    // Group by model
    console.log("🏗️  Grouping vehicles by model...")
    const modelMap = {}
    inventory.forEach(v => {
      if (!v.brand || !v.model) return
      const modelKey = getModelKey(v.brand, v.model)
      if (!modelMap[modelKey]) {
        modelMap[modelKey] = {
          brand: v.brand,
          model: v.model,
          vehicles: [],
        }
      }
      modelMap[modelKey].vehicles.push(v)
    })

    const uniqueModels = Object.keys(modelMap)
    console.log(`✅ Found ${uniqueModels.length} unique models\n`)

    // Fetch existing blog posts to avoid regenerating
    console.log("📚 Fetching existing articles...")
    const { data: postsData, error: postsError } = await sb
      .from("blog_posts")
      .select("data")
      .eq("data->>'status'", "published")

    if (postsError) throw postsError
    const existingPosts = (postsData || []).map(row => row.data).filter(Boolean)
    const existingModelKeys = new Set(existingPosts.map(p => p.modelKey))
    console.log(`✅ Found ${existingPosts.length} existing articles\n`)

    // Process each model
    let generated = 0
    let linked = 0
    let skipped = 0

    for (const modelKey of uniqueModels) {
      const modelInfo = modelMap[modelKey]
      const vehicleCount = modelInfo.vehicles.length

      process.stdout.write(`🔄 ${modelInfo.brand} ${modelInfo.model} (${vehicleCount} vehicles)... `)

      // Check if article already exists
      let article = existingPosts.find(p => p.modelKey === modelKey)

      if (!article) {
        try {
          // Generate new article
          const draft = await generateArticle(modelInfo.brand, modelInfo.model, modelInfo.vehicles[0]?.year)
          const slug = slugify(`${modelInfo.brand} ${modelInfo.model}`)
          const now = new Date().toISOString()

          article = {
            id: `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            slug,
            modelKey,
            dealership: modelInfo.vehicles[0]?.dealership || "system-backfill",
            authorName: "EvCRM",
            title: draft.title || `${modelInfo.brand} ${modelInfo.model}: Buyer's Guide`,
            excerpt: draft.excerpt || "",
            body: draft.body || "",
            status: "published",
            createdAt: now,
            updatedAt: now,
            publishedAt: now,
          }

          // Insert article
          const { error: insertError } = await sb
            .from("blog_posts")
            .insert([{ id: article.id, data: article }])

          if (insertError) throw insertError
          generated++
          process.stdout.write(`✅ generated`)
        } catch (e) {
          console.error(`\n   ❌ Failed to generate: ${e.message}`)
          skipped++
          continue
        }
      } else {
        process.stdout.write(`⏭️  exists`)
      }

      // Link all vehicles of this model to the article
      try {
        const links = modelInfo.vehicles.map(v => ({
          id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: {
            articleId: article.id,
            vehicleId: v.id,
            createdAt: new Date().toISOString(),
          },
        }))

        if (links.length > 0) {
          const { error: linkError } = await sb.from("article_vehicles").insert(links)
          if (linkError) throw linkError
          linked += links.length
        }

        console.log(`, linked ${links.length} vehicles`)
      } catch (e) {
        console.error(`\n   ❌ Failed to link: ${e.message}`)
      }
    }

    console.log(`\n✨ Backfill complete!`)
    console.log(`📝 Generated: ${generated} new articles`)
    console.log(`🔗 Linked: ${linked} vehicles`)
    console.log(`⏭️  Skipped: ${skipped} (Gemini errors)`)
  } catch (e) {
    console.error("❌ Fatal error:", e.message)
    process.exit(1)
  }
}

backfillArticles()
