"use client"
import SellCarForm from "./SellCarForm"

// Modal chrome around SellCarForm — used on a dealer's storefront (button
// only shown when that dealer has opted in via sellCarEnabled). For the
// dealer-shared WhatsApp link (offline/walk-in customers), see the
// standalone page at app/[dealerSlug]/sell/page.js instead.
export default function SellCarModal({ dealership, dealerName, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
        <SellCarForm dealership={dealership} dealerName={dealerName} onClose={onClose} />
      </div>
    </div>
  )
}
