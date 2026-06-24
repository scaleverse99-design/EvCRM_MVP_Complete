"use client"
import Link from "next/link"
import { C } from "../../lib/constants"
import { Card, Tag, Btn } from "../ui"
import DEALERS from "../../data/dealers.json"

export default function LocalDealers({ location, openLeadModal }) {
  const filtered = DEALERS.filter(d => 
    d.state === location?.state && d.district === location?.district
  ).slice(0, 6)

  const emptyState = filtered.length === 0

  return (
    <section id="dealers" style={{ padding: "80px 0", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
           <div>
             <h2 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Verified Dealers in {location?.district || "Hyderabad"}.</h2>
             <p style={{ fontSize: 14, color: C.ink3 }}>Top rated dealerships on our network with certified inventory.</p>
           </div>
           <Link href="/marketplace" style={{ fontSize: 14, fontWeight: 800, color: C.green, textDecoration: "none" }}>View All ➔</Link>
        </div>

        {emptyState ? (
          <Card style={{ padding: 60, textAlign: "center", background: C.bg }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🏪</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No dealers found in {location?.district}.</h3>
            <p style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>Be the first to list your dealership and reach consumers in this district.</p>
            <Btn style={{ margin: "0 auto" }}>Register as Dealer</Btn>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
            {filtered.map(d => (
              <Card key={d.id} style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 900, color: C.ink }}>{d.name}</h4>
                      <Tag label="VERIFIED ✓" color={C.green} bg={C.greenL} />
                    </div>
                    <p style={{ fontSize: 12, color: C.ink3, lineHeight: 1.5 }}>📍 {d.address}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {d.brands.map(b => (
                    <span key={b} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      {b}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 16, borderTop: `1px dashed ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
                   <div>
                     <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Response Time</div>
                     <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{d.responseTime}</div>
                   </div>
                   <div style={{ width: 1, background: C.border }} />
                   <div>
                     <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3, textTransform: "uppercase" }}>Live Inventory</div>
                     <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{d.inventoryCount} Vehicles</div>
                   </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                   <Btn style={{ flex: 1, background: C.green, fontSize: 11 }} onClick={() => openLeadModal("talk", d)}>Talk to Dealer</Btn>
                   <Btn variant="secondary" style={{ flex: 1, fontSize: 11 }}>View Inventory</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
