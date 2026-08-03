import { readTable, writeTable } from "../store"
import { callGemini, extractJson } from "./gemini"
import { fetchGoogleAutocomplete } from "./intentEngine.js"

// STAGE 1 — DISCOVER
// Ask Gemini (with google_search grounding + live Google Autocomplete signals)
// for what's actually trending in Indian automobile/EV search queries and news RIGHT NOW., dedupe against topics we've already
// enqueued or published, and drop the fresh ones into orch_topics with
// state="DISCOVERED".
//
// Grounded (live web) is non-negotiable here — the whole point of this
// pipeline vs the evergreen /learn agent is to catch actual breaking topics
// with real source URLs the article can cite. Ungrounded output would be
// hallucinated topic titles with made-up source links.
//
// Dedupe strategy: two signals, both checked against every non-FAILED row
// (queued or published) in the last 30 days.
//   1. Source URL match — if a new topic cites the exact same original
//      article as an existing one, it's the same story, full stop.
//   2. Significant-token overlap (Jaccard similarity on words with stopwords
//      removed) — catches the dominant real-world failure mode: a grounded
//      search re-finding the same event and phrasing it differently each
//      run ("Kia Syros EV Launched: Prices Revealed..." vs "Kia Syros EV
//      Bookings Open for July 23 Launch..." — zero substring overlap, but
//      clearly the same story). A prior version used substring containment
//      only, which missed exactly this case and let 3 separate articles
//      about the same Kia Syros launch go live within 4 days — caught via a
//      live AdSense "low value / scaled content" policy flag, not a test.
const DEDUPE_WINDOW_DAYS = 30
const TOKEN_OVERLAP_THRESHOLD = 0.4 // fraction of the smaller title's significant tokens that must match

// Known, honest limits of a pure token-overlap heuristic (tested against
// real duplicate titles pulled from the live blog, 2026-07-31):
//   - False negatives on pure-synonym rewording with no shared entity/number
//     ("Maruti prices to RISE" vs "Maruti announces price HIKE" — same
//     event, zero shared distinctive tokens beyond the brand name).
//   - False positives on same-brand-different-model articles that share the
//     "Buyer's Guide" template ("Ather 450 Plus" vs "Ather 450X" can
//     collide on {ather, buyer, guide}-adjacent overlap alone).
// Fixing either properly needs semantic/embedding similarity, not string
// heuristics — out of scope for this pass. This catches the dominant real
// failure mode (near-identical re-reported breaking news) which is what
// actually caused the live AdSense "low value / scaled content" flag.

// Includes words that are domain-generic on an EV/auto site rather than
// story-specific ("electric", "ev" — nearly every title has one) — these
// dilute the signal without distinguishing one story from another.
const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "with",
  "by", "from", "up", "as", "its", "your", "you", "this", "what", "it", "means", "why",
  "how", "guide", "buyer", "buyers", "launched", "launch", "india", "indian", "ev", "evs",
  "electric", "vehicle", "vehicles", "car", "cars", "choice", "smart", "right", "practical",
])

function normalizeTitle(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function slugForTopic(topic) {
  return normalizeTitle(topic).slice(0, 60).replace(/\s+/g, "-") || "topic"
}

function significantTokens(title) {
  // Numeric tokens (e.g. "52" from "52,000 stations") carry real
  // distinguishing signal even at 2 characters — only length-filter words.
  return new Set(normalizeTitle(title).split(" ").filter(w => (w.length > 2 || /^\d+$/.test(w)) && !STOPWORDS.has(w)))
}

function tokenOverlapRatio(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
  for (const tok of smaller) if (larger.has(tok)) shared++
  return shared / smaller.size
}

function isDuplicate(newTitle, existingEntries, newSourceUrl) {
  const norm = normalizeTitle(newTitle)
  if (!norm) return true // empty title → drop it
  const newTokens = significantTokens(newTitle)

  for (const existing of existingEntries) {
    if (!existing.title) continue
    // Signal 1: same original source article.
    if (newSourceUrl && existing.sourceUrl && newSourceUrl === existing.sourceUrl) return true
    // Signal 2: either direction of substring containment (still catches
    // the near-verbatim case cheaply before falling to token overlap).
    if (norm.includes(existing.title) || existing.title.includes(norm)) return true
    // Signal 3: significant-token overlap — same real-world event, reworded.
    if (tokenOverlapRatio(newTokens, existing.tokens) >= TOKEN_OVERLAP_THRESHOLD) return true
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

  // Fetch real-time Google search suggestions in India
  const intentSeeds = ["ev charging station india", "electric scooter launch india", "car price hike india", "ev subsidy india"]
  let autocompleteSignals = []
  try {
    const rawLists = await Promise.all(intentSeeds.map(s => fetchGoogleAutocomplete(s)))
    autocompleteSignals = Array.from(new Set(rawLists.flat())).slice(0, 15)
  } catch (err) {
    console.warn("[Discover] Autocomplete signal fetch warning:", err.message)
  }

  const prompt = DISCOVERY_PROMPT
    .replace("{COUNT}", String(wanted))
    + (autocompleteSignals.length > 0 ? `\n\nREAL-TIME GOOGLE SEARCH INTENT SIGNALS:\n${autocompleteSignals.map(s => `- "${s}"`).join("\n")}` : "")

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

  // Build the dedupe entry list: every existing topic within the window PLUS
  // every published blog_post (in case a topic ran through the pipeline
  // fully and is already live — we don't want to write it again). Each
  // entry carries title + tokens + sourceUrl so isDuplicate can check all
  // three signals.
  const [existing, blogPosts] = await Promise.all([
    readTable("orch_topics"),
    readTable("blog_posts"),
  ])
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const dedupeEntries = []
  for (const row of existing) {
    if (row.state === "FAILED") continue // let failed topics be re-tried if they resurface
    if (row.discoveredAt && new Date(row.discoveredAt) < cutoff) continue
    const title = normalizeTitle(row.topic)
    dedupeEntries.push({ title, tokens: significantTokens(row.topic), sourceUrl: row.sourceUrl })
  }
  for (const post of blogPosts) {
    if (post.type === "news" && post.title) {
      const title = normalizeTitle(post.title)
      dedupeEntries.push({ title, tokens: significantTokens(post.title), sourceUrl: post.sourceUrl })
    }
  }

  const nowIso = new Date().toISOString()
  const errors = []
  const rowsToInsert = []
  let skipped = 0

  for (const t of topics) {
    if (!t?.topic || !t?.sourceUrl) { skipped++; continue }
    if (isDuplicate(t.topic, dedupeEntries, t.sourceUrl)) { skipped++; continue }

    dedupeEntries.push({ title: normalizeTitle(t.topic), tokens: significantTokens(t.topic), sourceUrl: t.sourceUrl })
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
