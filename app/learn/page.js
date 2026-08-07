// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./LearnIndexView.js.
import LearnIndexView from "./LearnIndexView"

export const metadata = {
  title: "Learn: How EVs and Cars Actually Work",
  description: "Plain-English explainers on EV batteries, motors, charging, engines and transmissions — plus buying guides, so you understand what you are paying for.",
  alternates: { canonical: "https://evcrm.in/learn" },
  openGraph: {
    type: "website",
    title: "Learn: How EVs and Cars Actually Work",
    description: "Plain-English explainers on EV batteries, motors, charging, engines and transmissions — plus buying guides, so you understand what you are paying for.",
    url: "https://evcrm.in/learn",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <LearnIndexView />
}
