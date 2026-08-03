// Live sourcing for questions the database cannot answer.
//
// The point of CTE is that it never misses: a hit is served from our verified
// data, and a miss is sourced live, extracted into typed facts, and served
// anyway — so the calling AI never has to go elsewhere, and the user never
// gets "no data".
//
// Where the token saving actually comes from: the parsing happens HERE, on
// our server, instead of inside the model's context. The AI receives an
// answer rather than source material to reconcile. Note this moves cost from
// the consumer to us — which is the product, but only survives because of
// research_cache. Source once, serve many.
//
// ── The rule that makes this safe ─────────────────────────────────────
// EXTRACT, NEVER TEMPLATE. The previous implementation of this idea
// (execute_universal_research in cte-engine, disabled 2026-08-01, commit
// 787ad49) poured search snippets into a markdown template with emoji
// headings and called the result a "verified report". It emitted a literal
// `git status` as a code snippet, and its price regex matched the year out
// of "How many ev vehicles sold in Last 5years" and stored it as a price.
//
// So: every fact returned here carries its own sourceUrl, and any fact the
// model cannot ground is dropped rather than guessed. A short answer is
// correct. A padded one is a user acting on an invented number.
import { getSupabaseAdmin } from "../supabaseAdmin"
import { callGemini, extractJson, isGeminiConfigured } from "../orchestrator/gemini"

const CACHE_TTL_HOURS = Number(process.env.CTE_RESEARCH_TTL_HOURS || 72)
const DAILY_SOURCE_CAP = Number(process.env.CTE_RESEARCH_DAILY_CAP || 40)
const MAX_FACTS = 8

// Normalise so re-worded and re-ordered versions of the same question share
// one cache entry. Same intent as buildSignature() in
// lib/orchestrator/queryTrigger.js: cheap, exact-match bucketing rather than
// embeddings — free, and good enough at this stage.
export function buildResearchSignature(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !["the", "a", "an", "of", "in", "is", "are", "for", "to", "and"].includes(w))
    .sort()
    .join(" ")
}

async function readCache(sb, signature) {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 3600_000).toISOString()
  const { data, error } = await sb
    .from("research_cache")
    .select("*")
    .eq("signature", signature)
    .gte("sourced_at", cutoff)
    .maybeSingle()
  if (error || !data) return null
  return data
}

// Returns { ok, reason } rather than a bare boolean so a failure is
// distinguishable from a genuine cap — the lesson from commit 04f3a1a, where
// "daily cap reached" was logged for a missing table and sent debugging in
// entirely the wrong direction for an hour.
async function underDailyCap(sb) {
  const since = new Date(Date.now() - 86400_000).toISOString()
  const { count, error } = await sb
    .from("research_cache")
    .select("*", { count: "exact", head: true })
    .gte("sourced_at", since)
  if (error) return { ok: false, reason: `cap check failed (${error.code}: ${error.message}) — has research_cache.sql been run?` }
  return (count || 0) < DAILY_SOURCE_CAP
    ? { ok: true }
    : { ok: false, reason: `daily sourcing cap reached (${count}/${DAILY_SOURCE_CAP})` }
}

const PROMPT = (query) => `You are a research extractor for EvCRM.in, an Indian vehicle data service. Use Google Search to answer this question about the Indian automobile/EV market:

"${query}"

Extract ONLY facts you can point to a specific source for. Rules, in order of importance:

1. Every fact needs a real sourceUrl from your search results. No source, no fact.
2. State the exact period each number covers — Indian auto data constantly conflates fiscal year (Apr-Mar), calendar year, and rolling 12-month windows, and mixing them silently is the most common way these answers go wrong.
3. Never merge numbers that cover different periods, different scopes, or different vehicle categories into one figure. Report them separately with their own periods.
4. Distinguish a nameplate (all fuel types) from a specific powertrain variant, and a single model from a manufacturer's whole portfolio. Say which one a number refers to.
5. If the question cannot be answered from what you find, return an empty facts array and explain why in "limitation". An honest empty answer is correct. A computed or estimated one is not — do NOT calculate averages or totals from figures covering different periods.

Return ONLY a JSON object, no code fences, no commentary:
{
  "facts": [
    { "label": "what this number is", "value": "the figure", "unit": "units/month, INR, etc", "period": "e.g. June 2026, FY2025-26", "scope": "e.g. Nexon EV only / all Tata EVs / all India", "sourceUrl": "https://..." }
  ],
  "sources": [ { "title": "...", "url": "https://..." } ],
  "limitation": "empty string, or why the question could not be fully answered"
}`

/**
 * Answer `query` from live sources. Returns null — never anything invented —
 * if Gemini isn't configured, the cap is hit, the call fails, or nothing
 * could be grounded.
 */
export async function sourceLiveAnswer(query) {
  if (!query) return null
  const sb = getSupabaseAdmin()
  if (!sb) return null

  const signature = buildResearchSignature(query)

  const cached = await readCache(sb, signature)
  if (cached) {
    // Counter bump is fire-and-forget: nobody should wait on analytics to
    // get their answer, and a failed bump must never fail the response.
    sb.rpc("bump_research_hit", { sig: signature })
      .then(({ error }) => { if (error) console.warn("[sourceLive] hit bump failed:", error.message) })
      .catch(e => console.warn("[sourceLive] hit bump threw:", e.message))
    return { facts: cached.facts, sources: cached.sources, sourcedAt: cached.sourced_at, cached: true }
  }

  if (!isGeminiConfigured()) {
    console.warn("[sourceLive] Gemini not configured — returning nothing rather than inventing an answer")
    return null
  }
  const cap = await underDailyCap(sb)
  if (!cap.ok) {
    console.warn(`[sourceLive] not sourcing "${query}": ${cap.reason}`)
    return null
  }

  let parsed
  try {
    // Grounded: real Google Search with citations, so provenance is built in
    // rather than scraped. Low temperature — this is extraction, not writing.
    const { text } = await callGemini(PROMPT(query), { grounded: true, temperature: 0.2 })
    parsed = extractJson(text)
  } catch (e) {
    console.error("[sourceLive] sourcing failed:", e.message)
    return null
  }

  // Drop anything ungrounded. A fact without a real http source is exactly
  // the failure mode this module exists to prevent.
  const facts = (Array.isArray(parsed?.facts) ? parsed.facts : [])
    .filter(f => f && f.value != null && typeof f.sourceUrl === "string" && /^https?:\/\//.test(f.sourceUrl))
    .slice(0, MAX_FACTS)

  if (!facts.length) {
    console.warn(`[sourceLive] nothing groundable for "${query}"${parsed?.limitation ? ` — ${parsed.limitation}` : ""}`)
    return null
  }

  const sources = (Array.isArray(parsed?.sources) ? parsed.sources : [])
    .filter(s => s && typeof s.url === "string" && /^https?:\/\//.test(s.url))
    .slice(0, MAX_FACTS)

  const nowIso = new Date().toISOString()
  const { error } = await sb.from("research_cache").upsert({
    signature,
    original_query: String(query).slice(0, 500),
    facts,
    sources,
    hit_count: 1,
    sourced_at: nowIso,
    last_served_at: nowIso,
  }, { onConflict: "signature" })
  if (error) console.warn("[sourceLive] cache write failed (answer still served):", error.message)

  return { facts, sources, sourcedAt: nowIso, cached: false, limitation: parsed?.limitation || undefined }
}
