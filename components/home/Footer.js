"use client"
import { C } from "../../lib/constants"
import { Btn } from "../ui"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Footer() {
  const router = useRouter()
  const columnTitleStyle = { fontSize: 13, fontWeight: 900, color: C.ink, marginBottom: 20, textTransform: "uppercase", letterSpacing: 1 }
  const linkStyle = { fontSize: 13, color: C.ink3, textDecoration: "none", marginBottom: 12, display: "block" }

  return (
    <footer style={{ background: "#fff", borderTop: `1px solid ${C.border}`, padding: "80px 0 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 48, marginBottom: 60 }}>
          
          {/* Brand & Mission */}
          <div style={{ gridColumn: "span 2" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 20 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.8px" }}>
                EV<span style={{ color: C.green }}>.CRM</span>
              </span>
            </Link>
            <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.6, maxWidth: 300, marginBottom: 24, opacity: 0.8 }}>
              India's Universal Commerce Hub. Empowering buyers with data and dealers with the Next-Gen EV Sales OS.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
               <div style={{ width: 36, height: 36, background: C.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>💬</div>
               <div style={{ width: 36, height: 36, background: C.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>👔</div>
               <div style={{ width: 36, height: 36, background: C.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>📷</div>
            </div>
          </div>

          {/* About */}
          <div>
            <h5 style={columnTitleStyle}>About evcrm.in</h5>
            <Link href="/blog" style={linkStyle}>EV Research Blog</Link>
            <Link href="/marketplace" style={linkStyle}>Vehicle Marketplace</Link>
            <Link href="/subsidies" style={linkStyle}>State-wise Subsidies</Link>
            <Link href="/charging" style={linkStyle}>Charging Stations</Link>
          </div>

          {/* For Dealers */}
          <div>
            <h5 style={columnTitleStyle}>For Dealerships</h5>
            <Link href="/register" style={linkStyle}>Join the Network</Link>
            <Link href="/login" style={linkStyle}>Dealer Login</Link>
            <Link href="/pricing" style={linkStyle}>Pricing Plans</Link>
            <Link href="/docs" style={linkStyle}>Sales Tool API</Link>
          </div>

          {/* Contact */}
          <div>
            <h5 style={columnTitleStyle}>Reach Out</h5>
            <div style={linkStyle}>📍 Hitech City, Hyderabad</div>
            <div style={linkStyle}>✉️ hello@evcrm.in</div>
            <div style={linkStyle}>📞 +91 91542 35560</div>
            <div style={{ marginTop: 20 }}>
               <Btn style={{ padding: "8px 16px", background: C.green, fontSize: 11 }} onClick={() => router.push("/register")}>
                 Partner with us ➔
               </Btn>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.ink3 }}>
          <div>© 2026 EvCRM. All rights reserved. GST Registered in Telangana.</div>
          <div style={{ display: "flex", gap: 24 }}>
             <Link href="/privacy" style={{ color: C.ink3, textDecoration: "none" }}>Privacy Policy</Link>
             <Link href="/terms" style={{ color: C.ink3, textDecoration: "none" }}>Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
