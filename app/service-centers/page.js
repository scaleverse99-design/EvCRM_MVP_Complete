// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./ServiceCentersView.js.
import ServiceCentersView from "./ServiceCentersView"

export const metadata = {
  title: "EV Service Centers Near You in India",
  description: "Find EV and car service centres near you across India, with location, network and contact details.",
  alternates: { canonical: "https://evcrm.in/service-centers" },
  openGraph: {
    type: "website",
    title: "EV Service Centers Near You in India",
    description: "Find EV and car service centres near you across India, with location, network and contact details.",
    url: "https://evcrm.in/service-centers",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <ServiceCentersView />
}
