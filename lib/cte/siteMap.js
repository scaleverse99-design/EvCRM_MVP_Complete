/**
 * SITE RADAR — Indian Automobile Site Whitelist
 *
 * REGISTRY ONLY. No content is stored here.
 * The AI Browser reads this to know which sites it is
 * allowed to crawl. Pages are fetched → Markdown in memory
 * → answer extracted → Markdown discarded.
 * Only the clean extracted answer is ever stored.
 *
 * Tiers:
 *   TIER.OEM    — Manufacturer official sites (ground truth)
 *   TIER.PORTAL — Major aggregator portals (verified pricing)
 *   TIER.MEDIA  — Trusted auto media (reviews, news, launch prices)
 */

export const TIER = { OEM: 1, PORTAL: 2, MEDIA: 3 }

export const SITE_RADAR = [
  // ── TIER 1: OEM OFFICIAL SITES ─────────────────────────────────────────
  { domain: "tatamotors.com",         brand: "tata",         tier: TIER.OEM,    searchUrl: "https://www.tatamotors.com/search/?q={query}" },
  { domain: "mgmotor.co.in",          brand: "mg",           tier: TIER.OEM,    searchUrl: "https://www.mgmotor.co.in/search?q={query}" },
  { domain: "hyundai.com",            brand: "hyundai",      tier: TIER.OEM,    searchUrl: "https://www.hyundai.com/in/en/search.html?q={query}" },
  { domain: "kia.com",                brand: "kia",          tier: TIER.OEM,    searchUrl: "https://www.kia.com/in/home.html#search={query}" },
  { domain: "mahindra.com",           brand: "mahindra",     tier: TIER.OEM,    searchUrl: "https://auto.mahindra.com/search?q={query}" },
  { domain: "marutisuzuki.com",       brand: "maruti",       tier: TIER.OEM,    searchUrl: "https://www.marutisuzuki.com/cars/search?q={query}" },
  { domain: "renaultindia.com",       brand: "renault",      tier: TIER.OEM,    searchUrl: "https://www.renaultindia.com/search?q={query}" },
  { domain: "toyotabharat.com",       brand: "toyota",       tier: TIER.OEM,    searchUrl: "https://www.toyotabharat.com/search/?q={query}" },
  { domain: "hondacarindia.com",      brand: "honda",        tier: TIER.OEM,    searchUrl: "https://www.hondacarindia.com/search?q={query}" },
  { domain: "vw.co.in",               brand: "volkswagen",   tier: TIER.OEM,    searchUrl: "https://www.vw.co.in/en/search.html?q={query}" },
  { domain: "skoda-auto.co.in",       brand: "skoda",        tier: TIER.OEM,    searchUrl: "https://www.skoda-auto.co.in/en/search?q={query}" },
  { domain: "jeepindia.com",          brand: "jeep",         tier: TIER.OEM,    searchUrl: "https://www.jeepindia.com/search?q={query}" },
  { domain: "bmwindia.com",           brand: "bmw",          tier: TIER.OEM,    searchUrl: "https://www.bmwindia.com/en/search.html?q={query}" },
  { domain: "atherspace.in",          brand: "ather",        tier: TIER.OEM,    searchUrl: "https://www.atherspace.in/search?q={query}" },
  { domain: "olaelectric.com",        brand: "ola",          tier: TIER.OEM,    searchUrl: "https://www.olaelectric.com/search?q={query}" },
  { domain: "heroelectric.in",        brand: "hero electric",tier: TIER.OEM,    searchUrl: "https://www.heroelectric.in/search?q={query}" },
  { domain: "revolt.co.in",           brand: "revolt",       tier: TIER.OEM,    searchUrl: "https://www.revolt.co.in/search?q={query}" },
  { domain: "bajajchetak.com",        brand: "chetak",       tier: TIER.OEM,    searchUrl: "https://www.bajajchetak.com/en/search.html?q={query}" },
  { domain: "ampereev.com",           brand: "ampere",       tier: TIER.OEM,    searchUrl: "https://www.ampereev.com/search?q={query}" },
  { domain: "nisbike.com",            brand: "nis",          tier: TIER.OEM,    searchUrl: "https://www.nisbike.com/search?q={query}" },

  // ── TIER 2: MAJOR AUTO PORTALS ─────────────────────────────────────────
  { domain: "carwale.com",    tier: TIER.PORTAL, searchUrl: "https://www.carwale.com/search/?q={query}" },
  { domain: "cardekho.com",   tier: TIER.PORTAL, searchUrl: "https://www.cardekho.com/searchCar.htm?q={query}" },
  { domain: "zigwheels.com",  tier: TIER.PORTAL, searchUrl: "https://www.zigwheels.com/search?q={query}" },
  { domain: "91wheels.com",   tier: TIER.PORTAL, searchUrl: "https://www.91wheels.com/search?q={query}" },
  { domain: "bikewale.com",   tier: TIER.PORTAL, searchUrl: "https://www.bikewale.com/search/?q={query}" },
  { domain: "gaadi.com",      tier: TIER.PORTAL, searchUrl: "https://www.gaadi.com/search?q={query}" },
  { domain: "cars24.com",     tier: TIER.PORTAL, searchUrl: "https://www.cars24.com/buy-used-cars/?q={query}" },
  { domain: "spinny.com",     tier: TIER.PORTAL, searchUrl: "https://www.spinny.com/buy-used-cars/?q={query}" },
  { domain: "droom.in",       tier: TIER.PORTAL, searchUrl: "https://droom.in/search?q={query}" },
  { domain: "acko.com",       tier: TIER.PORTAL, searchUrl: "https://www.acko.com/search?q={query}" },

  // ── TIER 3: TRUSTED AUTO MEDIA ─────────────────────────────────────────
  { domain: "team-bhp.com",          tier: TIER.MEDIA, searchUrl: "https://www.team-bhp.com/forum/search?query={query}" },
  { domain: "autocarindia.com",      tier: TIER.MEDIA, searchUrl: "https://www.autocarindia.com/search?q={query}" },
  { domain: "rushlane.com",          tier: TIER.MEDIA, searchUrl: "https://www.rushlane.com/?s={query}" },
  { domain: "motorbeam.com",         tier: TIER.MEDIA, searchUrl: "https://www.motorbeam.com/?s={query}" },
  { domain: "overdrive.in",          tier: TIER.MEDIA, searchUrl: "https://www.overdrive.in/search/?q={query}" },
  { domain: "drivespark.com",        tier: TIER.MEDIA, searchUrl: "https://www.drivespark.com/search/?q={query}" },
  { domain: "cartoq.com",            tier: TIER.MEDIA, searchUrl: "https://www.cartoq.com/search/?q={query}" },
  { domain: "v3cars.com",            tier: TIER.MEDIA, searchUrl: "https://www.v3cars.com/search?q={query}" },
  { domain: "indianautosblog.com",   tier: TIER.MEDIA, searchUrl: "https://www.indianautosblog.com/?s={query}" },
  { domain: "autoportal.com",        tier: TIER.MEDIA, searchUrl: "https://www.autoportal.com/search?q={query}" },
  { domain: "autox.com",             tier: TIER.MEDIA, searchUrl: "https://www.autox.com/search?q={query}" },
  { domain: "bikedekho.com",         tier: TIER.MEDIA, searchUrl: "https://www.bikedekho.com/search/?q={query}" },
]

/** Returns sites ordered by trust tier, brand-specific site first. */
export function getSitesForQuery(query, maxSites = 8) {
  const q = String(query || "").toLowerCase()
  const brand = SITE_RADAR.find(s => s.brand && q.includes(s.brand))
  const rest = SITE_RADAR.filter(s => s !== brand).sort((a, b) => a.tier - b.tier)
  return [...(brand ? [brand] : []), ...rest].slice(0, maxSites)
}

/** Builds the crawl URL for a given site and query. */
export function buildCrawlUrl(site, query) {
  return site.searchUrl.replace("{query}", encodeURIComponent(query))
}

/** Returns true if a domain is in the whitelist. */
export function isAllowedDomain(domain) {
  const clean = String(domain || "").replace(/^www\./, "")
  return SITE_RADAR.some(s => s.domain.replace(/^www\./, "") === clean)
}
