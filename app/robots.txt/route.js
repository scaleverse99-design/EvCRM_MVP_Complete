// ── app/robots.txt/route.js ──────────────────────────────────────────
// Served as a plain route handler, NOT the app/robots.js metadata route:
// the Firebase webframeworks adapter doesn't emit statically-prerendered
// metadata routes into the hosting upload, so the metadata version 404'd
// in production (Next 14.2 also ignores `dynamic = "force-dynamic"` on
// metadata routes, so it couldn't be forced onto the function that way).
// Route handlers are served correctly — the IndexNow key file
// (app/<key>.txt/route.js) proved that in prod.
//
// History note: a static public/robots.txt used to shadow everything and
// contained "Disallow: /vehicles", blocking Google from every vehicle
// listing page. /vehicles and dealer storefront slugs MUST stay crawlable
// — they're the whole point of the SEO hub model.
//
// force-dynamic (NOT force-static): even as a route handler, a
// statically-prerendered /robots.txt 404'd on the deployed Cloud Run
// function — "robots.txt" is a reserved metadata filename and its
// prerender-manifest entry doesn't resolve there. Serving it dynamically
// per-request bypasses the manifest entirely — the same mechanism that
// makes /sitemap.xml work in production.
export const dynamic = "force-dynamic"

const BODY = `User-Agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /dealer
Disallow: /login
Disallow: /leads
Disallow: /queue
Disallow: /connect
Disallow: /assign
Disallow: /attendance
Disallow: /team
Disallow: /profile
Disallow: /buildprice
Disallow: /quotepro
Disallow: /command
Disallow: /market-research
Disallow: /booking

Sitemap: https://evcrm.in/sitemap.xml
`

export async function GET() {
  return new Response(BODY, { headers: { "Content-Type": "text/plain" } })
}
