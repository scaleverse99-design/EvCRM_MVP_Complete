// Nearby-dealer sourcing via Google Places, for the cold-start problem:
// EvCRM has almost no partner dealers yet, so find_dealers returns nothing
// and the tool is dead weight. Sourcing real nearby dealerships makes the
// answer useful immediately AND builds the outreach list to onboard them.
//
// Three rules this module exists to enforce:
//
// 1. NEVER FABRICATE. If no API key is configured, or the call fails, this
//    returns []. It does not fall back to invented listings, and it does not
//    return the 990 seeded dealer rows that used to sit in `users` (deleted
//    2026-08-01). Sending a real buyer to a dealership that does not exist
//    is worse than answering "none found".
//
// 2. NEVER IMPLY PARTNERSHIP. These are real businesses that never agreed to
//    be listed on EvCRM. Every result carries onEvCRM:false and the caller
//    attaches an explicit disclaimer. Blurring that line is what would cost
//    us credibility with both buyers and the dealers we want to onboard.
//
// 3. NEVER LET IT BE A BILL. /api/mcp is public and unauthenticated (a
//    deliberate design decision — see the header of app/api/mcp/route.js).
//    Without limits, anyone could run up Places charges by sending random
//    city names, since every unique city misses the cache by definition.
//    Two independent guards below: a per-city cache with a long TTL, and a
//    hard daily cap on live fetches.
import { getSupabaseAdmin } from "../supabaseAdmin"

// Dealership listings change on the order of months, so a long TTL is both
// safe and the main cost control — a city is paid for once per fortnight
// however many times it is asked about.
const CITY_CACHE_TTL_DAYS = Number(process.env.PLACES_CACHE_TTL_DAYS || 14)
const DAILY_FETCH_CAP = Number(process.env.PLACES_DAILY_FETCH_CAP || 25)
const MAX_RESULTS = 6

const BUSINESS_TYPES = {
  used_car: "used car dealership",
  ev: "electric vehicle dealership",
  two_wheeler: "two wheeler showroom",
  general: "car dealership",
}

export function isPlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY)
}

// "vijayawada" + "used_car" -> stable key, so the same city asked twelve
// different ways still costs one fetch.
const buildSourceQuery = (city, type) =>
  `${String(city).toLowerCase().trim()}|${type}`

/** Map a free-text query to one of our known business types. */
export function classifyDealerQuery(text = "") {
  const q = String(text).toLowerCase()
  if (/\bused\b|second hand|pre.?owned|resale/.test(q)) return "used_car"
  if (/\bev\b|electric/.test(q)) return "ev"
  if (/scooter|bike|two.?wheeler|2w/.test(q)) return "two_wheeler"
  return "general"
}

async function readCachedCity(sb, sourceQuery) {
  const cutoff = new Date(Date.now() - CITY_CACHE_TTL_DAYS * 86400_000).toISOString()
  const { data, error } = await sb
    .from("dealer_outreach")
    .select("*")
    .eq("source_query", sourceQuery)
    .gte("last_sourced_at", cutoff)
    .order("rating_count", { ascending: false, nullsFirst: false })
    .limit(MAX_RESULTS)
  if (error) return null
  return data?.length ? data : null
}

async function underDailyCap(sb) {
  const since = new Date(Date.now() - 86400_000).toISOString()
  const { data, error } = await sb
    .from("dealer_outreach")
    .select("source_query")
    .gte("first_sourced_at", since)
  if (error) return false // fail closed: an unreadable cap is not permission to spend
  return new Set((data || []).map(r => r.source_query)).size < DAILY_FETCH_CAP
}

async function fetchFromPlaces(city, type) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
      // Field mask is required, and it is also what we are billed on — ask
      // only for fields we actually store.
      "X-Goog-FieldMask": [
        "places.id", "places.displayName", "places.formattedAddress",
        "places.nationalPhoneNumber", "places.websiteUri",
        "places.googleMapsUri", "places.rating", "places.userRatingCount",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: `${BUSINESS_TYPES[type] || BUSINESS_TYPES.general} in ${city}, India`,
      maxResultCount: MAX_RESULTS,
      regionCode: "IN",
    }),
  })

  if (!res.ok) {
    console.error(`[places] searchText failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return []
  }
  const json = await res.json()
  return (json.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || null,
    formatted_address: p.formattedAddress || null,
    phone: p.nationalPhoneNumber || null,
    website: p.websiteUri || null,
    maps_url: p.googleMapsUri || null,
    rating: p.rating ?? null,
    rating_count: p.userRatingCount ?? null,
  })).filter(p => p.place_id && p.name)
}

async function persist(sb, rows, city, type, sourceQuery) {
  const nowIso = new Date().toISOString()

  // Bump times_surfaced on anything we've seen before — that counter is the
  // demand signal that decides which dealers are worth calling first.
  const { data: existing } = await sb
    .from("dealer_outreach")
    .select("place_id,times_surfaced")
    .in("place_id", rows.map(r => r.place_id))
  const seen = new Map((existing || []).map(r => [r.place_id, r.times_surfaced || 1]))

  const payload = rows.map(r => ({
    ...r,
    city,
    business_type: type,
    source_query: sourceQuery,
    times_surfaced: (seen.get(r.place_id) || 0) + 1,
    last_sourced_at: nowIso,
  }))

  const { error } = await sb.from("dealer_outreach").upsert(payload, { onConflict: "place_id" })
  if (error) console.error("[places] outreach upsert failed:", error.message)
}

/**
 * Real dealerships near `city`. Returns [] rather than anything invented if
 * Places isn't configured, the cap is hit, or the call fails.
 *
 * Callers MUST label these as non-partners — see rule 2 above.
 */
export async function findNearbyDealers(city, type = "general") {
  if (!city) return []
  const sb = getSupabaseAdmin()
  if (!sb) return []

  const sourceQuery = buildSourceQuery(city, type)

  const cached = await readCachedCity(sb, sourceQuery)
  if (cached) return cached

  if (!isPlacesConfigured()) {
    console.warn("[places] GOOGLE_PLACES_API_KEY not set — returning no nearby dealers rather than inventing any")
    return []
  }
  if (!(await underDailyCap(sb))) {
    console.warn(`[places] daily fetch cap (${DAILY_FETCH_CAP} cities) reached — serving nothing rather than spending`)
    return []
  }

  const rows = await fetchFromPlaces(city, type)
  if (!rows.length) return []

  await persist(sb, rows, city, type, sourceQuery)
  return rows
}

/** Shape for the MCP response — explicit about what these are and aren't. */
export const nearbyDealerSummary = (d) => ({
  name: d.name,
  address: d.formatted_address || undefined,
  phone: d.phone || undefined,
  rating: d.rating ?? undefined,
  ratingCount: d.rating_count ?? undefined,
  mapsUrl: d.maps_url || undefined,
  onEvCRM: false,
})
