"use client"
import { useState } from "react"
import { C } from "../../lib/constants"

export default function MarketplaceSidebar({ onFilterChange }) {
  const [price, setPrice] = useState(7000000)
  const [searchBrand, setSearchBrand] = useState("")
  const [selectedBrands, setSelectedBrands] = useState([])

  const BRANDS = ["Tata Motors", "Ola Electric", "Ather Energy", "Mahindra", "MG", "Hyundai", "Kia", "TVS", "Bajaj"]
  const filteredBrands = BRANDS.filter(b => b.toLowerCase().includes(searchBrand.toLowerCase()))

  const toggleBrand = (brand) => {
    const newBrands = selectedBrands.includes(brand) 
      ? selectedBrands.filter(b => b !== brand) 
      : [...selectedBrands, brand]
    setSelectedBrands(newBrands)
    onFilterChange({ brands: newBrands, price })
  }

  const handlePriceChange = (v) => {
    setPrice(v)
    onFilterChange({ brands: selectedBrands, price: v })
  }

  const labelStyle = { fontSize: 13, fontWeight: 900, color: "#2d2d2d", marginBottom: 16, display: "block" }

  return (
    <aside style={{ 
      width: 300, background: "#fff", borderRight: "1px solid #eee", 
      padding: 30, height: "calc(100vh - 120px)", position: "sticky", top: 120,
      overflowY: "auto"
    }}>
      
      {/* 1. Price Range */}
      <div style={{ marginBottom: 40 }}>
        <label style={labelStyle}>Price Range</label>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#4B0082" }}>₹ 50,000</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#4B0082" }}>₹ {price.toLocaleString()}</span>
        </div>
        <input 
          type="range" min="50000" max="7000000" step="10000"
          value={price}
          onChange={(e) => handlePriceChange(parseInt(e.target.value))}
          style={{ 
            width: "100%", accentColor: "#4B0082", cursor: "pointer",
            height: 4, borderRadius: 2
          }} 
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginTop: 8 }}>
          <span>Minimum</span>
          <span>Maximum</span>
        </div>
      </div>

      {/* 2. Brands + Models */}
      <div style={{ marginBottom: 40 }}>
        <label style={labelStyle}>Brands + Models</label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input 
            type="text" 
            placeholder="Search brand..." 
            value={searchBrand}
            onChange={(e) => setSearchBrand(e.target.value)}
            style={{ 
              width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
              outline: "none", fontSize: 13
            }}
          />
          <span style={{ position: "absolute", right: 12, top: 10, opacity: 0.3 }}>🔍</span>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 250, overflowY: "auto", paddingRight: 10 }}>
          {filteredBrands.map(brand => (
            <div 
              key={brand} 
              onClick={() => toggleBrand(brand)}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{ 
                width: 18, height: 18, borderRadius: 4, 
                border: `1.5px solid ${selectedBrands.includes(brand) ? "#4B0082" : "#ddd"}`,
                background: selectedBrands.includes(brand) ? "#4B0082" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11
              }}>
                {selectedBrands.includes(brand) && "✓"}
              </div>
              <span style={{ fontSize: 14, color: selectedBrands.includes(brand) ? "#000" : "#666", fontWeight: selectedBrands.includes(brand) ? 700 : 500 }}>{brand}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Distance / Hubs */}
      <div>
        <label style={labelStyle}>Hub Distance</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["< 5km", "< 10km", "Citywide"].map(d => (
            <div key={d} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid #eee", fontSize: 11, fontWeight: 700, color: "#666", cursor: "pointer" }}>{d}</div>
          ))}
        </div>
      </div>

    </aside>
  )
}
