import SellCarPageClient from "../../../components/marketplace/SellCarPageClient"

// evcrm.in/{slug}/sell — a Used Car Dealer's own shareable "Sell Your Car"
// link, meant to be sent directly to offline customers (WhatsApp, phone,
// walk-in) rather than discovered publicly. See components/marketplace/
// SellCarPageClient.js for why this is independent of the storefront's
// sellCarEnabled toggle.
export default function SellCarPage({ params }) {
  return <SellCarPageClient dealerSlug={params.dealerSlug} />
}
