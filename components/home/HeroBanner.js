"use client"
import { useState, useEffect } from "react"
import { C } from "../../lib/constants"
import { Btn } from "../ui"

const HERO_ITEMS = [
  {
    id: 1,
    type: "news",
    title: "India's EV Revolution is Here.",
    sub: "New state-level subsidies now active for 2-wheelers and 4-wheelers. Save up to ₹1.5L today.",
    image: "/images/hero_ev_news.png",
    cta: "Calculate Savings",
    link: "#tools"
  },
  {
    id: 2,
    type: "offer",
    title: "Exclusive Local Dealer Offers.",
    sub: "Get an additional ₹5,000 exchange bonus at verified dealers in your district this month.",
    image: "/images/hero_dealer_offer.png",
    cta: "View Offers",
    link: "#promotions"
  },
  {
    id: 3,
    type: "infra",
    title: "50+ New Fast Chargers Liquidated.",
    sub: "Charging infrastructure in your city just got better. Find Level 3 chargers near you instantly.",
    image: "/images/hero_charging_infra.png",
    cta: "View Map",
    link: "#map"
  }
]

export default function HeroBanner({ location }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % HERO_ITEMS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section style={{ position: "relative", height: 500, overflow: "hidden", background: "#000" }}>
      {HERO_ITEMS.map((item, i) => (
        <div key={item.id} style={{
          position: "absolute", inset: 0,
          opacity: active === i ? 1 : 0,
          transition: "opacity 0.8s ease-in-out",
          display: "flex", alignItems: "center"
        }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.4) 100%), url(${item.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }} />
          
          <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "0 40px", width: "100%", zIndex: 10 }}>
            <div style={{ 
              display: "inline-block", 
              background: C.greenL, 
              padding: "4px 12px", 
              borderRadius: 20, 
              color: C.green, 
              fontSize: 10, 
              fontWeight: 900, 
              letterSpacing: 1, 
              marginBottom: 16,
              border: `1px solid ${C.green}30`
            }}>
              SHOWING FOR {location?.district?.toUpperCase() || "HYDERABAD"}
            </div>
            
            <h1 style={{ fontSize: 48, fontWeight: 900, color: C.ink, marginBottom: 16, maxWidth: 600, lineHeight: 1.1 }}>
              {item.title}
            </h1>
            <p style={{ fontSize: 18, color: C.ink3, marginBottom: 32, maxWidth: 500 }}>
              {item.sub}
            </p>
            
            <Btn style={{ padding: "16px 40px", fontSize: 16, background: C.green, color: "#fff", fontWeight: 800 }}>
              {item.cta} ›
            </Btn>
          </div>
        </div>
      ))}

      {/* Indicators */}
      <div style={{ position: "absolute", bottom: 40, left: 40, display: "flex", gap: 8, zIndex: 20 }}>
        {HERO_ITEMS.map((_, i) => (
          <div 
            key={i} 
            onClick={() => setActive(i)}
            style={{ 
              width: active === i ? 40 : 8, 
              height: 8, 
              borderRadius: 4, 
              background: active === i ? C.green : C.border, 
              cursor: "pointer",
              transition: "all 0.3s ease"
            }} 
          />
        ))}
      </div>
    </section>
  )
}
