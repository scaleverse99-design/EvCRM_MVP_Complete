// Every top-level app route segment. A dealer's free storefront lives at
// evcrm.in/{dealerSubdomain} (see app/[dealerSlug]/page.js), so this list
// is the single source of truth for "is this path segment a real app page,
// or could it be a dealer's slug?" — used in two places that must never
// drift apart:
//   1. app/api/register/route.js — refuses to ever assign a dealer a slug
//      that collides with a real page (it'd be permanently unreachable).
//   2. lib/AuthContext.js — decides whether an unrecognized single-segment
//      path should be treated as public (a storefront, no login required)
//      instead of bouncing a logged-out visitor to /login.
export const RESERVED_SLUGS = new Set([
  "admin", "api", "assign", "attendance", "best-ev", "blog", "booking", "buildprice",
  "charging", "command", "commerce", "connect", "dealer", "dealer-storefront",
  "leads", "learn", "login", "market-research", "marketplace", "mygarage", "news",
  "oem", "profile", "pulse", "queue", "quote", "quotepro", "register",
  "search", "service-centers", "showroom", "starter-kit", "subsidies",
  "team", "vehicles", "favicon.ico", "robots.txt", "sitemap.xml",
])
