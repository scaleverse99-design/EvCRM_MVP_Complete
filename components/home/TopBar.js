"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { C } from "../../lib/constants"
import { Btn } from "../ui"
import DISTRICTS from "../../data/districts.json"

export default function TopBar({ location, setLocation }) {
  const router = useRouter()
  const [isSticky, setIsSticky] = useState(false)
  const [showLocPicker, setShowLocPicker] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [search, setSearch] = useState("")

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
      <header style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: isSticky ? "rgba(255, 255, 255, 0.98)" : "#fff",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: isSticky ? "10px 0" : "16px 0",
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 450, margin: "0 40px" }}>
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

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", gap: 24, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Link href="/showroom" style={{ textDecoration: "none", color: "inherit", opacity: 0.8 }}>Buy Vehicles</Link>
              <Link href="/news" style={{ textDecoration: "none", color: "inherit", opacity: 0.6 }}>Regional News</Link>
              <Link href="/subsidies" style={{ textDecoration: "none", color: "inherit", opacity: 0.6 }}>Subsidies</Link>
              <Link href="/charging" style={{ textDecoration: "none", color: "inherit", opacity: 0.6 }}>Charge Stations</Link>
            </div>

            <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }}></div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
        </div>
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
    </>
  )
}
