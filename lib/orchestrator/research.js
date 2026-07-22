import { readTable, writeTable } from "../store"
import { callGemini, extractJson, isRetryableError } from "./gemini"

// STAGE 2 — RESEARCH
// For each DISCOVERED topic, run a grounded Gemini call to produce a
// structured research brief with citations. This is the NotebookLM-equivalent
// step — same job (source materials in, structured brief out) but automated.
//
// The brief format is deliberately shaped for the write stage's convenience:
// executive summary, verified facts with source markers, market impact,
// audience implications, a FAQ block, and a citation list. When Claude/Gemini
// writes the article next, the brief is basically a skeleton it fills in.
//
// If you want a human/NotebookLM pause between research and writing (e.g.
// paste this brief into NotebookLM, hand-edit, paste back), you can leave
// topics in state="RESEARCHED" — the write stage picks them up when you
// run it, not automatically. The composite /run endpoint runs all three
// stages back-to-back, but the individual stages don't.

const RESEARCH_PROMPT_TEMPLATE = `You are researching a trending Indian automobile story for an article on EvCRM.in. Use Google search to find and verify the current facts about this story.

TOPIC: {TOPIC}
CATEGORY: {CATEGORY}
KNOWN SOURCE: {SOURCE_URL}
PUBLISHER (if known): {PUBLISHER}
INITIAL SUMMARY: {SUMMARY}
INITIAL FACTS: {KEY_FACTS}

Produce a research brief. Every factual claim must include a [Citation: URL] marker pointing to a real source you saw. Do not invent sources.

Return ONLY a JSON object, no code fences, no prose. Use plain straight quotes only inside string values:
{
  "executiveSummary": "1-2 sentences summarizing what happened, with [Citation: URL]",
  "keyFacts": [
    "specific factual point with numbers/dates [Citation: URL]",
    "another factual point [Citation: URL]",
    "..."
  ],
  "marketImpact": "2-3 sentences on how this affects the Indian market segment",
  "buyerImplications": "1-2 sentences on what an Indian buyer should know or do",
  "commonQuestions": [
    { "question": "…", "answer": "…" },
    { "question": "…", "answer": "…" }
  ],
  "keywords": ["primary keyword", "secondary keyword", "..."],
  "citations": [
    { "url": "https://…", "title": "…", "publisher": "…" }
  ]
}

If you cannot verify the topic with real sources, return: {"error": "unverifiable"}`

function buildResearchPrompt(topic) {
  return RESEARCH_PROMPT_TEMPLATE
    .replace("{TOPIC}", topic.topic)
    .replace("{CATEGORY}", topic.category)
    .replace("{SOURCE_URL}", topic.sourceUrl)
    .replace("{PUBLISHER}", topic.publisher || "unknown")
    .replace("{SUMMARY}", topic.summary || "")
    .replace("{KEY_FACTS}", (topic.keyFacts || []).join(" | "))
}

async function updateOne(table, id, patch) {
  const all = await readTable(table)
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  await writeTable(table, all)
}

export async function runResearch({ count = 5 } = {}) {
  const wanted = Math.min(Math.max(1, count), 10)
  const all = await readTable("orch_topics")
  const pending = all.filter(t => t.state === "DISCOVERED").slice(0, wanted)

  const nowIso = new Date().toISOString()
  const results = { researched: 0, failed: 0, retrying: 0, errors: [] }
  const MAX_RETRIES = 5

  for (const topic of pending) {
    try {
      const { text, model } = await callGemini(buildResearchPrompt(topic), { grounded: true, temperature: 0.4 })
      const brief = extractJson(text)

      if (brief?.error === "unverifiable") {
        await updateOne("orch_topics", topic.id, {
          state: "FAILED",
          error: "Gemini could not verify with live sources",
          failedAt: nowIso,
        })
        results.failed++
        continue
      }

      if (!brief?.executiveSummary || !Array.isArray(brief.keyFacts)) {
        // Malformed output isn't a live-service issue, but it also isn't
        // necessarily the topic's fault — a bad JSON parse can happen once
        // and succeed on retry. Give it the same retry budget as transient
        // errors rather than failing it on the first bad parse.
        const retryCount = (topic.retryCount || 0) + 1
        await updateOne("orch_topics", topic.id, retryCount >= MAX_RETRIES
          ? { state: "FAILED", error: "Brief missing required fields after max retries", failedAt: nowIso, retryCount }
          : { error: "Brief missing required fields (will retry)", retryCount })
        results.failed += retryCount >= MAX_RETRIES ? 1 : 0
        results.retrying += retryCount >= MAX_RETRIES ? 0 : 1
        continue
      }

      await updateOne("orch_topics", topic.id, {
        state: "RESEARCHED",
        brief,
        researchedAt: nowIso,
        researchedByModel: model,
        retryCount: 0,
        error: null,
      })
      results.researched++
    } catch (e) {
      results.errors.push({ id: topic.id, topic: topic.topic, error: e.message })
      const retryCount = (topic.retryCount || 0) + 1
      const retryable = isRetryableError(e.message)

      if (retryable && retryCount < MAX_RETRIES) {
        // Leave state as DISCOVERED so the next research run picks it back
        // up — this is exactly the "high demand" / rate-limit case that
        // used to permanently drop good topics.
        await updateOne("orch_topics", topic.id, { error: e.message, retryCount, lastAttemptAt: nowIso })
        results.retrying++
      } else {
        await updateOne("orch_topics", topic.id, {
          state: "FAILED",
          error: e.message,
          failedAt: nowIso,
          retryCount,
        })
        results.failed++
      }
    }
  }

  return results
}
