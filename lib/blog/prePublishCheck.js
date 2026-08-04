// Pre-publish gate for articles.
//
// Every rule here exists because something actually shipped that shouldn't
// have. This is not a generic SEO checklist — it is a list of this site's
// own mistakes, encoded so they cannot repeat.
//
//   2026-07-31  AdSense flagged the site for "low value content". 16
//               model guides, 302-675 words, from a fill-in-the-blank title
//               ("Best reasons to buy the {brand} {model}"), written from
//               general knowledge with no real data. 9 retired, 7 rewritten.
//   2026-08-04  15 "Master OEM buying guides" published straight to
//               production from one string template. They told buyers a
//               PETROL Hyundai Creta gets "0% EV road tax exemption" and a
//               "-₹10K State EV Subsidy"; quoted ₹42K insurance identically
//               for a ₹5.54L Wagon R and a ₹45.95L IONIQ 5; listed ₹57K of
//               costs then reported the on-road price unchanged from
//               ex-showroom; and promised "up to ₹2.0L" road tax saving on
//               a ₹1.10L scooter.
//
// Deliberately deterministic — no AI. A gate that sometimes passes bad
// content because a model felt generous is not a gate. Same input, same
// verdict, every time, and every failure names the rule it broke.
//
// BLOCKERS stop publication. WARNINGS publish but should be reviewed.

const STOPWORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","this","that","these","those","it","its","as","by","from","has","have","had","you","your","we","our","can","will","if","not"])

const tokenize = (text) =>
  String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w) && (w.length > 2 || /^\d+$/.test(w)))

const wordCount = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length

// Jaccard overlap. Same approach as isDuplicate() in
// lib/orchestrator/discover.js — cheap, no embeddings, and it catches the
// case that matters: many pages built from one template.
function overlap(a, b) {
  const A = new Set(tokenize(a)), B = new Set(tokenize(b))
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const t of A) if (B.has(t)) shared++
  return shared / (A.size + B.size - shared)
}

// ── Rules ──────────────────────────────────────────────────────────────

// Imported, not redeclared: the writer is given these same numbers, and a
// gate that enforces thresholds the writer was never told produces articles
// that fail repeatedly for the same reason. See lib/blog/writerRules.js.
import { MIN_WORDS, TEMPLATE_OVERLAP, MIN_DISTINCT_NUMBERS } from "./writerRules.js"

// Phrases that assert precision. Fine over a verified figure, dishonest
// over an estimate — and the 2026-08-04 batch opened with "Here is the
// exact estimated cost breakdown", which is both at once.
const FALSE_PRECISION = /\b(exact|precise|guaranteed|confirmed)\b/i

// Claiming an EV incentive on a vehicle that is not electric. This is the
// single most damaging error in the 2026-08-04 batch: a buyer reading that
// a petrol Creta pays zero road tax will budget wrongly.
const EV_INCENTIVE = /(ev\s*(road\s*)?tax|road\s*tax\s*exemption|ev\s*subsidy|electric\s*vehicle\s*subsidy|0%\s*road\s*tax|zero\s*emission)/i
const NON_EV_FUEL = /^(petrol|diesel|cng|hybrid)$/i

/**
 * @param {object} post          the article about to be published
 * @param {object[]} existing    already-published posts, to compare against
 * @param {object} [context]     optional { fuelType, exShowroom } of the
 *                               vehicle the article is about, so fuel-type
 *                               claims can be checked
 * @returns {{ pass:boolean, blockers:string[], warnings:string[] }}
 */
