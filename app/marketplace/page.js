"use client"
import Link from "next/link"
import Shell from "../../components/layout/Shell"
import { C } from "../../lib/constants"

export default function MarketplacePage() {
  return (
    <Shell>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            padding: "28px 32px",
            borderRadius: 24,
            background: "#f8fafc",
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)"
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, color: C.ink, letterSpacing: "-0.5px" }}>
            Marketplace module <span style={{ color: C.green }}>• future-ready</span>
          </div>
          <p style={{ fontSize: 13, color: C.ink3, marginTop: 10, lineHeight: 1.7 }}>
            The marketplace experience has been decoupled from the active CRM workspace.
            It remains in the same project folder for future integration, but the current development focus is the CRM tool only.
          </p>

          <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 14, background: "#fff", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
              Active CRM focus
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: C.ink2, lineHeight: 1.7, fontSize: 12 }}>
              <li>Leads pipeline</li>
              <li>Dealer dashboard</li>
              <li>Queue and assignments</li>
              <li>Connect and operations tools</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link href="/leads" style={{ textDecoration: "none", background: C.green, color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
              Go to CRM Leads
            </Link>
            <Link href="/dealer" style={{ textDecoration: "none", background: "#fff", color: C.ink, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 800 }}>
              Open Dealer Dashboard
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  )
}
