"use client"
import React, { useState, useEffect } from 'react'
import SovereignLayout from '../../components/sovereign/SovereignLayout'
import { OpsProxy } from '../../lib/ops-proxy'

/**
 * Business Landing Page Template
 * Demonstrates the "Sovereign SaaS" power:
 * - Direct-to-Drive Shadow Cache reads
 * - Direct-to-Sheet writes
 * - Zero server overhead
 */
export default function BusinessLanding() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [formStatus, setFormStatus] = useState(null)
  
  // Mock configuration (In production, this would be fetched from the client's domain config)
  const clientConfig = {
    brandName: "TeslaCharge Solutions",
    accent: "#3b82f6",
    opsUser: {
      opsmanager_url: "https://script.google.com/macros/s/example/exec",
      opsmanager_token: "test-token",
      shadow_cache_base_url: null // Fallback to direct Ops Manager for demo
    }
  }

  useEffect(() => {
    async function loadData() {
      // Fetching services from the Sovereign Backend
      const data = await OpsProxy.get('services', clientConfig.opsUser, 'tesla-charge')
      
      if (data && data.length > 0) {
        setServices(data)
      } else {
        // Sample fallback data for the first-time view
        setServices([
          { name: "Home Charger Install", price: "₹12,000", desc: "Professional installation for residential chargers." },
          { name: "Maintenance Check", price: "₹2,500", desc: "Annual safety and performance check for your EVSE." },
          { name: "Commercial Setup", price: "Custom", desc: "High-capacity charging stations for your business." }
        ])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleContact = async (e) => {
    e.preventDefault()
    setFormStatus('sending')
    
    const formData = new FormData(e.target)
    const payload = {
      sheet: 'inquiries',
      row: {
        timestamp: new Date().toISOString(),
        name: formData.get('name'),
        email: formData.get('email'),
        service: formData.get('service'),
        message: formData.get('message')
      }
    }

    const res = await OpsProxy.act('WRITE_RECORD', payload, clientConfig.opsUser, 'tesla-charge')
    
    if (res.success) {
      setFormStatus('success')
      e.target.reset()
    } else {
      setFormStatus('error')
    }
  }

  return (
    <SovereignLayout brandName={clientConfig.brandName} accentColor={clientConfig.accent}>
      {/* ── HERO SECTION ── */}
      <section style={{ padding: "100px 0", textAlign: "center" }}>
        <h1 style={{ fontSize: 64, fontWeight: 800, margin: 0, letterSpacing: "-2px", lineHeight: 1.1 }}>
          Powering the future of <br/> 
          <span style={{ color: clientConfig.accent }}>Electric Mobility.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#64748b", marginTop: 24, maxWidth: 600, marginInline: "auto" }}>
          Premium EV charging infrastructure for homes and businesses. 
          Managed by our Sovereign Cloud technology for maximum reliability.
        </p>
      </section>

      {/* ── DYNAMIC SERVICES (Shadow Cache Powered) ── */}
      <section id="services" style={{ padding: "80px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Our Services</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Fetched dynamically from our Sovereign Backend.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {services.map((s, i) => (
            <div key={i} style={{ 
              padding: 32, borderRadius: 24, border: "1px solid #f1f5f9", 
              background: "#fff", transition: "transform 0.2s", cursor: "default"
            }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'} 
               onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ fontSize: 12, fontWeight: 700, color: clientConfig.accent, textTransform: "uppercase", marginBottom: 12 }}>{s.price}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px 0" }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT SYNC (Direct-to-Sheet) ── */}
      <section id="contact" style={{ padding: "80px 0", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Ready to switch?</h2>
            <p style={{ color: "#64748b", fontSize: 16, marginTop: 16, lineHeight: 1.6 }}>
              Our Sovereign Lead System ensures your data is stored directly in our private 
              database, ensuring total privacy and lightning-fast follow-ups.
            </p>
            <div style={{ marginTop: 32, display: "flex", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>RESPONSE TIME</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>&lt; 2 Hours</div>
              </div>
              <div style={{ padding: 16, borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>AVAILABILITY</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>24/7 Support</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: 40, borderRadius: 32 }}>
            <form onSubmit={handleContact} style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Full Name</label>
                <input name="name" required style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14 }} placeholder="John Doe" />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Email Address</label>
                <input name="email" type="email" required style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14 }} placeholder="john@company.com" />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Interested Service</label>
                <select name="service" style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14 }}>
                  {services.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Message</label>
                <textarea name="message" rows={4} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14 }} placeholder="Tell us about your requirements..." />
              </div>
              
              <button disabled={formStatus === 'sending'} style={{ 
                background: clientConfig.accent, color: "#fff", padding: "16px", 
                borderRadius: 14, fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
                marginTop: 10, transition: "opacity 0.2s"
              }}>
                {formStatus === 'sending' ? 'Sending...' : 'Send Inquiry ›'}
              </button>

              {formStatus === 'success' && <div style={{ textAlign: "center", color: "#059669", fontSize: 13, fontWeight: 700 }}>✓ Inquiry sent! Check your Google Sheet.</div>}
              {formStatus === 'error' && <div style={{ textAlign: "center", color: "#dc2626", fontSize: 13, fontWeight: 700 }}>× Failed to connect to server.</div>}
            </form>
          </div>
        </div>
      </section>
    </SovereignLayout>
  )
}
