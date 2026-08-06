// Server shell. ConfirmView uses useSearchParams(), which Next requires to
// sit inside a Suspense boundary or the production build fails — the same
// lesson as app/dealer/verify-profile/page.js.
//
// noindex: this page only ever renders from a signed, expiring token. There
// is nothing for a crawler to index and no reason for these URLs to appear
// in search results.
import { Suspense } from "react"
import ConfirmView from "./ConfirmView"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Confirm your test drive — EvCRM",
  robots: { index: false, follow: false },
}

export default function ConfirmBookingPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "#6B7280" }}>Loading…</div>}>
      <ConfirmView />
    </Suspense>
  )
}
