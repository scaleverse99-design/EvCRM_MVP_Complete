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

  // Check if this is a custom domain/subdomain request
  // Subdomains: *.evcrm.in (but not evcrm.in itself)
  // Custom domains: any domain that's not evcrm.in
  const isSubdomain = domain.endsWith(".evcrm.in") && domain !== "evcrm.in"
  const isCustomDomain = !domain.endsWith(".evcrm.in") && domain !== "localhost"

  if ((isSubdomain || isCustomDomain) && !pathname.startsWith("/dealer-storefront")) {
    // Rewrite to dealer storefront (preserves URL)
    return NextResponse.rewrite(new URL("/dealer-storefront", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
