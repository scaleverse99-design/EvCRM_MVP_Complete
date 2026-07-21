#!/usr/bin/env node

/**
 * One-off enrichment pass for Knowledge Hub articles published before the
 * visual-layout feature (keyTakeaways / pullQuote / comparisonTable) shipped.
 * Does NOT touch title/body/slug — only derives the new visual fields from
 * the article's existing content, so it's a much smaller/cheaper prompt than
 * a full regeneration and can't accidentally change what's already published.
 *
 * Usage:
 *   node scripts/enrich-knowledge-visuals.js
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + GEMINI_API_KEY in env.
 * Safe to re-run — skips any article that already has keyTakeaways.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error("❌ Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY in env")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function deriveVisuals(article) {
  const prompt = `Here is a published educational article. Extract/derive visual-summary elements from it — do not change or rewrite the article itself.

Title: "${article.title}"
Body:
${article.body}

Produce:
- keyTakeaways: 3-5 short punchy points (each under 12 words) that summarize the article, each with one representative emoji
- pullQuote: one striking, standalone sentence — either taken near-verbatim from the article or lightly adapted (under 20 words)
- comparisonTable: ONLY if the article's topic is naturally comparative (e.g. "X vs Y", listing types/options) — a small table with a title, 2-4 short column headers, and 2-5 rows (use a word, short phrase, or 🟢/🟡/🔴 per cell). Set to null if not naturally comparative — don't force one.

Return STRICTLY valid JSON, no markdown fences, plain straight quotes only:
{
  "keyTakeaways": [{"icon": "⚙️", "text": "short punchy point"}],
  "pullQuote": "one striking sentence, or empty string if nothing fits",
  "comparisonTable": {"title": "short title", "headers": ["", "Option A", "Option B"], "rows": [["Metric", "value", "value"]]}
}`

  let lastError = null
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.5 },
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
  throw new Error(lastError)
}

async function run() {
  console.log("🎨 Enriching existing Knowledge Hub articles with visual elements...\n")

  const { data, error } = await sb.from("blog_posts").select("id, data")
  if (error) { console.error("❌", error.message); process.exit(1) }

  const needsEnrichment = data
    .map(row => ({ id: row.id, article: row.data }))
    .filter(({ article }) => article.type === "knowledge" && (!article.keyTakeaways || article.keyTakeaways.length === 0))

  console.log(`Found ${needsEnrichment.length} article(s) needing enrichment.\n`)

  let ok = 0, failed = 0
  for (const { id, article } of needsEnrichment) {
    process.stdout.write(`🔄 ${article.title.slice(0, 55)}... `)
    // small delay between calls to avoid tripping rate limits
    await new Promise(r => setTimeout(r, 3000))
    try {
      const visuals = await deriveVisuals(article)
      const updated = {
        ...article,
        keyTakeaways: Array.isArray(visuals.keyTakeaways) ? visuals.keyTakeaways.slice(0, 5) : [],
        pullQuote: visuals.pullQuote || "",
        comparisonTable: visuals.comparisonTable && visuals.comparisonTable.rows?.length ? visuals.comparisonTable : null,
        updatedAt: new Date().toISOString(),
      }
      const { error: updErr } = await sb.from("blog_posts").update({ data: updated }).eq("id", id)
      if (updErr) throw updErr
      ok++
      console.log("✅")
    } catch (e) {
      failed++
      console.log(`❌ ${e.message}`)
    }
  }

  console.log(`\n✨ Done! Enriched: ${ok}, Failed: ${failed}`)
}

run()
