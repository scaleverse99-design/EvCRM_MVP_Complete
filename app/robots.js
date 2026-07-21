// NOTE: a static public/robots.txt used to shadow this file entirely — and
// it contained "Disallow: /vehicles", which blocked Google from crawling
// every vehicle listing page. Deleted 2026-07-19; this route is now the
// single source of truth. /vehicles and dealer storefront slugs MUST stay
// crawlable — they're the whole point of the SEO hub model.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin", "/api", "/dealer", "/login",
          "/leads", "/queue", "/connect", "/assign", "/attendance",
          "/team", "/profile", "/buildprice", "/quotepro", "/command",
          "/market-research", "/booking",
        ],
      },
    ],
    sitemap: "https://evcrm.in/sitemap.xml",
  }
}
