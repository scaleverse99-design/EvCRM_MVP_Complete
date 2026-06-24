"use client"
import { useState, useEffect } from "react"
import { getLiveFeed, getVehicles, getPulseStories } from "../lib/data"
import TopBar from "../components/home/TopBar"
import Footer from "../components/home/Footer"
import { C } from "../lib/constants"
import NextDynamic from "next/dynamic"

// ── DESIGN TOKENS (The 'Stitch' Aesthetic) ────────────────────────
const T = {
  bg:      "#f8fafc", // White Slate
  card:    "#ffffff",
  border:  "#e2e8f0",
  ink:     "#0f172a", // Deep Slate
  ink2:    "#475569", // Muted
  ink3:    "#94a3b8",
  accent:  "#10b981", // Emerald
  highlight: "#f97316", // Orange
  glass:   "rgba(255, 255, 255, 0.7)",
}

// ── UI HELPERS ──────────────────────────────────────────────────────
const SignalPill = ({ label, color=T.accent }) => (
  <span style={{ 
    fontSize:9, fontWeight:900, background:`${color}15`, color:color, 
    padding:"3px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:0.5 
  }}>{label}</span>
)

// Dynamic imports for calculators (interactive elements)
const CalcWrapper = NextDynamic(() => import("../components/home/HomeToolsWrapper"), { ssr: false })

