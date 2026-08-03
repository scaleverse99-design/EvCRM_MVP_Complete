/**
 * 🔍 Google Autocomplete + People Also Ask (PAA) + AnswerThePublic Intent Engine
 * Provides real-time search intent data directly from Google for EvCRM & CTE Engine.
 */

const GOOGLE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search"

/**
 * Fetches Google Autocomplete suggestions for a query in India (gl=in).
 * Free, fast, and captures exact user search phrasing.
 */
export async function fetchGoogleAutocomplete(query, country = "in", lang = "en") {
  if (!query || typeof query !== "string") return []

  try {
    const params = new URLSearchParams({
      client: "chrome",
      q: query.trim(),
      gl: country,
      hl: lang
    })
    const res = await fetch(`${GOOGLE_SUGGEST_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!res.ok) return []
    const data = await res.json()
    // Data format: [query, [suggestion1, suggestion2, ...], ...]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].map(s => String(s).trim())
    }
  } catch (err) {
    console.warn("[IntentEngine] Autocomplete fetch error:", err.message)
  }
  return []
}

/**
 * Generates an AnswerThePublic / AlsoAsked question tree using seed modifiers.
 * Expands keywords across Questions, Comparisons, Costs, and Intent modifiers.
 */
export async function fetchIntentQuestionTree(seedKeyword) {
  if (!seedKeyword) return { seed: "", categories: {}, rawSuggestions: [] }

  const seed = seedKeyword.trim()
  const modifiers = {
    questions: ["how", "what", "why", "where", "which", "is", "can"],
    comparisons: ["vs", "or", "compared to", "better than"],
    cost: ["price", "cost", "charging cost", "subsidy", "emi", "on road price"],
    problems: ["issues", "problems", "range test", "battery life", "maintenance"]
  }

  const results = {
    seed,
    timestamp: new Date().toISOString(),
    categories: {
      questions: [],
      comparisons: [],
      cost: [],
      problems: []
    },
    rawSuggestions: []
  }

  const allSuggestions = new Set()

  // 1. Direct seed lookup
  const direct = await fetchGoogleAutocomplete(seed)
  direct.forEach(s => allSuggestions.add(s))

  // 2. Modifier lookups in parallel
  const fetchPromises = []

  for (const [category, mods] of Object.entries(modifiers)) {
    for (const mod of mods) {
      const q1 = `${seed} ${mod}`
      const q2 = `${mod} ${seed}`
      
      fetchPromises.push(
        fetchGoogleAutocomplete(q1).then(items => {
          items.forEach(item => {
            allSuggestions.add(item)
            if (!results.categories[category].includes(item)) {
              results.categories[category].push(item)
            }
          })
        })
      )
      fetchPromises.push(
        fetchGoogleAutocomplete(q2).then(items => {
          items.forEach(item => {
            allSuggestions.add(item)
            if (!results.categories[category].includes(item)) {
              results.categories[category].push(item)
            }
          })
        })
      )
    }
  }

  await Promise.all(fetchPromises)
  results.rawSuggestions = Array.from(allSuggestions)

  return results
}

/**
 * Synthesizes "People Also Ask" (PAA) questions from autocomplete signals
 * and organizes them into high-value topics for content discovery.
 */
export async function fetchPeopleAlsoAsk(topicQuery) {
  const tree = await fetchIntentQuestionTree(topicQuery)
  
  const paaQuestions = tree.rawSuggestions.filter(q => 
    /^(how|what|why|where|is|can|which|should|does|are)\b/i.test(q) || q.includes("?")
  )

  const searchVolumeSignals = tree.rawSuggestions.map(q => ({
    query: q,
    intentType: /price|cost|emi|subsidy/i.test(q) ? "TRANSACTIONAL" :
               /vs|comparison|better/i.test(q) ? "COMPARATIVE" :
               /how|why|what|guide/i.test(q) ? "INFORMATIONAL" : "NAVIGATIONAL"
  }))

  return {
    topic: topicQuery,
    peopleAlsoAsk: paaQuestions.slice(0, 15),
    searchIntentBreakdown: searchVolumeSignals.slice(0, 25),
    totalQueriesDiscovered: tree.rawSuggestions.length
  }
}
