#!/usr/bin/env node

/**
 * One-time remediation for the AdSense "low value content" flag (2026-07-31).
 *
 * The per-model buyer's guides were generated from a fixed template with a
 * fill-in-the-blank title, producing 16 near-identical 302-675 word pages.
 * lib/blog.js has since been fixed to ground new articles in real data; this
 * script repairs the ones already published.
 *
 * For each published model guide:
 *   - Gather real facts (verified CTE specs/pricing + live dealer inventory
 *     + real comparables), mirroring lib/blog.js gatherModelFacts().
 *   - If we have real material  → regenerate the article IN PLACE, keeping
 *     the existing slug so indexed URLs don't 404.
 *   - If we have nothing real   → unpublish it rather than leave filler live.
 *
 * Dry-run by default. Pass --apply to actually write.
 *
 *   node scripts/remediate-thin-guides.js            # preview
 *   node scripts/remediate-thin-guides.js --apply    # execute
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + GEMINI_API_KEY in .env
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

// Load .env (same pattern as the other maintenance scripts).
if (fs.existsSync(".env")) {
  fs.readFileSync(".env", "utf8").split("\n").forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  })
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
const APPLY = process.argv.includes("--apply")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env — cannot regenerate articles.")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mirrors lib/blog.js gatherModelFacts(). Kept in sync deliberately — if you
// change the grounding logic there, change it here too (or better: delete
// this one-time script once the backlog is cleared).
async function gatherModelFacts(brand, model, inventory) {
  const facts = { listings: [], comparables: [] }

  const sameModel = inventory.filter(v =>
    v.status === "IN_STOCK" &&
    (v.condition !== "used" || v.inspectionReport?.approvalStatus === "APPROVED") &&
    v.brand?.toLowerCase() === brand?.toLowerCase() &&
    v.model?.toLowerCase() === model?.toLowerCase()
  )
  facts.listings = sameModel.map(v => ({
    variant: v.variant || undefined,
    year: v.year,
    condition: v.condition,
    kmDriven: v.condition === "used" ? v.km : undefined,
    exShowroomPriceINR: v.exShowroom || undefined,
    onRoadPriceINR: v.onRoadPrice || undefined,
    rangeKm: v.range || undefined,
    city: v.district,
    state: v.state,
    dealerName: v.dealerName,
  }))
  const prices = sameModel.map(v => v.exShowroom).filter(p => p > 0)
  if (prices.length) {
    facts.livePriceRangeINR = { low: Math.min(...prices), high: Math.max(...prices), listingCount: prices.length }
  }
  const cities = [...new Set(sameModel.map(v => v.district).filter(Boolean))]
  if (cities.length) facts.availableCities = cities

  const { data: matches } = await sb.from("products").select("*").ilike("name", `%${model}%`).limit(1)
  const product = matches?.[0]
  if (product) {
    facts.verified = {
      name: product.name,
      currentPriceINR: product.current_price || undefined,
      specs: product.specs || undefined,
      transparencyScores: {
        overall: product.overall_score, quality: product.quality_score,
        value: product.value_score, satisfaction: product.satisfaction_score,
      },
      sourcedFrom: product.source,
      asOf: product.crawled_at,
    }
    const { data: peers } = await sb.from("products")
      .select("name,brand,current_price,specs,overall_score")
      .eq("category", product.category).neq("id", product.id)
      .order("overall_score", { ascending: false, nullsFirst: false }).limit(4)
    facts.comparables = (peers || []).map(p => ({
      name: p.name, brand: p.brand, priceINR: p.current_price || undefined,
      specs: p.specs || undefined, overallScore: p.overall_score,
    }))
  }

  return (facts.verified || facts.listings.length > 0) ? facts : null
}

function buildPrompt(brand, model, facts) {
  return `You are an automotive journalist writing for EvCRM.in, an Indian vehicle marketplace. Write a buyer's guide for the ${brand} ${model}.

You have been given REAL, VERIFIED DATA below — cross-checked specs and pricing from our market database, plus our own live dealer inventory. This data is the whole point of the article: it is current, specific, and not available on other sites. Build the piece around it.

REAL DATA:
${JSON.stringify(facts, null, 2)}

RULES — these matter more than style:
- Use ONLY the figures in the data above. Do not add specs, prices, or claims that are not there. If something isn't in the data (charging time, boot space, warranty terms), simply don't discuss it — do not estimate or fill it in from general knowledge.
- Lead with what is concretely true about THIS model right now: its actual price, its actual verified specs, what's actually in stock and where.
- If comparables are provided, make a real comparison using their real numbers — how it actually stacks up, including where it loses. An honest weakness is more useful to a buyer than a list of strengths, and it's what makes the page worth reading.
- If live listings exist, say what's genuinely available (price range, cities, new vs used) — that's information a buyer can act on today.
- Prices in Indian format (Rs. or lakhs). Write "Rs." not the rupee symbol.
- No marketing voice. No "look no further", no "in today's fast-paced world", no invented owner quotes. Write like someone who has actually looked at the numbers.

STRUCTURE — vary it to fit this specific model's story; do not follow a fixed template:
- Roughly 700-1000 words.
- Use '## ' headings that describe what's actually in each section for THIS model, not generic labels like "Features" or "Conclusion".
- Open with the single most useful concrete fact for a buyer, not a preamble about the brand.

Return STRICTLY valid JSON, no markdown fences:
{
  "title": "specific, honest title under 70 chars — reflect this model's actual standout fact (a real price, a real range figure, a real trade-off). Do NOT use a fill-in-the-blank formula.",
  "excerpt": "1-2 sentence summary with a concrete number in it (max 160 chars)",
  "body": "the full article as plain text with double-newline paragraph breaks. Use '## ' at the start of a line for section headings."
}`
}

async function generate(brand, model, facts) {
  let lastError = null
  for (const m of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(brand, model, facts) }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty AI response")
      const parsed = JSON.parse(text)
      if (!parsed.title?.trim()) throw new Error("No title returned")
      if (!parsed.body || parsed.body.trim().length < 500) {
        throw new Error(`Body too short (${parsed.body?.trim().length || 0} chars)`)
      }
      return parsed
    } catch (e) {
      lastError = e.message
    }
  }
  throw new Error(lastError)
}

async function main() {
  console.log(APPLY ? "APPLYING CHANGES\n" : "DRY RUN — no writes. Pass --apply to execute.\n")

  const inventory = JSON.parse(fs.readFileSync("data/inventory.json", "utf8"))
  const { data: rows } = await sb.from("blog_posts").select("id,data").limit(1000)
  const guides = rows.filter(r =>
    r.data?.status === "published" && r.data?.type !== "news" && r.data?.type !== "knowledge"
  )

  console.log(`Found ${guides.length} published model guides.\n`)

  // Same-model duplicates: two published guides sharing a modelKey are
  // duplicate content by definition (e.g. two "Ather 450X" guides). Keep the
  // longer body — it's the more substantive page — and retire the rest.
  // Group by modelKey, but fall back to the normalized title when keys
  // differ for the same vehicle — the same model can be filed under two
  // brand spellings ("ather-energy-450x" vs "ather-450x") and still be the
  // same page. Identical titles are a reliable tell.
  const normTitle = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  const titleGroups = new Map()
  for (const row of guides) {
    const t = normTitle(row.data?.title)
    if (!titleGroups.has(t)) titleGroups.set(t, [])
    titleGroups.get(t).push(row)
  }

  const byKey = new Map()
  for (const row of guides) {
    const t = normTitle(row.data?.title)
    // If several guides share a title, treat the title as the grouping key
    // so they collapse together regardless of modelKey.
    const k = (titleGroups.get(t)?.length > 1) ? `title:${t}` : (row.data?.modelKey || row.id)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(row)
  }
  const dupRetired = []
  for (const [k, rows] of byKey) {
    if (rows.length < 2) continue
    rows.sort((a, b) => (b.data.body || "").length - (a.data.body || "").length)
    for (const loser of rows.slice(1)) {
      dupRetired.push(loser.id)
      console.log(`DUPLICATE  ${loser.data.title?.slice(0, 48)}  (same model as a longer guide — retiring)`)
      if (APPLY) {
        await sb.from("blog_posts").update({
          data: {
            ...loser.data,
            status: "unpublished_duplicate",
            unpublishedReason: `Duplicate model guide (modelKey "${k}"); a longer guide for the same model is kept (AdSense low-value-content remediation, 2026-07-31)`,
            unpublishedAt: new Date().toISOString(),
          },
        }).eq("id", loser.id)
      }
    }
  }
  if (dupRetired.length) console.log("")

  let regenerated = 0, unpublished = dupRetired.length, failed = 0

  // modelKey is `${brand} ${model}` slugified, so the brand/model split can't
  // be recovered from it by splitting on "-" — multi-word brands ("Ola
  // Electric", "URJA GLOBAL LIMITED") would be mis-parsed, which silently
  // made groundable models look ungroundable. Recover the real split by
  // matching the key back against inventory, and fall back to the CTE
  // products table for models we no longer stock.
  const keyOf = (brand, model) =>
    `${brand} ${model}`.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")

  const { data: allProducts } = await sb.from("products").select("name,brand")

  function resolveBrandModel(modelKey) {
    const invMatch = inventory.find(v => v.brand && v.model && keyOf(v.brand, v.model) === modelKey)
    if (invMatch) return { brand: invMatch.brand, model: invMatch.model }

    // In `products`, `name` usually already contains the brand ("TVS iQube"
    // with brand "TVS"), so try the bare name first, then brand+name for
    // rows where it doesn't.
    const slug = s => (s || "").toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
    const prodMatch = (allProducts || []).find(p =>
      p.name && (slug(p.name) === modelKey || keyOf(p.brand, p.name) === modelKey)
    )
    if (prodMatch) {
      const bare = prodMatch.brand && prodMatch.name.toLowerCase().startsWith(prodMatch.brand.toLowerCase())
        ? prodMatch.name.slice(prodMatch.brand.length).trim()
        : prodMatch.name
      return { brand: prodMatch.brand || "", model: bare }
    }

    // Last resort: treat the first token as the brand. Imperfect, but only
    // reached for models present in neither source — which gather will
    // reject anyway.
    const parts = (modelKey || "").split("-")
    return { brand: parts[0] || "", model: parts.slice(1).join(" ") }
  }

  for (const row of guides) {
    if (dupRetired.includes(row.id)) continue // already retired above
    const post = row.data
    const { brand, model } = resolveBrandModel(post.modelKey || "")
    const label = `${post.title?.slice(0, 48)}`

    let facts = null
    try {
      facts = await gatherModelFacts(brand, model, inventory)
    } catch (e) {
      console.log(`  ! fact-gather failed for ${label}: ${e.message}`)
    }

    if (!facts) {
      console.log(`UNPUBLISH  ${label}  (no verified specs, no live stock)`)
      if (APPLY) {
        await sb.from("blog_posts").update({
          data: {
            ...post,
            status: "unpublished_thin",
            unpublishedReason: "Thin templated content with no real data to ground a rewrite (AdSense low-value-content remediation, 2026-07-31)",
            unpublishedAt: new Date().toISOString(),
          },
        }).eq("id", row.id)
      }
      unpublished++
      continue
    }

    try {
      const oldWords = (post.body || "").trim().split(/\s+/).length
      if (!APPLY) {
        console.log(`REGENERATE ${label}  (${oldWords}w → grounded: verified=${!!facts.verified}, listings=${facts.listings.length}, comparables=${facts.comparables.length})`)
        regenerated++
        continue
      }
      const parsed = await generate(brand, model, facts)
      const newWords = parsed.body.trim().split(/\s+/).length
      await sb.from("blog_posts").update({
        data: {
          ...post,
          title: parsed.title.trim(),
          excerpt: parsed.excerpt || post.excerpt,
          body: parsed.body,
          // slug deliberately unchanged — the old URL may be indexed.
          groundedIn: {
            verifiedProduct: !!facts.verified,
            liveListings: facts.listings.length,
            comparables: facts.comparables.length,
          },
          regeneratedAt: new Date().toISOString(),
          regeneratedReason: "Rewritten from real verified data (AdSense low-value-content remediation, 2026-07-31)",
          updatedAt: new Date().toISOString(),
        },
      }).eq("id", row.id)
      console.log(`REGENERATED ${oldWords}w → ${newWords}w  |  ${parsed.title.slice(0, 60)}`)
      regenerated++
    } catch (e) {
      console.log(`FAILED     ${label}: ${e.message}`)
      failed++
    }
  }

  console.log(`\n${APPLY ? "Done" : "Would"}: regenerate ${regenerated}, unpublish ${unpublished}${failed ? `, failed ${failed}` : ""}`)
  if (!APPLY) console.log("Re-run with --apply to execute.")
}

main().catch(e => { console.error(e); process.exit(1) })
