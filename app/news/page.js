// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./NewsView.js.
import NewsView from "./NewsView"

export const metadata = {
  title: "Latest EV & Auto News in India",
  description: "Daily Indian EV and automobile news — launches, price changes, policy and charging infrastructure, with sources cited.",
  alternates: { canonical: "https://evcrm.in/news" },
  openGraph: {
    type: "website",
    title: "Latest EV & Auto News in India",
    description: "Daily Indian EV and automobile news — launches, price changes, policy and charging infrastructure, with sources cited.",
    url: "https://evcrm.in/news",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <NewsView />
}
