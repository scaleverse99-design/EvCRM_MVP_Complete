"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import TopBar from "../../components/home/TopBar"
import Footer from "../../components/home/Footer"
import { C } from "../../lib/constants"
import SUBSIDIES from "../../data/subsidies.json"

export default function SubsidiesHub() {
  const [location, setLocation] = useState(null)
  const [activeTab, setActiveTab] = useState("subsidy_2w") // subsidy_2w, subsidy_3w, subsidy_4w

  useEffect(() => {
    const saved = localStorage.getItem("evcrm_user_location")
    if (saved) setLocation(JSON.parse(saved))
  }, [])

  const currentState = location?.state || "Telangana"
  const currentDistrict = location?.district || "Hyderabad"
  
  // Data extraction logic
  const stateData = SUBSIDIES[currentState] || SUBSIDIES["Telangana"]
  const data = stateData.default
  const localIncentive = stateData[currentDistrict]?.local_incentive || 0

  const subsidyValue = data[activeTab] || 0
  const fame2Val = data.fame2_eligible ? (activeTab === "subsidy_2w" ? 15000 : activeTab === "subsidy_3w" ? 45000 : 0) : 0
  const totalSavings = subsidyValue + fame2Val + localIncentive

  const tabs = [
    { id: "subsidy_2w", label: "2-Wheelers", icon: "🛵" },
    { id: "subsidy_3w", label: "3-Wheelers", icon: "🛺" },
    { id: "subsidy_4w", label: "4-Wheelers", icon: "🚗" },
  ]

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <TopBar location={location} setLocation={setLocation} />
      
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 20px" }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: 8, 
            background: "#ecfdf5", padding: "8px 16px", borderRadius: 100,
            color: C.green, fontSize: 13, fontWeight: 700, marginBottom: 16
          }}>
            📍 CURRENT LOCATION: {currentDistrict}, {currentState}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: C.ink, letterSpacing: "-1.5px", marginBottom: 12 }}>
            EV Subsidies & Benefits Hub
          </h1>
          <p style={{ fontSize: 18, color: C.ink3, maxWidth: 650, margin: "0 auto" }}>
            Maximum savings discovered for your region. We automatically combine State, 
            Central (FAME-II), and local district incentives.
          </p>
        </div>

        {/* Savings Dashboard */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 32, alignItems: "start" }}>
          
          {/* Left: Interactive Calculator */}
          <div style={{ background: "#fff", borderRadius: 24, padding: 32, border: `1px solid ${C.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Incentive Calculator</h2>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
              {tabs.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ 
                    flex: 1, padding: "16px 12px", borderRadius: 16, 
                    border: `1.5px solid ${activeTab === t.id ? C.green : C.border}`,
                    background: activeTab === t.id ? "#ecfdf5" : "none",
                    cursor: "pointer", transition: "all 0.2s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: activeTab === t.id ? C.green : C.ink2 }}>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ spaceY: 12 }}>
              <IncentiveRow label="State Subsidy" value={subsidyValue} />
              <IncentiveRow label="FAME-II Central Subsidy" value={fame2Val} note="Direct Benefit Transfer" />
              {localIncentive > 0 && <IncentiveRow label={`${currentDistrict} Local Bonus`} value={localIncentive} color={C.green} />}
              <div style={{ height: 1, background: C.border, margin: "20px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total Purchase Savings</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: C.green }}>₹{totalSavings.toLocaleString()}/-*</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: C.ink3, marginTop: 24, opacity: 0.7 }}>
              *Subject to OEM eligibility and battery capacity requirements. Estimates only.
            </p>
          </div>

          {/* Right: Policy Details */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <PolicyCard title="Road Tax Waiver" value={`${data.road_tax_waiver}% Savings`} sub="Applicable for Life" icon="🛣️" />
              <PolicyCard title="Registration Fee" value={`${data.registration_fee_waiver}% Free`} sub="Standard Waiver" icon="📝" />
            </div>

            <div style={{ background: "#111827", borderRadius: 24, padding: 32, color: "#fff" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Regional Policy Overview</h3>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
                {currentState}'s EV Policy is one of India's most progressive. Buyers can claim up to 100% road tax exemption 
                for electric vehicles registered within {currentDistrict}. Combined with FAME-II, your vehicle purchase cost is reduced significantly.
              </p>
              
              <Link href="/connect" style={{ 
                display: "inline-block", padding: "12px 24px", borderRadius: 12, 
                background: C.green, color: "#fff", textDecoration: "none",
                fontSize: 13, fontWeight: 800
              }}>
                Talk to Subsidy Expert
              </Link>
            </div>
          </div>

        </div>

        {/* Scrappage Incentive Banner */}
        {data.scrappage_bonus > 0 && (
          <div style={{ marginTop: 40, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: "20px 32px", display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 24 }}>♻️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#92400e" }}>Extra Scrappage Bonus Available</div>
              <p style={{ fontSize: 13, color: "#b45309" }}>Exchange your old ICE vehicle to get an additional ₹{data.scrappage_bonus.toLocaleString()} off your new EV.</p>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}

function IncentiveRow({ label, value, note, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: color || C.ink }}>{label}</div>
        {note && <div style={{ fontSize: 10, color: C.ink3 }}>{note}</div>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || C.ink }}>₹{value.toLocaleString()}</div>
    </div>
  )
}

function PolicyCard({ title, value, sub, icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 12, color: C.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 12, color: C.ink3 }}>{sub}</div>
    </div>
  )
}
