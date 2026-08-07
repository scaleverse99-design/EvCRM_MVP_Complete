// The consumer marketplace IS the homepage — rendered directly at evcrm.in
// so the URL stays clean (no visible /showroom redirect).
//
// This was a client component, which meant the vehicle grid was fetched in
// useEffect and the served HTML contained ZERO <img> tags — nothing for the
// largest element to paint until the bundle loaded and the API answered.
// PageSpeed on 2026-08-07: Performance 44 mobile / 36 desktop, CLS 0.282 /
// 0.327. Desktop scoring BELOW mobile was the tell — it renders a wider
// grid, so more post-JS work.
//
// Now a server component that loads the list and hands it to ShowroomClient
// as props. "use client" never opted out of SSR; fetching its own data did.
import { getMarketplaceVehicles } from "../lib/marketplaceVehicles"
import ShowroomClient from "./showroom/ShowroomClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Buy Electric Cars, EVs & Two-Wheelers from Verified Dealers in India",
  description:
    "Browse live inventory from verified Indian dealers — electric cars, EVs and two-wheelers with real prices, range and specs. Compare on-road prices by city and book a free test drive.",
  alternates: { canonical: "https://evcrm.in" },
  openGraph: {
    type: "website",
    title: "Buy Electric Cars, EVs & Two-Wheelers from Verified Dealers in India",
    description: "Live dealer inventory, transparent on-road pricing, free test drives.",
    url: "https://evcrm.in",
    siteName: "EvCRM",
  },
}

export default async function HomePage() {
  // Degrades to the previous client-fetch behaviour if this throws — an
  // empty grid that fills in beats a 500 on the homepage.
  const initial = await getMarketplaceVehicles().catch(() => null)
  return (
    <ShowroomClient
      initialVehicles={initial?.vehicles || null}
      initialFilters={initial?.filters || null}
    />
  )
}