export function checkArticle(post, existing = [], context = {}) {
  const blockers = []
  const warnings = []
  const body = String(post?.body || "")
  const title = String(post?.title || "")

  // 1. Substance -------------------------------------------------------
  if (!title.trim()) blockers.push("No title.")
  if (!body.trim()) blockers.push("No body.")

  const words = wordCount(body)
  if (words < MIN_WORDS) {
    blockers.push(`Body is ${words} words, below the ${MIN_WORDS}-word floor. The pages AdSense flagged on 2026-07-31 were 302-675 words.`)
  }

  // Real articles cite figures. Pure prose with no numbers is the shape of
  // the generic content that got flagged.
  const numbers = new Set((body.match(/\d[\d,.]*/g) || []).map(n => n.replace(/[,.]$/, "")))
  if (numbers.size < MIN_DISTINCT_NUMBERS) {
    warnings.push(`Only ${numbers.size} distinct figures in the body — likely generic prose rather than grounded content.`)
  }

  // 2. Templating ------------------------------------------------------
  // The failure mode both incidents share: many pages, one template.
  let worst = { slug: null, score: 0 }
  for (const p of existing) {
    if (!p || p.slug === post.slug || p.status !== "published") continue
    const score = overlap(body, p.body)
    if (score > worst.score) worst = { slug: p.slug, score }
  }
  if (worst.score >= TEMPLATE_OVERLAP) {
    blockers.push(`Body is ${Math.round(worst.score * 100)}% token-identical to already-published "${worst.slug}". Google's policy names "cookie-cutter templates with the same or similar content replicated within the same site".`)
  } else if (worst.score >= TEMPLATE_OVERLAP - 0.12) {
    warnings.push(`Body is ${Math.round(worst.score * 100)}% similar to "${worst.slug}" — close to the templating threshold.`)
  }

  // Fill-in-the-blank titles, e.g. "Best reasons to buy the {brand} {model}"
  if (/\{[a-z_]+\}|\$\{/i.test(title) || /\{[a-z_]+\}|\$\{/i.test(body)) {
    blockers.push("Unsubstituted template placeholder ({...} or ${...}) left in the text.")
  }

  // 3. Factual guards --------------------------------------------------
  if (FALSE_PRECISION.test(body) && /estimat|approx|indicative|around|roughly/i.test(body)) {
    blockers.push(`Claims precision ("exact"/"guaranteed") over figures the same text calls estimates. Say indicative, or don't estimate.`)
  }

  // EV incentives claimed for a non-EV. The 2026-08-04 batch told buyers a
  // petrol Creta and a diesel Thar Roxx both pay 0% road tax under an EV
  // exemption.
  const fuel = String(context.fuelType || post?.fuelType || "")
  if (fuel && NON_EV_FUEL.test(fuel) && EV_INCENTIVE.test(body)) {
    blockers.push(`Article is about a ${fuel} vehicle but claims EV incentives (road tax exemption / EV subsidy). Those apply only to electric vehicles.`)
  }

  // A cost breakdown whose total ignores the costs it just listed. The
  // 2026-08-04 batch listed ₹57K of charges and then reported the on-road
  // price identical to ex-showroom.
  const exShow = body.match(/ex[-\s]?showroom[^\n₹]*₹\s*([\d.]+)\s*(L|lakh|Cr)?/i)
  const onRoad = body.match(/on[-\s]?road[^\n₹]*₹\s*([\d.]+)\s*(L|lakh|Cr)?/i)
  if (exShow && onRoad && exShow[1] === onRoad[1]) {
    blockers.push("On-road price is stated as identical to ex-showroom price, despite listing additional charges. The arithmetic contradicts itself.")
  }

  // A saving larger than the vehicle costs. "Up to ₹2.0L road tax saving"
  // appeared on a ₹1.10L scooter.
  const price = Number(context.exShowroom) || 0
  if (price > 0) {
    for (const m of body.matchAll(/(?:saving|save|benefit|discount|subsidy)[^.\n]*?₹\s*([\d.]+)\s*(L|lakh)/gi)) {
      const claimed = parseFloat(m[1]) * 100000
      if (claimed > price) {
        blockers.push(`Claims a saving of ₹${m[1]}L on a vehicle costing ₹${(price / 100000).toFixed(2)}L — the saving exceeds the price.`)
        break
      }
    }
  }

  return { pass: blockers.length === 0, blockers, warnings }
}

/** Formats a verdict for a console/script caller. */
export function formatCheck(result, label = "article") {
  const lines = []
  lines.push(result.pass ? `PASS  ${label}` : `BLOCKED  ${label}`)
  result.blockers.forEach(b => lines.push(`  ✗ ${b}`))
  result.warnings.forEach(w => lines.push(`  ! ${w}`))
  return lines.join("\n")
}
