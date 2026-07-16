"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { C } from "../../lib/constants"
import { Btn } from "../ui"
import DISTRICTS from "../../data/districts.json"
import SearchAssistant from "./SearchAssistant"

export default function TopBar({ location, setLocation }) {
  const router = useRouter()
  const [isSticky, setIsSticky] = useState(false)
  const [showLocPicker, setShowLocPicker] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [search, setSearch] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const selectDistrict = (state, dist) => {
    const loc = { state, district: dist, source: "manual" }
    setLocation(loc)
    setShowLocPicker(false)
    if (typeof window !== "undefined") {
      localStorage.setItem("evcrm_user_location", JSON.stringify(loc))
    }
  }

  const detectMyLoc = async () => {
    setIsDetecting(true)
    const { detectLocation } = await import("../../lib/location")
    const loc = await detectLocation()
    setLocation(loc)
    setIsDetecting(false)
    setShowLocPicker(false)
  }

  const QUICK_CITIES = [
    { state: "Delhi", district: "Delhi", icon: "🇮🇳" },
    { state: "Maharashtra", district: "Mumbai", icon: "🌊" },
    { state: "Karnataka", district: "Bangalore", icon: "🌳" },
    { state: "Telangana", district: "Hyderabad", icon: "🏰" },
  ]

  return (
    <>
      <style>{`
        .topbar-search-area { display: flex; align-items: center; gap: 12px; flex: 1; max-width: 450px; margin: 0 40px; }
        .topbar-nav { display: flex; align-items: center; gap: 28px; }
        .topbar-nav-links { display: flex; gap: 24px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .topbar-nav-actions { display: flex; align-items: center; gap: 20px; }
        .topbar-nav-sep { width: 1px; height: 20px; background: ${C.border}; margin: 0 4px; }
        .topbar-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 6px; font-size: 22px; color: ${C.ink}; }
        .topbar-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .topbar-search-area { display: none !important; }
          .topbar-nav { display: none !important; }
          .topbar-hamburger { display: flex !important; align-items: center; justify-content: center; }
          .topbar-mobile-menu {
            display: flex; flex-direction: column; gap: 0;
            background: #fff; border-top: 1px solid ${C.border};
            padding: 0; position: absolute; top: 100%; left: 0; right: 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            z-index: 999; animation: mobileMenuIn 0.2s ease;
          }
          @keyframes mobileMenuIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        }
      `}</style>
      <header style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: isSticky ? "rgba(255, 255, 255, 0.98)" : "#fff",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: isSticky ? "10px 0" : "12px 0",
        transition: "all 0.3s ease",
        color: C.ink
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 8, 
              background: C.green, 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 16, fontWeight: 900, color: "#fff",
              boxShadow: `0 4px 12px ${C.green}33`
            }}>E</div>
            <span style={{ fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: "-0.8px" }}>
              EV<span style={{ color: C.green }}>.CRM</span>
            </span>
          </Link>

          <div className="topbar-search-area">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) router.push(`/search?q=${encodeURIComponent(search)}`);
              }}
              style={{ position: "relative", flex: 1 }}
            >
               <input 
                 type="text" 
                 placeholder="Search Marketplace, News or Subsidies..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 style={{ 
                   width: "100%", padding: "10px 18px", paddingRight: 40,
                   borderRadius: 12, border: `1.5px solid ${C.border}`, 
                   fontSize: 13, outline: "none", 
                   background: "#f3f4f6", color: C.ink,
                   transition: "border-color 0.2s"
                 }}
                 onFocus={(e) => e.target.style.borderColor = C.green}
                 onBlur={(e) => e.target.style.borderColor = C.border}
               />
               <button type="submit" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background:"none", border:"none", cursor:"pointer", opacity: 0.4, fontSize: 14 }}>🔍</button>
            </form>
            
            <button 
              onClick={() => setShowLocPicker(true)}
              style={{ 
                display: "flex", alignItems: "center", gap: 8, 
                background: "#f3f4f6", border: "none", 
                padding: "8px 14px", borderRadius: 12, cursor: "pointer", color: C.ink
              }}
            >
               <span style={{ fontSize: 13, opacity: 0.6 }}>📍</span>
               <span style={{ fontSize: 12, fontWeight: 700 }}>{location?.district || "India"}</span>
            </button>
          </div>

          <nav className="topbar-nav">
            <div className="topbar-nav-links">
              <Link href="/showroom" style={{ textDecoration: "none", color: "inherit", opacity: 0.8 }}>Buy Vehicles</Link>
              <Link href="/charging" style={{ textDecoration: "none", color: "inherit", opacity: 0.6 }}>Charge Stations</Link>
            </div>

            <div className="topbar-nav-sep"></div>

            <div className="topbar-nav-actions">
              <Link href="/shortlisted" style={{ textDecoration: "none", color: C.ink, fontSize: 18, position: "relative" }}>
                ♡
              </Link>
              
              <button 
                onClick={() => router.push("/login")}
                style={{ 
                  background: C.green, color: "#fff", 
                  border: "none", padding: "8px 18px", borderRadius: 10, 
                  fontSize: 11, fontWeight: 900, cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
              >
                EXPERT PORTAL
              </button>
            </div>
          </nav>

          {/* Hamburger button for mobile */}
          <button className="topbar-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="topbar-mobile-menu">
            <div style={{ padding: "12px 20px" }}>
              <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) { router.push(`/search?q=${encodeURIComponent(search)}`); setMobileMenuOpen(false); } }} style={{ position: "relative" }}>
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 16px", paddingRight: 40, borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", background: "#f3f4f6", color: C.ink, boxSizing: "border-box" }} />
                <button type="submit" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.4, fontSize: 14 }}>🔍</button>
              </form>
            </div>
            <Link href="/showroom" onClick={() => setMobileMenuOpen(false)} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, textDecoration: "none", color: C.ink, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>🚗 Buy Vehicles</Link>
            <Link href="/charging" onClick={() => setMobileMenuOpen(false)} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, textDecoration: "none", color: C.ink, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>⚡ Charge Stations</Link>
            <Link href="/shortlisted" onClick={() => setMobileMenuOpen(false)} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, textDecoration: "none", color: C.ink, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>♡ Shortlisted</Link>
            <button onClick={() => { setShowLocPicker(true); setMobileMenuOpen(false); }} style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: "none", border: "none", textAlign: "left", color: C.ink, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%", fontFamily: "inherit" }}>📍 {location?.district || "Set Location"}</button>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => { router.push("/login"); setMobileMenuOpen(false); }} style={{ width: "100%", background: C.green, color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>EXPERT PORTAL</button>
            </div>
          </div>
        )}
      </header>

      {showLocPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowLocPicker(false)}>
          <div style={{ background: "#fff", borderRadius: 32, padding: 40, width: 550, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.5px" }}>Set Location</h2>
              <button 
                onClick={detectMyLoc}
                disabled={isDetecting}
                style={{ 
                  display: "flex", alignItems: "center", gap: 10, 
                  background: isDetecting ? "#f3f4f6" : C.green, 
                  color: isDetecting ? C.ink : "#fff",
                  border: "none", padding: "10px 20px", borderRadius: 12, 
                  fontSize: 13, fontWeight: 800, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <span>{isDetecting ? "⌛" : "🎯"}</span>
                {isDetecting ? "Detecting..." : "Use Current Location"}
              </button>
            </div>

            <div style={{ marginBottom: 32 }}>
               <div style={{ fontSize: 11, fontWeight: 900, color: C.ink3, textTransform: "uppercase", marginBottom: 16 }}>Popular Cities</div>
               <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {QUICK_CITIES.map(q => (
                    <button 
                      key={q.district}
                      onClick={() => selectDistrict(q.state, q.district)}
                      style={{ 
                        padding: "10px 20px", borderRadius: 14, border: `1.5px solid ${C.border}`,
                        background: location?.district === q.district ? "#ecfdf5" : "none",
                        borderColor: location?.district === q.district ? C.green : C.border,
                        fontSize: 13, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      {q.icon} {q.district}
                    </button>
                  ))}
               </div>
            </div>

            <div style={{ position: "relative", marginBottom: 32 }}>
              <input 
                autoFocus
                type="text" 
                placeholder="Search city or district..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "14px 20px", borderRadius: 16, border: `2px solid ${C.border}`, fontSize: 15, outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => e.target.style.borderColor = C.green}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
              <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}>🔍</span>
            </div>

            {Object.entries(DISTRICTS).map(([state, districts]) => {
              const ALIASES = { "vizag": "visakhapatnam", "blr": "bangalore", "mumbai": "bombay", "hyd": "hyderabad", "benga": "bangalore" }
              const searchTerm = search.toLowerCase()
              const aliasMatch = Object.entries(ALIASES).find(([alias, real]) => alias.includes(searchTerm) || searchTerm.includes(alias))?.[1]

              const filtered = districts.filter(d => 
                d.toLowerCase().includes(searchTerm) || 
                (aliasMatch && d.toLowerCase().includes(aliasMatch))
              )

              if (filtered.length === 0) return null
              return (
                <div key={state} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: C.ink3, textTransform: "uppercase", marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>{state}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {filtered.map(d => (
                      <button 
                        key={d} 
                        onClick={() => selectDistrict(state, d)}
                        style={{ padding: "8px 16px", borderRadius: 12, border: `1px solid ${location?.district === d ? C.green : C.border}`, background: location?.district === d ? "#ecfdf5" : "none", color: location?.district === d ? "#059669" : C.ink, fontSize: 13, fontWeight: location?.district === d ? 800 : 500, cursor: "pointer" }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <SearchAssistant />
    </>
  )
}
