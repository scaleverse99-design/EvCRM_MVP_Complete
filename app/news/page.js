"use client"
import { useState, useEffect } from "react"
import { stripMarkdown } from "../../lib/markdown"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { getPulseStories } from "../../lib/data"

// ── DESIGN TOKENS (Synced with 'Stitch' Reference) ────────────────
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

export default function NewsPulsePage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/pulse')
        const data = await res.json()
        if (data.success) {
          setNews(data.news.filter(item => item.is_archived !== true).slice(0, 15))
        } else {
          setNews(getPulseStories().slice(0, 15))
        }
      } catch (e) {
        setNews(getPulseStories().slice(0, 15))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const megaStory = news[0]
  const signalGrid = news.slice(1, 10)
  const sidebarSignals = news.slice(10)

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: T.ink }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .news-ticker:hover { animation-play-state: paused; }
      ` }} />
      
      <TopBar />

      {news.length > 0 && (
        <div className="news-ticker-container" style={{ background: "#000", color: "#fff", height: 32, display: "flex", alignItems: "center", overflow: "hidden", position: "relative" }}>
          <div style={{ background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 900, height: "100%", display: "flex", alignItems: "center", padding: "0 15px", flexShrink: 0, zIndex: 2 }}>
            JUST IN
          </div>
          <div className="news-ticker-content" style={{ 
            whiteSpace: "nowrap", display: "inline-block", paddingLeft: "100%", 
            animation: "ticker 40s linear infinite", fontSize: 11, fontWeight: 700 
          }}>
            {news.map(n => (
              <span key={n.id} style={{ marginRight: 60 }}>
                <span style={{ color: "#10b981" }}>⚡</span> {n.title.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "30px 20px 60px" }}>
        
        {loading ? (
            <div style={{ textAlign: "center", padding: 100, color: T.ink3 }}>📡 Synchronizing with Sovereign Intelligence...</div>
        ) : news.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
            
            {/* ── LEFT: MAIN PULSE ── */}
            <div>
              {megaStory && (
                <a href={`/pulse/${megaStory.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ 
                    position: "relative", background: "#000", height: 500, borderRadius: 24, 
                    overflow: "hidden", marginBottom: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.15)" 
                  }}>
                    <img src={megaStory.featured_image_url} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} alt="Mega Story" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, padding: 40, width: "100%", boxSizing: "border-box" }}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                        <SignalPill label="Mega Story" color={T.accent} />
                        <SignalPill label={megaStory.state} color="#fff" />
                      </div>
                      <h2 style={{ fontSize: 42, lineHeight: 1.1, fontWeight: 900, color: "#fff", margin: 0, maxWidth: 800 }}>
                        {megaStory.title}
                      </h2>
                      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 16, maxWidth: 600, lineHeight: 1.6 }}>
                        {stripMarkdown(megaStory.summary).slice(0, 250)}...
                      </p>
                    </div>
                  </div>
                </a>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                {signalGrid.map(item => (
                  <div key={item.id} style={{ 
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, 
                    display: "flex", gap: 0, overflow: "hidden", height: 180, transition: "all 0.2s" 
                  }}>
                    <div style={{ flex: "0 0 160px", background: "#f1f5f9" }}>
                      <img src={item.featured_image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <SignalPill label={item.state} />
                          <span style={{ fontSize: 9, color: T.ink3, fontWeight: 700 }}>{new Date(item.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                          <a href={`/pulse/${item.slug}`} style={{ textDecoration: "none", color: T.ink }}>{item.title}</a>
                        </h3>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.accent }}>
                        <a href={`/pulse/${item.slug}`} style={{ textDecoration: "none", color: "inherit" }}>READ INTEL →</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ 
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 24, 
                padding: 24, paddingBottom: 10, position: "sticky", top: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.03)" 
              }}>
                <h4 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: T.ink2, textTransform: "uppercase", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: T.accent }}>📡</span> Regional Intelligence
                </h4>
                
                {sidebarSignals.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.ink3, paddingBottom: 20 }}>More signals initializing...</p>
                ) : (
                  sidebarSignals.map(s => (
                    <a key={s.id} href={`/pulse/${s.slug}`} style={{ textDecoration: "none", display: "block", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: T.highlight, marginBottom: 4 }}>{s.state?.toUpperCase() || 'LOCAL'} PULSE</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{s.title}</div>
                    </a>
                  ))
                )}

                <div style={{ background: T.ink, borderRadius: 16, padding: 20, color: "#fff", marginTop: 20, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: T.accent, marginBottom: 8 }}>EXPERT INSIGHT</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
                    "India's FAME-III policy is expected to prioritize public transport electrification over private cars in Q4."
                  </div>
                  <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, opacity: 0.6 }}>— Dr. Satnam Singh, Policy Advisor</div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ 
      textAlign: "center", padding: "100px 40px", background: "#fff", borderRadius: 32, 
      border: `1.5px dashed ${T.border}`, color: T.ink3, gridColumn: "span 2"
    }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>🛰️</div>
      <h3 style={{ fontSize: 20, fontWeight: 900, color: T.ink, marginBottom: 8 }}>Awaiting First Pulse</h3>
      <p>Our AI engines are currently scanning for the latest EV industry updates. Check back in a few minutes.</p>
    </div>
  )
}
