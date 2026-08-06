// Shared Gemini caller for the orchestrator pipeline. Uses the raw REST
// endpoint (no SDK) to match the pattern already in lib/blog.js — one less
// dependency to keep in sync and no adapter drift when the SDK bumps.
//
// Two modes:
//   callGemini(prompt, { grounded: false }) → plain JSON generation from
//     Gemini's own trained knowledge, no live web access. Cheap, deterministic
//     enough for structured output.
//   callGemini(prompt, { grounded: true })  → adds google_search as a tool so
//     the model queries the live web before responding. Used by the discover
//     stage (needs today's news) and the research stage (needs cited sources).
//     Grounded calls consume slightly more quota but are the whole point of
//     this pipeline vs the always-evergreen /learn agent.
//
// Every call fails soft over the model chain: 2.5-flash first (better output),
// 2.5-flash-lite as fallback (higher free-tier quota, catches rate-limit
// bursts). Returns raw text; parsing is the caller's job so each stage can
// tolerate its own kind of malformed AI output.

const GEMINI_API_KEY = process.env.GEMINI_ORCHESTRATOR_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Callers can pass their own key via opts.apiKey. This exists because the
// free tier is 20 requests/day PER KEY, so anything sharing a key competes
// for the same 20 — and one caller exhausting it silently stops the others.
// GEMINI_ORCHESTRATOR_KEY was itself created to stop the orchestrator
// competing with the /learn daily agent; the public MCP live-sourcing path
// needs the same separation, and more urgently, because it is reachable by
// anyone on the internet and can burn the content pipeline's whole daily
// quota with 20 unusual queries.
const resolveKey = (opts = {}) => opts.apiKey || GEMINI_API_KEY

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

export function isGeminiConfigured() {
  return !!GEMINI_API_KEY
}

export async function callGemini(prompt, opts = {}) {
  const apiKey = resolveKey(opts)
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured")

  const models = opts.models || DEFAULT_MODELS
  const grounded = !!opts.grounded

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      // JSON mode is incompatible with google_search grounding — Gemini
      // returns an error when both are set. Ask for JSON only when we're
      // not grounding; grounded calls return prose and callers extract
      // JSON with a regex (same pattern as scripts/generate-knowledge-hub.js).
      ...(grounded ? {} : { response_mime_type: "application/json" }),
    },
    ...(grounded ? { tools: [{ google_search: {} }] } : {}),
  }

  let lastError = null
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))

      // A truncated generation still arrives as a 200 with usable-looking
      // text — finishReason is the ONLY signal that it was cut off mid-way.
      // Without this check a half-written article publishes silently, which
      // is the same class of failure as the invented `current_price: 2026`
      // in lib/cte/liveCrawl.js: worse than an error, because nothing looks
      // wrong. Measured 2026-08-06: gemini-2.5-flash spent 1,272 internal
      // "thinking" tokens before emitting any prose, so a budget that looks
      // generous can still truncate. Classified retryable — thinking-token
      // usage varies per generation, so a re-roll often fits.
      const finishReason = data.candidates?.[0]?.finishReason
      if (finishReason && finishReason !== "STOP") {
        throw new Error(`Gemini generation incomplete (finishReason: ${finishReason})`)
      }

      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || ""
      if (!text) throw new Error("Empty Gemini response")
      return { text, model, groundingMetadata: data.candidates?.[0]?.groundingMetadata || null }
    } catch (e) {
      lastError = e.message
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError}`)
}

// Distinguishes transient failures (rate limits, capacity, network blips —
// worth retrying on the next cron run) from permanent ones (malformed
// output, missing fields — retrying with the same input won't help). Stages
// use this to decide whether to mark a topic FAILED (stop retrying) or leave
// its state untouched (pick it up again next run). Matched against Gemini's
// actual error strings observed in production this session.
const RETRYABLE_PATTERNS = [
  /high demand/i,
  /rate limit/i,
  /quota/i,
  /RESOURCE_EXHAUSTED/i,
  /UNAVAILABLE/i,
  /503/,
  /overloaded/i,
  /timeout/i,
  /ECONNRESET|ETIMEDOUT|ENOTFOUND/,
  // Malformed-output cases: a single generation coming back as unparseable
  // JSON (occasionally corrupted, occasionally wrapped oddly) is a
  // probabilistic quirk of that one generation, not a property of the topic
  // itself — retrying with the same input is a different roll and usually
  // succeeds. Treat these as retryable rather than permanently discarding a
  // topic (and its already-completed research) over one bad draw.
  /Could not extract JSON/i,
  /missing title or body/i,
  /Empty (Gemini|Claude) response/i,
  // Truncation (finishReason MAX_TOKENS) — how much budget the model burns
  // on internal thinking tokens varies per generation, so the same prompt
  // can fit on a re-roll. Bounded by write.js's MAX_RETRIES.
  /generation incomplete/i,
]

export function isRetryableError(message) {
  const msg = String(message || "")
  return RETRYABLE_PATTERNS.some(p => p.test(msg))
}

// Robust JSON extractor — Gemini in grounded mode often wraps the JSON in
// prose ("Here are the trending topics: [ ... ]"), sometimes in ```json
// fences. Try the whole response first (JSON mode case), then hunt for the
// outermost brace/bracket pair (grounded case), then give up.
export function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  try { return JSON.parse(cleaned) } catch { /* keep hunting */ }

  // Try the first {…} or […] balanced-ish block. Not a full grammar check —
  // just find the outermost object or array that JSON.parse accepts.
  for (const [open, close] of [["[", "]"], ["{", "}"]]) {
    const start = cleaned.indexOf(open)
    const end = cleaned.lastIndexOf(close)
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1)
      try { return JSON.parse(candidate) } catch { /* try next */ }
    }
  }
  throw new Error(`Could not extract JSON from Gemini response: ${text.slice(0, 200)}...`)
}
