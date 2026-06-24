"use client"
import { useState } from "react"
import { C, fmt } from "../../lib/constants"
import { Card, Tag, Btn } from "../ui"
import VEHICLES from "../../data/vehicles.json"

export default function TrendingModels({ location }) {
  const [filter, setFilter] = useState("All")
  const [priceRange, setPriceRange] = useState("All")

  const filtered = VEHICLES.filter(v => {
    const typeMatch = filter === "All" || v.type.includes(filter)
    const priceMatch = 
      priceRange === "All" || 
      (priceRange === "<1L" && v.exShowroom < 100000) ||
      (priceRange === "1-3L" && v.exShowroom >= 100000 && v.exShowroom <= 300000) ||
      (priceRange === ">3L" && v.exShowroom > 300000)
    return typeMatch && priceMatch
  })

  return (
    <section style={{ padding: "80px 0", background: "#F8F9FA" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Trending in {location?.district || "Hyderabad"}.</h2>
            <p style={{ fontSize: 14, color: C.ink3 }}>Top rated electric vehicles based on local sales data and reviews.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["All", "2W", "3W", "4W"].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                style={{ 
                  padding: "6px 16px", borderRadius: 20, 
                  border: `1.5px solid ${filter === f ? C.green : C.border}`, 
                  background: filter === f ? C.greenL : "none", 
                  color: filter === f ? C.greenD : C.ink2,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: 20, 
          overflowX: "auto", 
          paddingBottom: 20,
          msOverflowStyle: "none",
          scrollbarWidth: "none"
        }}>
          {filtered.map(v => (
            <Card key={v.id} noPad style={{ minWidth: 280, width: 280 }}>
              <div style={{ position: "relative", height: 180, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
                {v.image}
                {v.inStock && (
                  <div style={{ position: "absolute", top: 12, right: 12 }}>
                    <Tag label="IN STOCK ✓" color={C.green} bg="#fff" dot />
                  </div>
                )}
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", marginBottom: 4 }}>{v.brand}</div>
                <h4 style={{ fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 4 }}>{v.model}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.greenD }}>{fmt.currency(v.exShowroom)}</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>★ {v.rating}</div>
                </div>
                <Btn style={{ width: "100%", background: C.green, color: "#fff", border: `1.5px solid ${C.green}` }}>
                  View Offers ›
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
