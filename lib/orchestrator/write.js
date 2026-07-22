import { readTable, writeTable } from "../store"
import { callGemini, extractJson, isRetryableError } from "./gemini"
import { pingIndexNow } from "../indexnow"
import { slugify } from "../blog"

// STAGE 3 — WRITE
// For each RESEARCHED topic, generate a full SEO article from the brief
// (with real citations) and drop it straight into blog_posts as type="news"
// so it appears at evcrm.in/blog/<slug> without touching any other rendering
// code. Ungrounded generation here — the brief already carries verified
// facts and citations, no need to hit google_search a second time.
//
// Writer is Gemini by default. If ORCH_WRITER=claude and CLAUDE_API_KEY is
// set, we route through Anthropic's API instead (the @anthropic-ai/sdk that
// Antigravity added is already in package.json). That switch is a one-line
// env-var flip — the default keeps everything on the free Gemini tier.

const ORCH_WRITER = (process.env.ORCH_WRITER || "gemini").toLowerCase()

const WRITER_PROMPT = `You are an experienced automotive journalist writing for EvCRM.in, an Indian vehicle marketplace read by prospective buyers and dealers. Your articles are meant to be the most complete, useful page a buyer finds when they search this topic — that is how they rank on Google.

Write a comprehensive 1000-1400 word article using the research brief below. Use EVERY substantive fact, the background, the comparison, and the buyer implications from the brief — do not leave depth on the table. Every factual claim must carry its citation from the brief as a markdown link: [text](url). Do not add citations for anything not in the brief, and do not drop citations that are in the brief.

TOPIC: {TOPIC}
CATEGORY: {CATEGORY}

BRIEF (JSON):
{BRIEF}

STRUCTURE (aim for depth and scannability — both help ranking):
- Open with a hook that states the news and why it matters to an Indian buyer, in the first two sentences.
- 4-6 H2 sections (use '## ' at the start of a line). Include, where the brief supports it: what happened, key specs/details with the exact numbers, how it compares to rivals or the previous version, what it means for buyers, and a short FAQ section built from the brief's commonQuestions.
- Weave the exact numbers in (prices in Rs., range in km, kWh, bhp, dates) — specificity is what makes it authoritative.
- Natural, conversational journalism, not a press release or a spec dump.

STYLE:
- Use Rs. for rupees — never the ₹ symbol character.
- Plain text body with double-newline paragraph breaks. The ONLY markdown allowed is '## ' headings and [text](url) citation links.
- Straight quotes only (no curly quotes) so the JSON stays valid.

Return ONLY a JSON object, no code fences:
{
  "title": "Search-friendly title (max 70 chars, main keyword early)",
  "excerpt": "1-2 sentence summary for search snippets (max 160 chars, keyword early)",
  "body": "Full article as plain text with '## ' headings and [text](url) citations",
  "coverEmoji": "one representative emoji",
  "keyTakeaways": [
    { "icon": "⚡", "text": "short punchy point under 12 words" }
  ],
  "pullQuote": "one striking sentence pulled from the article, or empty string",
  "seoKeywords": ["primary long-tail keyword", "secondary keyword", "..."]
}`

async function generateWithGemini(topic) {
  const prompt = WRITER_PROMPT
    .replace("{TOPIC}", topic.topic)
    .replace("{CATEGORY}", topic.category)
    .replace("{BRIEF}", JSON.stringify(topic.brief, null, 2))
  const { text, model } = await callGemini(prompt, { grounded: false, temperature: 0.7 })

  // Gemini's JSON-mode output occasionally comes back with a run of literal
  // '?' characters replacing corrupted bytes — seen specifically on
  // financial/rupee-heavy topics despite the prompt asking for "Rs." instead
  // of the ₹ symbol. A previous fix here replaced every '?' with "Rs.",
  // which made corrupted output worse (one bad character becomes four) and
  // still fails to parse either way. Don't try to repair it — a genuinely
  // corrupted response can't be un-corrupted by string substitution. Just
  // let extraction fail cleanly; the retry logic in runWrite() below treats
  // a parse failure as retryable, so a bad draw retries on the next run
  // instead of throwing away a topic that has perfectly good research.
  const draft = extractJson(text)
  return { draft, modelUsed: model }
}

