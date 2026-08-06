/**
 * CTE real-time crawl — what runs when the library has nothing.
 *
 * NO LLM. Every step here is deterministic string processing and HTTP:
 * search the source's own catalogue API, fetch the matching dataset,
 * inspect its actual column shape, and extract only when that shape is
 * unambiguous. Same query in, same answer out, no per-call model cost.
 *
 * Why this can work at all: data.gov.in exposes a catalogue search
 * (/lists?filters[title]=...) over 237k+ resources, and every resource is
 * served as structured JSON with a declared field list. So "find the
 * official dataset for this question and read it" is a real API workflow,
 * not scraping. Verified live 2026-08-06: "charging station" returns 100
 * matching datasets, "electric vehicle sales" returns 309.
 *
 * ── The line this module will not cross ───────────────────────────────
 * It never guesses which column holds the number. If a dataset has one
 * unambiguous label column and one unambiguous numeric column, it is
 * parsed. If it has several numeric columns, the dataset is REPORTED
 * (title, link, actual field names) but not parsed — because picking one
 * is how `current_price: 2026` got written into the catalog by the old
 * regex-based sourcing path (commit 787ad49). A referenced official
 * dataset is a useful answer. An invented number is not.
 */

const API_BASE = "https://api.data.gov.in"
const SOURCE_NAME = "data.gov.in (Government of India open data)"

// Bounded so one query can never fan out into dozens of external calls.
const MAX_DATASETS_INSPECTED = 3
const SAMPLE_ROWS = 25

// Dropped from search terms: too common to narrow a catalogue search, and
// including them pulls in unrelated datasets.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "is", "are", "was", "were",
  "how", "many", "much", "what", "which", "who", "when", "where", "why", "does", "do", "did",
  "me", "my", "our", "we", "us", "you", "your", "i", "it", "its", "this", "that", "these", "those",
  "total", "number", "count", "data", "give", "show", "tell", "find", "get", "list", "please",
])

function apiKey() {
  const key = process.env.DATA_GOV_IN_API_KEY
  if (!key) throw new Error("DATA_GOV_IN_API_KEY not set")
  return key
}

/** Deterministic term extraction — no model, no inference. */
export function extractSearchTerms(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EvCRM-CTE/1.0 (+https://evcrm.in)" } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Searches the data.gov.in catalogue for datasets matching the query terms. */
async function searchCatalogue(terms) {
  // The catalogue's title filter matches a phrase, so the most specific
  // multi-word attempt runs first and single terms act as the fallback —
  // deterministic order, not relevance-scored guessing.
  const attempts = []
  if (terms.length >= 2) attempts.push(terms.slice(0, 3).join(" "))
  for (const t of terms.slice(0, 3)) attempts.push(t)

  for (const phrase of attempts) {
    try {
      const url = `${API_BASE}/lists?api-key=${apiKey()}&format=json&limit=${MAX_DATASETS_INSPECTED}&filters[title]=${encodeURIComponent(phrase)}`
      const json = await getJson(url)
      const records = json.records || []
      if (records.length) return { matchedPhrase: phrase, records }
    } catch { /* try the next, narrower attempt */ }
  }
  return { matchedPhrase: null, records: [] }
}

function isSerialField(id) {
  return /^_?s_?l?_{0,2}no_?_?$/i.test(String(id).replace(/_+/g, "_"))
}

function parseNumber(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/,/g, "").trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Classifies a dataset's columns by reading actual sampled values, not by
 * trusting field names. Returns which columns are reliably numeric and
 * which are reliably labels.
 */
export function classifyFields(fields, records) {
  const ids = (fields || []).map(f => f.id).filter(id => id && !isSerialField(id))
  const sample = (records || []).slice(0, SAMPLE_ROWS)
  const numeric = []
  const label = []

  for (const id of ids) {
    const values = sample.map(r => r[id]).filter(v => v !== null && v !== undefined && String(v).trim() !== "")
    if (!values.length) continue
    const allNumeric = values.every(v => parseNumber(v) !== null)
    const noneNumeric = values.every(v => parseNumber(v) === null)
    if (allNumeric) numeric.push(id)
    else if (noneNumeric) label.push(id)
    // Mixed columns are deliberately classified as neither — an
    // inconsistent column is exactly where a bad parse comes from.
  }

  return { numeric, label }
}

/**
 * Real-time answer for a query the library could not serve.
 *
 * Returns { facts, datasetsFound, parsed, unparsed, note } — facts is
 * always grounded in a fetched dataset, and any dataset whose shape was
 * ambiguous is listed under `unparsed` with its real field names so the
 * caller can still cite it.
 */
export async function liveCrawlAnswer(query) {
  const terms = extractSearchTerms(query)
  if (!terms.length) return { facts: [], datasetsFound: 0, parsed: [], unparsed: [], note: "No searchable terms in query" }

  const { matchedPhrase, records } = await searchCatalogue(terms)
  if (!records.length) {
    return { facts: [], datasetsFound: 0, parsed: [], unparsed: [], note: `No data.gov.in dataset matched: ${terms.join(", ")}` }
  }

  const fetchedAt = new Date().toISOString()
  const facts = []
  const parsed = []
  const unparsed = []

  for (const rec of records.slice(0, MAX_DATASETS_INSPECTED)) {
    const resourceId = rec.index_name
    const title = rec.title || resourceId
    if (!resourceId) continue

    try {
      const json = await getJson(`${API_BASE}/resource/${resourceId}?api-key=${apiKey()}&format=json&limit=200`)
      const rows = json.records || []
      if (!rows.length) {
        unparsed.push({ title, resourceId, reason: "dataset returned no rows", url: `https://data.gov.in/resource/${resourceId}` })
        continue
      }

      const { numeric, label } = classifyFields(json.field, rows)

      // The only shape safe to auto-extract: exactly one label column and
      // exactly one numeric column. Anything else is ambiguous, and this
      // module reports rather than guesses.
      if (numeric.length !== 1 || label.length !== 1) {
        unparsed.push({
          title,
          resourceId,
          url: `https://data.gov.in/resource/${resourceId}`,
          reason: `ambiguous shape — ${numeric.length} numeric column(s), ${label.length} label column(s)`,
          numericFields: numeric,
          labelFields: label,
        })
        continue
      }

      const labelField = label[0]
      const valueField = numeric[0]
      let extracted = 0

      for (const row of rows) {
        const geography = String(row[labelField] || "").trim()
        const value = parseNumber(row[valueField])
        if (!geography || value === null) continue

        facts.push({
          metric: valueField,
          value,
          unit: null, // never invented — the dataset does not declare one
          period: title, // the as-of date lives in the title on this portal
          geography,
          scope: title,
          sourceName: SOURCE_NAME,
          sourceUrl: `https://data.gov.in/resource/${resourceId}`,
          sourceDatasetId: resourceId,
          sourceDatasetTitle: title,
          fetchedAt,
        })
        extracted++
      }

      parsed.push({ title, resourceId, url: `https://data.gov.in/resource/${resourceId}`, factsExtracted: extracted, labelField, valueField })
    } catch (e) {
      unparsed.push({ title, resourceId, url: `https://data.gov.in/resource/${resourceId}`, reason: e.message })
    }
  }

  return {
    facts,
    datasetsFound: records.length,
    matchedPhrase,
    parsed,
    unparsed,
    note: facts.length
      ? null
      : "Matching official datasets were found but none had an unambiguously parseable shape — see `unparsed` for the datasets and their real column names.",
  }
}
