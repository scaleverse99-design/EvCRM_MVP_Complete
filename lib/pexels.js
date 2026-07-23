// Stock-photo lookup for orchestrator news articles. Pexels is free and its
// license permits commercial use with no attribution requirement (we credit
// the photographer anyway, which their guidelines ask for). This is the only
// image source wired into the article pipeline — dealer-uploaded vehicle
// photos aside — so news articles (which have no matched inventory) can carry
// a relevant photo instead of reading as a wall of text.
//
// Entirely optional: with no PEXELS_API_KEY set, fetchArticleImages() returns
// [] and the article renders exactly as it did before (emoji hero + visual
// boxes). Drop the key in env and photos start appearing on the next run —
// no other code change needed.

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search"

// Returns up to `count` landscape photos for a short, photographable query
// (e.g. "EV charging station", not a scheme name). Never throws — any failure
// (no key, rate limit, network) degrades to an empty array so the write stage
// is never blocked by the image step.
export async function fetchArticleImages(query, count = 2) {
  const key = process.env.PEXELS_API_KEY
  if (!key || !query) return []

  try {
    const url = `${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`
    const res = await fetch(url, { headers: { Authorization: key } })
    if (!res.ok) return []
    const data = await res.json()
    const photos = Array.isArray(data.photos) ? data.photos : []
    return photos.map(p => ({
      url: p.src?.large || p.src?.medium || p.src?.original,
      alt: p.alt || query,
      credit: p.photographer || "Pexels",
      creditUrl: p.url || "https://www.pexels.com",
    })).filter(img => img.url)
  } catch {
    return []
  }
}
