// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./SubsidiesView.js.
import SubsidiesView from "./SubsidiesView"

export const metadata = {
  title: "EV Subsidies & Incentives by State in India",
  description: "State-by-state EV subsidies, road-tax exemptions and registration benefits in India, and what they take off your on-road price.",
  alternates: { canonical: "https://evcrm.in/subsidies" },
  openGraph: {
    type: "website",
    title: "EV Subsidies & Incentives by State in India",
    description: "State-by-state EV subsidies, road-tax exemptions and registration benefits in India, and what they take off your on-road price.",
    url: "https://evcrm.in/subsidies",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <SubsidiesView />
}
