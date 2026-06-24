"use client"
import { useState } from "react"
import { C, fmt } from "../../lib/constants"

export default function VehicleCardMarketplace({ vehicle }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: "relative", background: "#fff", borderRadius: 24, overflow: "hidden", 
        transition: "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)", cursor: "pointer",
        border: "1px solid #f0f0f0",
        transform: isHovered ? "scale(1.02) translateY(-10px)" : "none",
        boxShadow: isHovered ? "0 30px 60px rgba(0,0,0,0.12)" : "0 4px 12px rgba(0,0,0,0.03)"
      }}
    >
      {/* 1. Immersive Visual Area */}
      <div style={{ position: "relative", height: 280, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>
        <div style={{ transition: "all 0.5s", transform: isHovered ? "scale(1.1)" : "none" }}>{vehicle.image}</div>

        {/* Floating Price Tag */}
        <div style={{ 
          position: "absolute", top: 20, right: 20, 
          padding: "10px 16px", borderRadius: 12, background: "rgba(0,0,0,0.85)", 
          backdropFilter: "blur(10px)", color: "#fff", zIndex: 10,
          boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
        }}>
           <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt.currency(vehicle.exShowroom)}</div>
           <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 800, textAlign: "right" }}>EMI ₹{vehicle.emi.toLocaleString()}*</div>
        </div>

        {/* Vertical Glass Spec Pillar */}
        <div style={{ 
          position: "absolute", left: 20, bottom: 20, top: 20, width: 44,
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", 
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
          transition: "all 0.5s", opacity: isHovered ? 1 : 0.8, transform: isHovered ? "translateX(0)" : "translateX(-10px)"
        }}>
           <div title="Kilometers" style={{ textAlign: "center" }}>
             <div style={{ fontSize: 10, fontWeight: 900 }}>{vehicle.km / 1000}k</div>
             <div style={{ fontSize: 7, opacity: 0.5 }}>KM</div>
           </div>
           <div style={{ height: 1, width: 20, background: "#0001" }} />
           <div title="Year" style={{ textAlign: "center" }}>
             <div style={{ fontSize: 10, fontWeight: 900 }}>'{vehicle.year.toString().slice(-2)}</div>
             <div style={{ fontSize: 7, opacity: 0.5 }}>YR</div>
           </div>
           <div style={{ height: 1, width: 20, background: "#0001" }} />
           <div title="Type" style={{ textAlign: "center" }}>
             <div style={{ fontSize: 10, fontWeight: 900 }}>{vehicle.type}</div>
             <div style={{ fontSize: 7, opacity: 0.5 }}>TYPE</div>
           </div>
        </div>

        {/* Status Glow Indicator */}
        <div style={{ position: "absolute", bottom: 20, right: 20, display: "flex", alignItems: "center", gap: 8 }}>
           <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
           <span style={{ fontSize: 9, fontWeight: 800, color: "#666" }}>VIRTUAL HUB {vehicle.hub.toUpperCase()}</span>
        </div>
      </div>

      {/* 2. Minmalist Details Area */}
      <div style={{ padding: "24px 30px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: 4 }}>{vehicle.brand}</div>
        <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12, color: "#000" }}>{vehicle.model}</h3>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 12, color: i <= Math.round(vehicle.rating) ? "#FFC107" : "#eee" }}>★</span>)}
           </div>
           <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>VIEW ANALYTICS ➔</div>
        </div>
      </div>
    </div>
  )
}
