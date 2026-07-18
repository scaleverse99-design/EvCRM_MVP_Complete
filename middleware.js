import { NextResponse } from "next/server"

export function middleware(request) {
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
