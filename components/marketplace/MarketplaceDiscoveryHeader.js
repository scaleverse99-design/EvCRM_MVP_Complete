"use client"
import { useState } from "react"
import { C } from "../../lib/constants"

const CATEGORIES = [
  { id: "all", label: "All Vehicles", icon: "🌐" },
  { id: "2W", label: "Personal 2W", icon: "🛵" },
  { id: "3W", label: "Shared 3W", icon: "🛺" },
  { id: "4W", label: "Premium 4W", icon: "🚗" },
  { id: "COMM", label: "Logistics", icon: "🚛" }
]

export default function MarketplaceDiscoveryHeader({ onFilterChange, currentCategory }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "20px 0", position: "sticky", top: 72, zIndex: 900 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", gap: 30, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        
        {CATEGORIES.map(cat => (
          <div 
            key={cat.id} 
            onClick={() => onFilterChange(cat.id)}
            style={{ 
              display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", 
              borderRadius: 30, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              background: currentCategory === cat.id ? "#10b98110" : "none",
              border: `1.5px solid ${currentCategory === cat.id ? "#10b981" : "#eee"}`,
              whiteSpace: "nowrap"
            }}
          >
            <span style={{ fontSize: 20 }}>{cat.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: currentCategory === cat.id ? "#10b981" : "#666" }}>
              {cat.label}
            </span>
          </div>
        ))}

        <div style={{ marginLeft: "auto", height: 30, width: 1, background: "#eee" }} />
        
        {/* Sort Trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
           <span style={{ fontSize: 13, fontWeight: 700, color: "#999" }}>SORT BY:</span>
           <span style={{ fontSize: 13, fontWeight: 900, color: "#000" }}>RECOMMENDED ▾</span>
        </div>
      </div>
    </div>
  )
}
