/**
 * 🤖 OpenRouter AI Client — genuinely-free model chain.
 *
 * ── Three bugs fixed here 2026-08-06, all verified against the live API ──
 *
 * 1. `openrouter/auto` IS NOT FREE. It was the sole entry in a const named
 *    FREE_MODELS, under a docstring claiming "100% free models". `auto` is
 *    a paid router that picks a model and bills for it, so on this account
 *    ("never purchased credits") every single call returned 402. Because
 *    write.js tries OpenRouter FIRST, that meant the writer silently fell
 *    through to Gemini (20 req/day free tier) and then to the non-AI
 *    template writer. Genuinely-free models carry an explicit `:free`
 *    suffix — those are what's listed below, each confirmed to return
 *    `cost: 0` on a zero-credit key.
 *
 * 2. `max_tokens` was hardcoded to 2000 and not overridable. Measured: a
 *    1,002-word article used 2,361 completion tokens — 664 of them
 *    REASONING tokens burned before any prose was emitted (these models
 *    think first, same as gemini-2.5-flash). 2000 would have truncated it
 *    mid-sentence. Default is now 8000 and callers can override.
 *
 * 3. `finish_reason` was never checked. A truncated generation returns
 *    HTTP 200 with plausible-looking text, so a half-written article
 *    published with nothing looking wrong — the same silent-corruption
 *    class guarded against in gemini.js and lib/cte/liveCrawl.js.
 *
 * The list is a CHAIN, not a single model: free models are rate-limited
 * per-provider and return 429 individually (gemma-4 was 429 while nemotron
 * served fine at the same moment), so one being busy must not fail the call.
 */

// Ordered by measured suitability for long-form prose. All `:free`.
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-20b:free",
]

// Generous by default — see bug #2 above. Reasoning tokens come out of this
// same budget, so a number that looks comfortable can still truncate.
const DEFAULT_MAX_TOKENS = 8000

const DEFAULT_SYSTEM_PROMPT =
  "You are a professional Indian automotive journalist and SEO writer for EvCRM.in. Always output clean JSON."

export function isOpenRouterConfigured() {
  return !!process.env.OPENROUTER_API_KEY
}

export async function callOpenRouter(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is missing")
  }

  // An explicit options.model pins to one model; otherwise walk the chain.
  const models = options.model ? [options.model] : FREE_MODELS
  let lastError = null

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://evcrm.in",
          "X-Title": "EvCRM CTE Orchestrator"
        },
        body: JSON.stringify({
          model,
          messages: [
            // Defaults to demanding JSON because write.js — the main caller —
            // runs the result through extractJson(). Prose callers must
            // override, or they get a JSON object back and won't know why.
            { role: "system", content: options.systemPrompt || DEFAULT_SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ],
          temperature: options.temperature || 0.6,
          max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS
        })
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 300)}`)
      }

      const data = await res.json()
      if (data.error) {
        throw new Error(`OpenRouter error: ${String(data.error.message).slice(0, 300)}`)
      }

      const choice = data.choices?.[0]
      const content = choice?.message?.content || ""

      // Bug #3 — never return a generation that was cut off. "length" is
      // OpenRouter's MAX_TOKENS equivalent.
      if (choice?.finish_reason && choice.finish_reason !== "stop") {
        throw new Error(`generation incomplete (finish_reason: ${choice.finish_reason})`)
      }
      if (!content.trim()) {
        throw new Error("empty response body")
      }

      return { text: content, modelUsed: model }
    } catch (err) {
      lastError = err.message
      console.warn(`[OpenRouter] ${model} failed: ${err.message}`)
    }
  }

  throw new Error(`All OpenRouter free models failed. Last error: ${lastError}`)
}
