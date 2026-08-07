// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./BlogIndexView.js.
import BlogIndexView from "./BlogIndexView"

export const metadata = {
  title: "EV Buyer's Guides & Auto News India",
  description: "Model-by-model EV buyer's guides and Indian auto news — prices, real-world range, variants, and which verified dealers have each model in stock.",
  alternates: { canonical: "https://evcrm.in/blog" },
  openGraph: {
    type: "website",
    title: "EV Buyer's Guides & Auto News India",
    description: "Model-by-model EV buyer's guides and Indian auto news — prices, real-world range, variants, and which verified dealers have each model in stock.",
    url: "https://evcrm.in/blog",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <BlogIndexView />
}