export default function HomePage() {
  const [news, setNews] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  const ADVICE = [
    "The 2026 subsidy cuts are real. If you're buying a 2W, do it before June.",
    "Battery health is the only metric that matters in the resale market.",
    "Indian manufacturers are now out-innovating global giants in the budget segment.",
    "FAME-III is expected to prioritize commercial fleets over private cars.",
    "Don't buy an EV based on top speed. Focus on real-world range vs claimed."
  ]
  const [quote, setQuote] = useState(ADVICE[0])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/pulse')
        const data = await res.json()
        if (data.success && data.news.length > 0) {
          setNews(data.news)
        } else {
          setNews(getPulseStories()) // Fallback
        }
      } catch (e) {
        setNews(getPulseStories())
      } finally {
        setFeatured(getVehicles().slice(0, 3))
        setQuote(ADVICE[Math.floor(Math.random() * ADVICE.length)])
        setLoading(false)
      }
    }
    load()
  }, [])

  const megaStory = news[0]
  const signalGrid = news.slice(1, 7)
  const sidebarSignals = news.slice(7, 10)

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: T.ink }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .news-ticker-container:hover .news-ticker-content { animation-play-state: paused; }
        .signal-card:hover { transform: translateY(-4px); }
      ` }} />
      
      <TopBar />

      {news.length > 0 && (
        <div className="news-ticker-container" style={{ background: T.ink, color: "#fff", height: 38, display: "flex", alignItems: "center", overflow: "hidden", position: "relative", zIndex: 10 }}>
          <div style={{ background: T.accent, color: "#fff", fontSize: 11, fontWeight: 900, height: "100%", display: "flex", alignItems: "center", padding: "0 20px", flexShrink: 0, zIndex: 2, letterSpacing: 1 }}>
            JUST IN
          </div>
          <div className="news-ticker-content" style={{ 
            whiteSpace: "nowrap", display: "inline-block", paddingLeft: "100%", 
            animation: "ticker 45s linear infinite", fontSize: 12, fontWeight: 700 
          }}>
            {news.map(n => (
              <span key={n.id} style={{ marginRight: 80 }}>
                <span style={{ color: T.accent }}>✦</span> {(n.title || n.msg || "UPDATE").toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 24px 80px" }}>
        
        {/* ── FLAGSHIP NEWS HUB (FULL WIDTH) ── */}
        <section style={{ marginBottom: 80 }}>
            {/* MEGA STORY FOCUS */}
            {megaStory && (
              <a href={`/pulse/${megaStory.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ 
                  position: "relative", background: "#000", height: 600, borderRadius: 32, 
                  overflow: "hidden", marginBottom: 40, boxShadow: "0 40px 100px -20px rgba(0,0,0,0.3)" 
                }}>
                  <img src={megaStory.featured_image_url} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} alt="Mega Story" />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15, 23, 42, 1) 0%, rgba(15, 23, 42, 0.4) 40%, transparent 100%)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, padding: 60, width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                      <span style={{ background: T.accent, color: "#fff", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Strategic Focus</span>
                      <SignalPill label={megaStory.state || 'National'} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: 60, lineHeight: 1, fontWeight: 900, color: "#fff", margin: 0, maxWidth: 1000, letterSpacing: "-2px" }}>
                      {megaStory.title}
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 20, marginTop: 28, maxWidth: 800, lineHeight: 1.6 }}>
                      {megaStory.summary.slice(0, 250)}...
                    </p>
                    <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.2)" }} />
                      <span style={{ color: T.accent, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>EDITORIAL ANALYSIS BY EV.OS</span>
                    </div>
                  </div>
                </div>
              </a>
            )}

          {/* SECONDARY SIGNAL GRID (EXPANDED TO 3 COLS) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {signalGrid.map(item => (
              <a key={item.id} href={`/pulse/${item.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="signal-card" style={{ 
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 28, 
                  overflow: "hidden", transition: "all 0.3s ease", boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
                }}>
                  <div style={{ height: 220, background: "#f1f5f9" }}>
                    <img src={item.featured_image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <SignalPill label={item.state || 'General'} />
                      <span style={{ fontSize: 10, color: T.ink3, fontWeight: 800 }}>{new Date(item.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0, lineHeight: 1.4, color: T.ink, height: 52, overflow: "hidden" }}>
                      {item.title}
                    </h3>
                    <div style={{ marginTop: 20, pt: 20, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <span style={{ fontSize: 11, fontWeight: 900, color: T.accent }}>READ ARTICLE →</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── INTELLIGENCE FOOTER (TOOLS, NEWS & AD SPACE) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          
          {/* COLUMN 1: STRATEGIC TOOLS */}
          <div style={{ background: T.ink, borderRadius: 32, padding: 32, color: "#fff", boxShadow: "0 30px 60px -15px rgba(15,23,42,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Strategic Tools</h3>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 24, lineHeight: 1.5 }}>
              Precision calculators for TCO, subsidies, and financing options.
            </p>
            <CalcWrapper />
          </div>

          {/* COLUMN 2: REGIONAL NEWS */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 32, padding: 32 }}>
            <h4 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: T.ink2, textTransform: "uppercase", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: T.accent }}>📡</span> Regional News
            </h4>
            
            {sidebarSignals.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: T.ink3, fontSize: 12 }}>Select a city for local news...</div>
            ) : (
              sidebarSignals.map(s => (
                <a key={s.id} href={`/pulse/${s.slug}`} style={{ textDecoration: "none", display: "block", marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: T.highlight }}>{s.state?.toUpperCase() || 'LOCAL'} PULSE</span>
                    <span style={{ fontSize: 10, color: T.ink3 }}>Live</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, lineHeight: 1.3 }}>{s.title}</div>
                </a>
              ))
            )}

            <a href="/news" style={{ display: "block", textAlign: "center", background: T.bg, padding: "14px", borderRadius: 16, fontSize: 11, fontWeight: 800, color: T.ink2, textDecoration: "none", border: `1px solid ${T.border}` }}>
              SEE ALL INDUSTRY PULSES →
            </a>
          </div>

          {/* COLUMN 3: AD SPACE / FEATURED VEHICLES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* FEATURED AD/INVENTORY BOX */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {featured.map(v => (
                <div key={v.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 28, padding: 20, display: "flex", gap: 20, alignItems: "center" }}>
                   <div style={{ width: 60, height: 60, background: T.bg, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                     {v.type === "Scooter" ? "🛵" : "🚙"}
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 10, fontWeight: 900, color: T.accent, textTransform: "uppercase", marginBottom: 4 }}>Top Pick</div>
                     <div style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>{v.brand} {v.model}</div>
                     <div style={{ fontSize: 12, color: T.ink3 }}>{v.spec.split('·')[0]} · ₹{v.price.toLocaleString()}</div>
                   </div>
                   <a href={`/vehicles?id=${v.id}`} style={{ background: T.bg, color: T.ink, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, textDecoration: "none" }}>→</a>
                </div>
              ))}
              
              <button onClick={() => window.location.href="/vehicles"} style={{ background: `linear-gradient(135deg, ${T.accent} 0%, #059669 100%)`, color: "#fff", border: "none", padding: "16px", borderRadius: 20, fontSize: 12, fontWeight: 900, cursor: "pointer", width: "100%", boxShadow: `0 10px 20px ${T.accent}44` }}>
                EXPLORE ALL INVENTORY →
              </button>
            </div>

            {/* EXPERT QUOTE (Smaller now) */}
            <div style={{ position: "relative", background: T.card, border: `1px solid ${T.border}`, borderRadius: 28, padding: 24, color: T.ink }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: T.ink3, marginBottom: 12, textTransform: "uppercase" }}>Industry Intelligence</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 700, fontStyle: "italic" }}>
                "{quote}"
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                 <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.border }} />
                 <div style={{ fontSize: 10, fontWeight: 900 }}>Satyanarayan V.</div>
              </div>
            </div>
          </div>
        </div>
        
      </main>

      <Footer />
    </div>
  )
}
