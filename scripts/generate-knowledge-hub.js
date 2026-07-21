#!/usr/bin/env node

/**
 * Generate the initial Knowledge Hub batch — evergreen EV/automobile
 * education content at /learn, separate from the per-model buyer's guides
 * at /blog. The idea: whether or not a reader buys from us, they leave
 * understanding the product — that's what makes evcrm.in the source people
 * come back to, and what search engines treat as an authority page rather
 * than a lead-gen page.
 *
 * Publishes in batches of 4/day (one category per day) via staggered
 * publishedAt timestamps — all rows are inserted now with status:"published"
 * but /api/learn only surfaces a row once its publishedAt has passed, so the
 * rollout drips out on schedule without needing a recurring job to run it.
 *
 * Usage:
 *   node scripts/generate-knowledge-hub.js
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + GEMINI_API_KEY in env.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}
if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const slugify = (title) => {
  const base = (title || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "post"
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

// 4 categories x 4 topics = 16 articles, rolled out one category per day.
const BATCHES = [
  {
    category: "EV Fundamentals",
    coverEmoji: "⚡",
    topics: [
      "How Does an Electric Vehicle Motor Work? BLDC vs PMSM Explained",
      "EV Battery Technology Explained: Li-ion Cells, BMS & Battery Life",
      "EV Charging Types Explained: AC, DC Fast Charging & Connector Types in India",
      "EV vs Hybrid vs Plug-in Hybrid: What's the Real Difference?",
    ],
  },
  {
    category: "ICE Fundamentals",
    coverEmoji: "⛽",
    topics: [
      "How a Petrol or Diesel Engine Actually Works",
      "Car Transmission Types Explained: Manual, AMT, CVT, DCT & Automatic",
      "Understanding Car Chassis & Body Types",
      "Suspension Systems Explained: What Makes a Ride Smooth or Sporty",
    ],
  },
  {
    category: "Buying Guides",
    coverEmoji: "🧭",
    topics: [
      "New vs Used Vehicle: A Complete Buyer's Checklist",
      "2-Wheeler vs 4-Wheeler EV: Which Makes Sense for You?",
      "On-Road Price vs Ex-Showroom Price: The Real Cost of a Vehicle in India",
      "Vehicle Insurance & Registration Basics for First-Time Buyers in India",
    ],
  },
  {
    category: "Tech Trends",
    coverEmoji: "🚀",
    topics: [
      "Solid-State Batteries: The Next Big Leap for EVs",
      "ADAS Explained: Understanding Modern Car Safety Tech",
      "Battery Swapping vs Fast Charging: Which Will Win in India?",
      "The Rise of Connected Cars: What Smart Vehicle Tech Means for You",
    ],
  },
]

async function generateArticle(topic, category) {
  const prompt = `You are writing an educational article for EvCRM's "Learn" knowledge hub (evcrm.in/learn) — an evergreen resource that teaches Indian vehicle buyers how EVs and automobiles actually work, so they leave fully informed whether or not they buy from us.

Topic: "${topic}"
Category: ${category}

Requirements:
- Written for a curious first-time reader, not an engineer — explain technical terms in plain language before using them
- Indian market context where relevant (brands, road conditions, pricing in ₹, regulations)
- Accurate and educational — no invented statistics or specs you're not confident about
- 500-700 words, structured with 3-4 clear sections
- End with why this knowledge helps a buyer make a better decision

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "a clear, search-friendly title (max 70 chars)",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings.",
  "coverEmoji": "one emoji that best represents this specific topic"
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
    }
  }
  throw new Error(`Failed to generate "${topic}": ${lastError}`)
}

async function run() {
  console.log("🚀 Generating Knowledge Hub batch (16 articles, 4/day rollout)...\n")

  let generated = 0
  let failed = 0

  for (let dayOffset = 0; dayOffset < BATCHES.length; dayOffset++) {
    const { category, coverEmoji, topics } = BATCHES[dayOffset]

    // Day 0 = today, Day 1 = tomorrow, etc. — 9am IST-ish stagger per batch.
    const publishDate = new Date()
    publishDate.setDate(publishDate.getDate() + dayOffset)
    publishDate.setHours(9, 0, 0, 0)
    const publishedAt = publishDate.toISOString()

    console.log(`📅 ${category} — publishing ${publishDate.toDateString()}`)

    for (const topic of topics) {
      process.stdout.write(`  🔄 ${topic.slice(0, 60)}... `)
      try {
        const draft = await generateArticle(topic, category)
        const slug = slugify(draft.title || topic)
        const now = new Date().toISOString()

        const article = {
          id: `blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          slug,
          type: "knowledge",
          category,
          authorName: "EvCRM",
          title: draft.title || topic,
          excerpt: draft.excerpt || "",
          body: draft.body || "",
          coverEmoji: draft.coverEmoji || coverEmoji,
          status: "published",
          createdAt: now,
          updatedAt: now,
          publishedAt,
        }

        const { error } = await sb.from("blog_posts").insert([{ id: article.id, data: article }])
        if (error) throw error

        generated++
        console.log(`✅ (live ${publishDate.toDateString()})`)
      } catch (e) {
        failed++
        console.log(`❌ ${e.message}`)
      }
    }
    console.log("")
  }

  console.log(`✨ Done! Generated: ${generated}, Failed: ${failed}`)
}

run()
