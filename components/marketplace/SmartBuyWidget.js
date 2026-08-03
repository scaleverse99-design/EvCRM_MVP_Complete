"use client"
import Link from "next/link"
import { C, fmt } from "../../lib/constants"

export default function SmartBuyWidget({ brand, model, purchaseOptions }) {
  if (!purchaseOptions) return null

  const { hasEvcrmDealerStock, evcrmListings, fallbackRoutes } = purchaseOptions

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.green}40`, borderRadius: 18, padding: 22, margin: "28px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.6 }}>
            🛒 Purchase & Inventory Router
          </span>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: C.ink, margin: "2px 0 0" }}>
            Buy {brand} {model} in India
          </h3>
        </div>
        {hasEvcrmDealerStock && (
          <span style={{ fontSize: 11, fontWeight: 800, color: C.green, background: `${C.green}15`, padding: "4px 10px", borderRadius: 20 }}>
            ✅ Verified Dealer Stock Available
          </span>
        )}
      </div>

      {hasEvcrmDealerStock ? (
        // Render verified EvCRM dealer stock
        <div>
          <p style={{ fontSize: 12.5, color: C.ink3, marginBottom: 12 }}>
            Verified live stock from EvCRM partner dealers near you:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {evcrmListings.map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: C.ink3 }}>🏪 {item.dealerName} ({item.city})</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: "4px 0" }}>{item.variant || model}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.green, marginBottom: 10 }}>{fmt.currency(item.price)}</div>
                <Link href={item.url} style={{ display: "block", textAlign: "center", background: C.green, color: "#fff", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
                  Book Now / Get Quote →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Render fallback New vs Used Marketplace options
        <div>
          <p style={{ fontSize: 12.5, color: C.ink2, marginBottom: 14 }}>
            EvCRM partner stock for this model is uploading soon. In the meantime, select your purchase preference below:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Option A: Buy Brand New */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", marginBottom: 4 }}>🆕 Brand New</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{fallbackRoutes.buyNew.label}</div>
              <div style={{ fontSize: 11, color: C.ink3, marginBottom: 12 }}>Via {fallbackRoutes.buyNew.provider}</div>
              <a href={fallbackRoutes.buyNew.url} target="_blank" rel="noopener noreferrer nofollow" style={{ display: "block", textAlign: "center", background: C.green, color: "#fff", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
                Order Brand New ↗
              </a>
            </div>

            {/* Option B: Buy Verified Pre-Owned */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#3B82F6", textTransform: "uppercase", marginBottom: 4 }}>🚗 Pre-Owned / Used</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{fallbackRoutes.buyUsed.label}</div>
              <div style={{ fontSize: 11, color: C.ink3, marginBottom: 12 }}>Via {fallbackRoutes.buyUsed.provider}</div>
              <a href={fallbackRoutes.buyUsed.url} target="_blank" rel="noopener noreferrer nofollow" style={{ display: "block", textAlign: "center", background: "#3B82F6", color: "#fff", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
                Find Used Listings ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
