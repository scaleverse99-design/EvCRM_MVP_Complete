// SERVER wrapper — exists so this route can own its <title>.
//
// A client component cannot export metadata, so this page shipped the
// layout's generic "EV.CRM — India's Premier EV Sales OS". A site audit on
// 2026-08-07 found 48 pages sharing that one title; Google treats
// identically-titled pages as duplicates and ranks at most one of them.
//
// The interactive page is unchanged in ./LoginView.js.
import LoginView from "./LoginView"

export const metadata = {
  title: "Sign In",
  description: "Sign in to your EvCRM dealer, sales rep, OEM or admin account.",
  robots: { index: false, follow: true },
}

export default function Page() {
  return <LoginView />
}
