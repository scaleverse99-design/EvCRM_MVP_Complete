import { NextResponse } from "next/server"
import { detectSearchBot } from "./lib/cte/aiCrawlers"

// Best-effort, fire-and-forget. Never let logging affect the response a
// real visitor or a real crawler gets — a failed log write must be
// invisible to everyone but us. event.waitUntil lets this finish after the
// response is already sent, without holding the request open for it.
function logSearchBotHit(request, event, botName) {
  try {
    const url = new URL("/api/telemetry/bot-hit", request.url)
    const promise = fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared secret, same pattern as the admin orchestrator proxy —
        // this endpoint is reachable by anyone, but only middleware (which
        // knows the server-only secret) should be able to write to it.
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
      },
      body: JSON.stringify({ bot: botName, path: request.nextUrl.pathname }),
    }).catch(() => {}) // never let a network hiccup here surface anywhere
    event?.waitUntil?.(promise)
  } catch {
    // logging must never be able to break a real request
  }
}

export function middleware(request, event) {
  const host = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // Don't process API routes, static files, or internal routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Layer 3 of the intent-capture discussion: we can't see what a user
  // asked an AI, or what query the AI sent to its own search index — but
  // when that AI's search feature decides to fetch one of OUR pages, that
  // request carries an identifiable name. This is the only point in the
  // whole pipeline where that's true, so it has to be caught here.
  const bot = detectSearchBot(request.headers.get("user-agent"))
  if (bot) logSearchBotHit(request, event, bot)

  // Extract domain without port
  const domain = host.split(":")[0].toLowerCase()

  // Main/known domains that should NEVER be treated as dealer storefronts.
  // This includes the bare domain, Firebase domains, Cloud Run domains,
  // and localhost. Anything not explicitly a *.evcrm.in subdomain with a
  // dealer slug should pass through to the normal app.
  const isMainDomain =
    domain === "evcrm.in" ||
    domain === "www.evcrm.in" ||
    domain === "localhost" ||
    domain.endsWith(".web.app") ||
    domain.endsWith(".firebaseapp.com") ||
    domain.endsWith(".run.app") ||
    domain.endsWith(".cloudfunctions.net") ||
    domain === ""

  // A subdomain is specifically "{slug}.evcrm.in" — e.g. ramdealers.evcrm.in
  const isSubdomain = domain.endsWith(".evcrm.in") && domain !== "evcrm.in" && domain !== "www.evcrm.in"

  // A custom domain is ONLY when we're sure it's not any known infrastructure domain.
  // Must have at least one dot (valid domain), must not be any known host.
  const isCustomDomain = !isMainDomain && !isSubdomain && domain.includes(".")

  if ((isSubdomain || isCustomDomain) && !pathname.startsWith("/dealer-storefront")) {
    return NextResponse.rewrite(new URL("/dealer-storefront", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
