/**
 * Source adapter: YouTube — real buyer intent from comments and autocomplete.
 *
 * NO LLM. Deterministic HTTP + string matching throughout, same as every
 * other CTE source adapter.
 *
 * ── What this is and is not ──────────────────────────────────────────
 * YouTube does NOT expose what users searched. No API does, at any price.
 * What is available, and what this module uses:
 *
 *   1. Autocomplete (NO API KEY) — aggregated phrasings people type into
 *      YouTube's search box. Same public endpoint intentEngine.js already
 *      uses for Google, with ds=yt.
 *   2. Comments (API key) — literal questions in buyers' own words.
 *   3. View counts (API key) — what people actually watched, which is a
 *      stronger demand signal than a search because it required effort.
 *
 * ── Design forced by real data, measured 2026-08-06 ──────────────────
 * The first working assumption ("car review comments are dense with
 * buying intent") did not survive contact with the API:
 *
 *   MotorOctane "India's Best SUV?" (general)  -> 0 of 20 real questions
 *   "Creta E Base Model Review" (purchase)     -> 2 of  5 real questions
 *
 * So: general/entertainment videos are almost pure noise, and specific
 * variant/price/comparison videos carry the signal. Density is low either
 * way, which means this only works across MANY targeted videos, never one.
 *
 * The richest comment in that sample was Hinglish — "Seltos base me kya
 * offers hain, seltos mein space zyada lagta hai creta se". An
 * English-only filter would have dropped it. Hindi/Hinglish keywords are
 * therefore first-class here, not an afterthought.
 */

const YT_API = "https://www.googleapis.com/youtube/v3"
const SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
const UA = "Mozilla/5.0 (compatible; EvCRM-CTE/1.0; +https://evcrm.in)"

// Quota: 10,000 units/day free. search.list = 100 units, commentThreads =
// 1 unit. Bounded so a run can never silently eat the day's quota.
const MAX_SEARCHES = 8          // 800 units
const MAX_VIDEOS_PER_SEARCH = 5
const COMMENTS_PER_VIDEO = 50   // 1 unit each

// Buying-intent markers. Hinglish included deliberately — see header note.
const INTENT_PATTERNS = [
  // price / cost
  /\bprice\b/i, /\bcost\b/i, /\bon.?road\b/i, /\bex.?showroom\b/i,
  /\bkitna\b/i, /\bkitne\b/i, /\bkimat\b/i, /\bdaam\b/i,
  // purchase mechanics
  /\bemi\b/i, /\bdown ?payment\b/i, /\bfinance\b/i, /\bloan\b/i,
  /\bbooking\b/i, /\bwaiting\b/i, /\bdelivery\b/i, /\bdiscount\b/i, /\boffers?\b/i,
  // comparison
  /\bvs\b/i, /\bversus\b/i, /\bcompare\b/i, /\bbetter\b/i, /\bacha\b/i, /\bbehtar\b/i,
  // ownership concerns
  /\bmileage\b/i, /\bservice cost\b/i, /\bmaintenance\b/i, /\bresale\b/i,
  /\brange\b/i, /\bcharging\b/i, /\bbattery\b/i,
  // explicit asking
  /\bkya\b/i, /\bkaun/i, /\bkaise\b/i, /\bworth it\b/i, /\bshould i\b/i,
]

// Comments that are questions/intent-shaped but too short to carry meaning
// ("op", "nice", "👍"). Length floor plus a noise list.
const MIN_COMMENT_LENGTH = 12
const NOISE = /^(nice|good|super|op|wow|thanks?|first|dream car|👍|❤|😊)+[\s!.❤😊👍]*$/i

