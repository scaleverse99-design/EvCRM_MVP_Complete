#!/usr/bin/env node

/**
 * One-off retry for the 4 knowledge-hub topics that failed on the first
 * generate-knowledge-hub.js run (2x malformed JSON from Gemini, 2x transient
 * "high demand" errors). Not meant to be run again after this — the main
 * script has no dedupe-by-title check, so re-running it (or this) after
 * these succeed would create duplicate articles.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const slugify = (title) => {
  const base = (title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "post"
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

const RETRIES = [
  { topic: "Understanding Car Chassis & Body Types", category: "ICE Fundamentals", coverEmoji: "⛽", publishDate: "2026-07-23T09:00:00.000Z" },
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
- IMPORTANT: escape every double-quote character inside string values so the JSON stays valid. Do not use curly/smart quotes anywhere in the body text — use plain straight quotes and apostrophes only, or better, avoid quoting anything at all.

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
          generationConfig: { response_mime_type: "application/json", temperature: 0.6 },
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
  throw new Error(`Failed: ${lastError}`)
}

async function run() {
  console.log("🔁 Retrying 4 failed Knowledge Hub topics...\n")
  let ok = 0, failed = 0

  for (const { topic, category, coverEmoji, publishDate } of RETRIES) {
    process.stdout.write(`🔄 ${topic.slice(0, 60)}... `)
    // longer delay to avoid re-tripping the same "high demand" limit
    await new Promise(r => setTimeout(r, 15000))
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
        publishedAt: publishDate,
      }
      const { error } = await sb.from("blog_posts").insert([{ id: article.id, data: article }])
      if (error) throw error
      ok++
      console.log("✅")
    } catch (e) {
      failed++
      console.log(`❌ ${e.message}`)
    }
  }
  console.log(`\n✨ Done! Success: ${ok}, Failed: ${failed}`)
}

run()
