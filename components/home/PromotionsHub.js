"use client"
import { useState, useEffect } from "react"
import { C } from "../../lib/constants"
import { Card, Tag, Btn } from "../ui"
import PROMOS from "../../data/promotions.json"

export default function PromotionsHub({ location, openLeadModal }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const filtered = PROMOS.filter(p => !location || p.district === location.district).slice(0, 4)

  if (filtered.length === 0) return null

  const getTimeLeft = (expiry) => {
    const diff = new Date(expiry) - now
    if (diff <= 0) return "Offer Expired"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const mins = Math.floor((diff / (1000 * 60)) % 60)
    const secs = Math.floor((diff / 1000) % 60)
    return `${days}d ${hours}h ${mins}m ${secs}s`
  }

  return (
    <section id="promotions" style={{ padding: "80px 0", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
           <div>
             <h2 style={{ fontSize: 32, fontWeight: 900, color: C.ink, marginBottom: 8 }}>Limited Time Offers.</h2>
             <p style={{ fontSize: 14, color: C.ink3 }}>Exclusive discounts from verified dealerships in {location?.district || "Hyderabad"}.</p>
           </div>
           <Tag label="FLASH DEALS LIVE ⚡" color={C.orange} bg={C.orangeL} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ padding: 24, display: "flex", flexDirection: "column", border: `1.5px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                 <div style={{ width: 40, height: 40, background: C.bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏭</div>
                 <Tag label={p.district.toUpperCase()} color={C.blue} bg={C.blueL} />
              </div>
              <h4 style={{ fontSize: 18, fontWeight: 900, color: C.ink, marginBottom: 4, height: 44, overflow: "hidden" }}>{p.title}</h4>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 20 }}>At {p.dealerName}</p>
              
              <div style={{ 
                background: "#FEF9C3", padding: "10px 14px", borderRadius: 10, border: "1px dashed #EAB308",
                marginBottom: 24, textAlign: "center"
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#854D0E", textTransform: "uppercase", marginBottom: 4 }}>Offer Ends In</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#854D0E", fontFamily: "monospace" }}>{getTimeLeft(p.expiry)}</div>
              </div>

              <Btn 
                onClick={() => openLeadModal("promo", p)}
                style={{ width: "100%", background: C.orange, color: "#fff", fontWeight: 800 }}
              >
                Claim Offer with code: {p.code}
              </Btn>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
