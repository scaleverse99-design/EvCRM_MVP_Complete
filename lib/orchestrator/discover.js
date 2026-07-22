import { readTable, writeTable } from "../store"
import { callGemini, extractJson } from "./gemini"

// STAGE 1 — DISCOVER
// Ask Gemini (with google_search grounding) for what's actually trending in
// Indian automobile/EV news RIGHT NOW, dedupe against topics we've already
// enqueued or published, and drop the fresh ones into orch_topics with
// state="DISCOVERED".
//
// Grounded (live web) is non-negotiable here — the whole point of this
// pipeline vs the evergreen /learn agent is to catch actual breaking topics
// with real source URLs the article can cite. Ungrounded output would be
// hallucinated topic titles with made-up source links.
//
// Dedupe strategy: case-insensitive substring match against the topic titles
// of every non-FAILED row (both queued and already-published) in the last
// 30 days. Not perfect — an aggressive rewording of the same story can
// slip through — but catches the common case where Gemini returns the same
// launch story three runs in a row.

const DEDUPE_WINDOW_DAYS = 30

function normalizeTitle(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function slugForTopic(topic) {
  return normalizeTitle(topic).slice(0, 60).replace(/\s+/g, "-") || "topic"
}

function isDuplicate(newTitle, existingTitles) {
  const norm = normalizeTitle(newTitle)
  if (!norm) return true // empty title → drop it
  for (const existing of existingTitles) {
    if (!existing) continue
    // Either direction of substring containment counts as a match — catches
    // "Tata Nexon 2026 launch" vs "Tata Nexon 2026 EV launch details".
    if (norm.includes(existing) || existing.includes(norm)) return true
  }
  return false
}

const DISCOVERY_PROMPT = `You are a research analyst for EvCRM.in, an Indian vehicle marketplace. Search Google right now for the most important trending automobile and electric-vehicle stories in India from the last 24 hours.

Find up to {COUNT} distinct trending stories. Cover a mix of:
- New vehicle launches or price announcements (any brand, any segment)
- EV / battery / charging infrastructure news
- Government policy changes (FAME, GST, subsidies, road tax)
- Recalls, safety issues, or major supply/demand shifts
- Notable dealer or industry announcements

For each story you find, extract:
- A short topic title (max 80 characters) capturing the specific news
- A category (one of: bikes, scooters, cars, commercial, ev, finance, services)
- The ORIGINAL news source URL (must be a real URL you saw during the search — no fabrication)
- 2-4 key factual points from the source (include specific numbers, dates, model names)
- The publisher or publication (e.g. "Autocar India", "HT Auto", "Economic Times Auto")
- A one-sentence summary of what happened

Return ONLY a JSON array. No prose, no code fences.
[
  {
    "topic": "…",
    "category": "…",
    "sourceUrl": "https://…",
    "keyFacts": ["…", "…"],
    "publisher": "…",
    "summary": "…"
  }
]

If you cannot find real trending stories, return an empty array [] rather than making anything up.`

export async function runDiscover({ count = 10 } = {}) {
  const wanted = Math.min(Math.max(1, count), 15)

  const prompt = DISCOVERY_PROMPT.replace("{COUNT}", String(wanted))
  const { text, model } = await callGemini(prompt, { grounded: true, temperature: 0.4 })

  let topics
  try {
    topics = extractJson(text)
  } catch (e) {
    return { discovered: 0, skipped: 0, errors: [`Parse failure: ${e.message}`], model }
  }
  if (!Array.isArray(topics)) {
    return { discovered: 0, skipped: 0, errors: [`Expected JSON array, got ${typeof topics}`], model }
  }

  // Build the dedupe set: every existing topic within the window PLUS every
  // published blog_post's title (in case a topic ran through the pipeline
  // fully and is already live — we don't want to write it again).
  const [existing, blogPosts] = await Promise.all([
    readTable("orch_topics"),
    readTable("blog_posts"),
  ])
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const dedupeTitles = new Set()
  for (const row of existing) {
    if (row.state === "FAILED") continue // let failed topics be re-tried if they resurface
    if (row.discoveredAt && new Date(row.discoveredAt) < cutoff) continue
    dedupeTitles.add(normalizeTitle(row.topic))
  }
  for (const post of blogPosts) {
    if (post.type === "news" && post.title) dedupeTitles.add(normalizeTitle(post.title))
  }

  const nowIso = new Date().toISOString()
  const errors = []
  const rowsToInsert = []
  let skipped = 0

  for (const t of topics) {
    if (!t?.topic || !t?.sourceUrl) { skipped++; continue }
    if (isDuplicate(t.topic, dedupeTitles)) { skipped++; continue }

    dedupeTitles.add(normalizeTitle(t.topic))
    rowsToInsert.push({
      id: `topic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      topic: String(t.topic).slice(0, 200),
      category: String(t.category || "cars").toLowerCase(),
      sourceUrl: String(t.sourceUrl),
      keyFacts: Array.isArray(t.keyFacts) ? t.keyFacts.slice(0, 6) : [],
      publisher: t.publisher || "",
      summary: String(t.summary || "").slice(0, 500),
      slugSeed: slugForTopic(t.topic),
      state: "DISCOVERED",
      discoveredAt: nowIso,
      discoveredByModel: model,
    })
  }

  if (rowsToInsert.length > 0) {
    const all = existing.concat(rowsToInsert)
    try {
      await writeTable("orch_topics", all)
    } catch (e) {
      errors.push(`Persist failure: ${e.message}`)
      return { discovered: 0, skipped, errors, model }
    }
  }

  return { discovered: rowsToInsert.length, skipped, errors, model, topics: rowsToInsert.map(r => ({ id: r.id, topic: r.topic })) }
}