// Claude writer — stubbed intentionally. Turning it on is: (1) set
// CLAUDE_API_KEY in .env, (2) set ORCH_WRITER=claude, (3) uncomment the
// import + fetch below. Left commented out so a copy of this file deployed
// without a Claude key doesn't crash on import; and so no accidental token
// spend happens before you decide to switch.
async function generateWithClaude(topic) {
  const key = process.env.CLAUDE_API_KEY
  if (!key) throw new Error("CLAUDE_API_KEY not set — cannot route write stage to Claude")
  const prompt = WRITER_PROMPT
    .replace("{TOPIC}", topic.topic)
    .replace("{CATEGORY}", topic.category)
    .replace("{BRIEF}", JSON.stringify(topic.brief, null, 2))

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3200,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  const text = data.content?.[0]?.text || ""
  if (!text) throw new Error("Empty Claude response")
  return { draft: extractJson(text), modelUsed: "claude-3-5-sonnet-20241022" }
}

async function updateOne(id, patch) {
  const all = await readTable("orch_topics")
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...patch }
  await writeTable("orch_topics", all)
}

export async function runWrite({ count = 3 } = {}) {
  const wanted = Math.min(Math.max(1, count), 10)
  const all = await readTable("orch_topics")
  const pending = all.filter(t => t.state === "RESEARCHED").slice(0, wanted)

  const nowIso = new Date().toISOString()
  const results = { written: 0, failed: 0, retrying: 0, articles: [], errors: [] }
  const MAX_RETRIES = 5

  for (const topic of pending) {
    try {
      const { draft, modelUsed } = ORCH_WRITER === "claude"
        ? await generateWithClaude(topic)
        : await generateWithGemini(topic)

      if (!draft?.title || !draft?.body) {
        throw new Error("Writer output missing title or body")
      }

      const slug = slugify(draft.title)
      const article = {
        id: `blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slug,
        type: "news",
        category: topic.category,
        authorName: "EvCRM Newsroom",
        title: draft.title,
        excerpt: draft.excerpt || topic.summary || "",
        body: draft.body,
        coverEmoji: draft.coverEmoji || "🚗",
        keyTakeaways: Array.isArray(draft.keyTakeaways) ? draft.keyTakeaways.slice(0, 5) : [],
        pullQuote: draft.pullQuote || "",
        seoKeywords: Array.isArray(draft.seoKeywords) ? draft.seoKeywords.slice(0, 10) : [],
        sourceUrl: topic.sourceUrl,
        citations: topic.brief?.citations || [],
        status: "published",
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: nowIso,
        orchTopicId: topic.id, // trace back to the topic queue row
      }

      const blogPosts = await readTable("blog_posts")
      blogPosts.unshift(article)
      await writeTable("blog_posts", blogPosts)

      // Fire-and-forget IndexNow ping — same pattern as ensureModelArticle
      // in lib/blog.js. Failure here must not roll back the topic state.
      try {
        pingIndexNow([
          `https://evcrm.in/blog/${slug}`,
          "https://evcrm.in/blog",
          "https://evcrm.in/sitemap.xml",
        ])
      } catch { /* ignore */ }

      await updateOne(topic.id, {
        state: "PUBLISHED",
        articleSlug: slug,
        articleId: article.id,
        writtenByModel: modelUsed,
        publishedAt: nowIso,
        retryCount: 0,
        error: null,
      })

      results.written++
      results.articles.push({ id: article.id, slug, title: article.title, url: `https://evcrm.in/blog/${slug}` })
    } catch (e) {
      results.errors.push({ id: topic.id, topic: topic.topic, error: e.message })
      const retryCount = (topic.retryCount || 0) + 1
      const retryable = isRetryableError(e.message)

      if (retryable && retryCount < MAX_RETRIES) {
        // Leave state as RESEARCHED — the brief is still good, just try
        // writing it again next run instead of throwing away the research
        // work already done for a transient capacity error.
        await updateOne(topic.id, { error: e.message, retryCount, lastAttemptAt: nowIso })
        results.retrying++
      } else {
        await updateOne(topic.id, {
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
