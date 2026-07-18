"use client"
import { useState } from "react"
import { Card, SectionHeading } from "../ui"
import { C } from "../../lib/constants"
import { authFetch } from "../../lib/token-storage"

// Self-contained "Domains & Storefronts" card — shown both in the dealer
// dashboard's Settings tab and on the My Profile page, so dealers can find
// and manage their free storefront link / custom domain from either place.
// Fetches nothing on mount and needs no parent-managed settings state; it
// only needs the dealer's own dealership id + current domain fields.
export default function DomainsStorefrontCard({ dealership, dealerSubdomain, customDomain: initialCustomDomain }) {
  const [customDomain, setCustomDomain] = useState(initialCustomDomain || "")
  const [domainVerifying, setDomainVerifying] = useState(false)
  const [domainMessage, setDomainMessage] = useState("")

  const slug = dealerSubdomain || "ramdealers"

  const verifyCustomDomain = async () => {
    if (!customDomain.trim()) { setDomainMessage("Please enter a domain"); return }
    setDomainVerifying(true)
    setDomainMessage("")
    try {
      const res = await authFetch("/api/dealer/verify-domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership, customDomain: customDomain.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setDomainMessage("✅ Domain verified! It's now active.")
      } else {
        setDomainMessage(`❌ ${data.error || "Verification failed"}`)
      }
    } catch (err) {
      setDomainMessage("❌ Verification failed: " + err.message)
    } finally {
      setDomainVerifying(false)
    }
  }

  return (
    <Card style={{ gridColumn: "1 / -1" }}>
      <SectionHeading>🌐 Domains & Storefronts</SectionHeading>
      <div style={{ fontSize: 10, color: C.ink3, marginBottom: 16, lineHeight: 1.5 }}>
        Your storefront is live right now at <b>evcrm.in/{slug}</b> — share this link anywhere. Optionally, point your own domain to evcrm.in via CNAME for a fully branded storefront without "evcrm.in" in the URL.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.lightGreen, border: `1px solid ${C.green}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>FREE Storefront Link</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, color: C.green, wordBreak: "break-all", textDecoration: "none" }}>
              evcrm.in/{slug} ↗
            </a>
            <button onClick={() => { navigator.clipboard?.writeText(`https://evcrm.in/${slug}`) }}
              title="Copy link" style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
              Copy
            </button>
          </div>
          <div style={{ fontSize: 9, color: C.ink3, marginTop: 6 }}>Live now, no setup needed</div>
        </div>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>Custom Domain (Paid)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>
            ₹1,000 setup + ₹100/month
          </div>
          <div style={{ fontSize: 9, color: C.ink3, marginTop: 6 }}>Your branded domain (e.g., ramdealers.in)</div>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Connect Your Custom Domain</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
            placeholder="e.g., ramdealers.in"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, fontFamily: "inherit", outline: "none" }}
          />
          <button
            onClick={verifyCustomDomain}
            disabled={domainVerifying}
            style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {domainVerifying ? "Verifying…" : "Verify"}
          </button>
        </div>
        {domainMessage && (
          <div style={{ fontSize: 10, color: domainMessage.includes("✅") ? C.green : C.red, background: domainMessage.includes("✅") ? "#ECFDF5" : "#FEF2F2", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
            {domainMessage}
          </div>
        )}
        <div style={{ fontSize: 9.5, color: C.ink3, lineHeight: 1.6, background: C.lightGray, borderRadius: 6, padding: 10 }}>
          <b>Setup Instructions:</b>
          <br />1. In your domain registrar (e.g., GoDaddy, Namecheap), add a CNAME record:
          <br /><code style={{ fontFamily: "monospace", fontSize: 9, background: "#fff", padding: "2px 4px", borderRadius: 3 }}>{customDomain.trim() || "yourdomain.in"} CNAME evcrm.in</code>
          <br />2. Wait 5-10 minutes for DNS propagation
          <br />3. Click "Verify" above
          <br />4. Your domain will be active!
        </div>
      </div>
    </Card>
  )
}
