// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./RegisterView.js.
import RegisterView from "./RegisterView"

export const metadata = {
  title: "Create Your Dealer Account — Free 30-Day Trial",
  description: "List your vehicles on India's EV marketplace and run your dealership on EvCRM. Free 30-day trial, no card required.",
  alternates: { canonical: "https://evcrm.in/register" },
  openGraph: {
    type: "website",
    title: "Create Your Dealer Account — Free 30-Day Trial",
    description: "List your vehicles on India's EV marketplace and run your dealership on EvCRM. Free 30-day trial, no card required.",
    url: "https://evcrm.in/register",
    siteName: "EvCRM",
  },
}

export default function Page() {
  return <RegisterView />
}