function apiKey() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error("YOUTUBE_API_KEY not set")
  return key
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`)
  }
  return json
}

/**
 * YouTube search autocomplete. No API key, no quota cost.
 * Returns the phrasings people actually type into YouTube search.
 */
export async function fetchYouTubeAutocomplete(seed, country = "in", lang = "en") {
  if (!seed) return []
  try {
    const params = new URLSearchParams({ client: "firefox", ds: "yt", q: seed, gl: country, hl: lang })
    const res = await fetch(`${SUGGEST_URL}?${params}`, { headers: { "User-Agent": UA } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.[1]) ? data[1].map(String) : []
  } catch {
    return []
  }
}

/** Classifies intent deterministically — same rule engine shape as intentEngine.js. */
export function classifyIntent(text) {
  if (/\b(price|cost|on.?road|ex.?showroom|emi|down ?payment|finance|loan|kitna|kitne|kimat|daam|discount|offers?)\b/i.test(text)) return "TRANSACTIONAL"
  if (/\b(vs|versus|compare|better|acha|behtar)\b/i.test(text)) return "COMPARATIVE"
  if (/\b(mileage|range|charging|battery|maintenance|service cost|resale|kaise|how)\b/i.test(text)) return "INFORMATIONAL"
  if (/\b(booking|waiting|delivery)\b/i.test(text)) return "PURCHASE_STAGE"
  return "GENERAL"
}

function isIntentComment(text) {
  const t = String(text || "").trim()
  if (t.length < MIN_COMMENT_LENGTH) return false
  if (NOISE.test(t)) return false
  // A question mark alone is not enough — "nice video?" is noise. Require a
  // real intent marker, which is what keeps this from filling up with praise.
  return INTENT_PATTERNS.some(p => p.test(t))
}

async function searchVideos(query) {
  const url = `${YT_API}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&regionCode=IN&relevanceLanguage=en&maxResults=${MAX_VIDEOS_PER_SEARCH}&order=relevance&key=${apiKey()}`
  const json = await getJson(url)
  return (json.items || []).map(i => ({
    videoId: i.id?.videoId,
    title: i.snippet?.title || "",
    channel: i.snippet?.channelTitle || "",
    publishedAt: i.snippet?.publishedAt,
  })).filter(v => v.videoId)
}

async function fetchComments(videoId) {
  const url = `${YT_API}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${COMMENTS_PER_VIDEO}&order=relevance&key=${apiKey()}`
  const json = await getJson(url)
  return (json.items || []).map(it => {
    const s = it.snippet?.topLevelComment?.snippet || {}
    return { text: String(s.textOriginal || "").replace(/\s+/g, " ").trim(), likes: s.likeCount || 0, publishedAt: s.publishedAt }
  })
}

/**
 * Harvests buying-intent comments across several targeted searches.
 *
 * `seedQueries` should be PURCHASE-shaped ("creta 2026 on road price",
 * "creta base model review"), not general ("best SUV") — measured density
 * differs by roughly an order of magnitude between the two.
 */
export async function harvestYouTubeIntent(seedQueries = []) {
  const queries = seedQueries.slice(0, MAX_SEARCHES)
  const signals = []
  const errors = []
  const videosScanned = []
  let commentsScanned = 0
  const fetchedAt = new Date().toISOString()

  for (const q of queries) {
    let videos = []
    try {
      videos = await searchVideos(q)
    } catch (e) {
      errors.push({ query: q, stage: "search", error: e.message })
      continue
    }

    for (const v of videos) {
      try {
        const comments = await fetchComments(v.videoId)
        commentsScanned += comments.length
        const kept = comments.filter(c => isIntentComment(c.text))

        for (const c of kept) {
          signals.push({
            text: c.text,
            intent: classifyIntent(c.text),
            likes: c.likes,
            seedQuery: q,
            videoId: v.videoId,
            videoTitle: v.title,
            channel: v.channel,
            sourceUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            commentedAt: c.publishedAt,
            fetchedAt,
          })
        }

        videosScanned.push({ videoId: v.videoId, title: v.title, comments: comments.length, intentComments: kept.length })
      } catch (e) {
        // Comments disabled on a video is normal and expected, not a failure
        // worth surfacing loudly — record it and move on.
        errors.push({ videoId: v.videoId, stage: "comments", error: e.message })
      }
    }
  }

  const byIntent = signals.reduce((acc, s) => { acc[s.intent] = (acc[s.intent] || 0) + 1; return acc }, {})

  return {
    signals,
    byIntent,
    videosScanned,
    commentsScanned,
    intentCommentsFound: signals.length,
    signalRate: commentsScanned ? Number((signals.length / commentsScanned).toFixed(3)) : 0,
    errors: errors.length ? errors : undefined,
  }
}
