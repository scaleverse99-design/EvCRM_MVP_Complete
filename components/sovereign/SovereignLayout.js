"use client"
import React from 'react'

/**
 * Sovereign Layout — "Premium Business Edition"
 * A sleek, high-performance layout for external business sites
 * running on the Ops Manager backbone.
 */
export default function SovereignLayout({ children, brandName = "BusinessName", accentColor = "#10b981" }) {
  const S = {
    bg: "#ffffff",
    ink: "#0f172a",
    ink2: "#475569",
    border: "#f1f5f9",
    accent: accentColor,
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        body { margin: 0; }
        .nav-link { color: #475569; text-decoration: none; font-weight: 600; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: ${S.accent}; }
      `}</style>

      {/* ── STICKY HEADER ── */}
      <header style={{ 
        position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.8)", 
        backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.border}`, padding: "0 24px" 
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {brandName}<span style={{ color: S.accent }}>.</span>
          </div>
          
          <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <a href="#services" className="nav-link">Services</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#contact" style={{ 
              background: S.accent, color: "#fff", padding: "10px 20px", 
              borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: `0 4px 14px ${S.accent}33`
            }}>
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {children}
      </main>

      {/* ── MINIMAL FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: "60px 24px", marginTop: 80 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: S.ink2 }}>
            © 2026 {brandName}. All rights reserved.
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.ink2, textTransform: "uppercase", letterSpacing: 1 }}>
            Powered by <span style={{ color: S.ink }}>Ops Manager Sovereign Cloud</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
