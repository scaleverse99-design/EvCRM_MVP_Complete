"use client"
import { useState, useEffect } from "react"
import { C } from "../../lib/constants"
import { detectLocation } from "../../lib/location"
import { Btn } from "../../components/ui"
import MarketplaceDiscoveryHeader from "../../components/marketplace/MarketplaceDiscoveryHeader"
import VehicleCardMarketplace from "../../components/marketplace/VehicleCardMarketplace"
import VEHICLES from "../../data/vehicles.json"
import Link from "next/link"

export default function CommercePage() {
  const [location, setLocation] = useState(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const loc = await detectLocation()
      setLocation(loc)
      setLoading(false)
    }
    init()
  }, [])

  // 1. Universal Search & Filter Logic
  const filteredVehicles = VEHICLES.filter(v => {
    const categoryMatch = activeCategory === "all" || v.type.includes(activeCategory)
    const searchMatch = searchQuery === "" || 
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.model.toLowerCase().includes(searchQuery.toLowerCase())
    return categoryMatch && searchMatch
  })

  if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#10b981", background: "#000" }}>LOADING UNIVERSE...</div>

  return (
    <div style={{ background: "#F9FAFB", minHeight: "100vh" }}>
      
      {/* 1. IMMERSIVE DISCOVERY HEADER */}
      <header style={{ 
        position: "sticky", top: 0, zIndex: 1000, background: "#fff", 
        borderBottom: "1px solid #eee", padding: "16px 0" 
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30 }}>
           <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#111", letterSpacing: "-1px" }}>Commerce<span style={{ color: "#10b981" }}> Hub</span></span>
           </Link>

           <div style={{ flex: 1, maxWidth: 800, position: "relative" }}>
              <input 
                type="text" 
                placeholder="Search for..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: "100%", padding: "14px 24px", borderRadius: 16, background: "#f3f4f6", 
                  border: "none", outline: "none", fontSize: 15, fontWeight: 600,
                  transition: "all 0.3s"
                }}
              />
              <span style={{ position: "absolute", right: 24, top: 15, opacity: 0.3 }}>🔍</span>
           </div>

           <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: "#f3f4f6", padding: "10px 16px", borderRadius: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{location?.district}</span>
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 900 }}>NETWORK ACTIVE ⬤</span>
           </div>
        </div>
      </header>

      {/* 2. CATEGORY TAPE */}
      <MarketplaceDiscoveryHeader onFilterChange={setActiveCategory} currentCategory={activeCategory} />

      {/* 3. DISCOVERY GRID */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "40px" }}>
           
           {/* Context Status */}
           <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-1px" }}>
                   Browsing {activeCategory === "all" ? "the Universal" : activeCategory} Inventory.
                </h1>
                <p style={{ color: "#666", fontSize: 14 }}>Real-time availability across {location?.country} through decentralized hubs.</p>
              </div>
              <div style={{ background: "#000", color: "#fff", padding: "8px 20px", borderRadius: 30, fontSize: 12, fontWeight: 900 }}>
                 {filteredVehicles.length} NODES DISCOVERED
              </div>
           </div>

           {/* Immersive Grid */}
           <div style={{ 
             display: "grid", 
             gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
             gap: 32 
           }}>
              {filteredVehicles.map(v => (
                <VehicleCardMarketplace key={v.id} vehicle={v} />
              ))}
           </div>

           {/* Empty Discovery */}
           {filteredVehicles.length === 0 && (
             <div style={{ padding: "120px 0", textAlign: "center" }}>
                <div style={{ fontSize: 80, marginBottom: 20 }}>🌌</div>
                <h2 style={{ fontSize: 24, fontWeight: 900 }}>Universal Search Found Nothing</h2>
                <p style={{ color: "#666" }}>Adjust your discovery filters or try a broader term.</p>
                <div 
                  onClick={() => { setActiveCategory("all"); setSearchQuery("") }}
                  style={{ marginTop: 32, cursor: "pointer", color: "#10b981", fontWeight: 900, textDecoration: "underline" }}
                >RESET ALL NODES</div>
             </div>
           )}

      </main>

      {/* Footer Utility */}
      <footer style={{ padding: "60px 40px", borderTop: "1px solid #eee", textAlign: "center" }}>
          <p style={{ color: "#999", fontSize: 12 }}>Powered by Opsmanager v5.0 Atomic Sync. $0/Transaction logic active.</p>
      </footer>

    </div>
  )
}
