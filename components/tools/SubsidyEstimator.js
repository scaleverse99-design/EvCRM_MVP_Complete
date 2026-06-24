"use client"
import { useState, useEffect } from "react"
import { C, fmt } from "../../lib/constants"
import { Slider, Card, Btn, Tag, Input } from "../ui"
import SUBSIDIES from "../../data/subsidies.json"
import DISTRICTS from "../../data/districts.json"

export default function SubsidyEstimator({ location, onConvert }) {
  const [state, setState] = useState(location?.state || "Telangana")
  const [district, setDistrict] = useState(location?.district || "Hyderabad")
  const [type, setType] = useState("2W")
  const [price, setPrice] = useState(150000)
  const [scrappage, setScrappage] = useState(false)

  const stateData = SUBSIDIES[state] || SUBSIDIES["Telangana"]
  const data = stateData[district] || stateData["default"]

  // Calculation Logic
  const subsidy = type === "2W" ? data.subsidy_2w : type === "3W" ? data.subsidy_3w : data.subsidy_4w
  const roadTax = data.road_tax_waiver === 100 ? (price * 0.12) : 0 // Assuming 12% road tax
  const regFee = data.registration_fee_waiver === 100 ? 5000 : 0
  const scrapBonus = scrappage ? data.scrappage_bonus : 0
  const totalIncentives = (subsidy || 0) + roadTax + regFee + scrapBonus

  return (
    <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
         <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 8, display: "block" }}>STATE</label>
            <select value={state} onChange={e => { setState(e.target.value); setDistrict(DISTRICTS[e.target.value][0]) }} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 13, background: "#fff" }}>
               {Object.keys(DISTRICTS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, marginBottom: 8, display: "block" }}>DISTRICT</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 13, background: "#fff" }}>
               {DISTRICTS[state]?.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
         </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["2W", "3W", "4W"].map(t => (
          <button 
            key={t} onClick={() => setType(t)}
            style={{ 
              flex: 1, padding: "10px", borderRadius: 10, 
              border: `1.5px solid ${type === t ? C.blue : C.border}`,
              background: type === t ? C.blueL : "none",
              color: type === t ? C.blue : C.ink,
              fontWeight: 800, fontSize: 13, cursor: "pointer"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <Slider label="Vehicle Ex-Showroom Price" min={50000} max={2500000} step={10000} value={price} onChange={setPrice} unit=" ₹" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: scrappage ? "#E8F5E9" : C.bg, borderRadius: 16, border: `1.5px solid ${scrappage ? C.green : C.border}`, cursor: "pointer", marginBottom: 32 }} onClick={() => setScrappage(!scrappage)}>
         <div style={{ width: 24, height: 24, borderRadius: "50%", background: scrappage ? C.green : "#fff", border: `2px solid ${scrappage ? C.green : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>{scrappage && "✓"}</div>
         <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Own an ICE vehicle for scrapping?</div>
            <div style={{ fontSize: 11, color: C.ink3 }}>Unlock up to {fmt.currency(data.scrappage_bonus)} in extra scrappage bonus.</div>
         </div>
      </div>

      <Card style={{ padding: 32, background: "#fff", border: `2px solid #1B4332`, marginBottom: 32 }}>
         <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.ink3, letterSpacing: 1, marginBottom: 8 }}>TOTAL ESTIMATED INCENTIVES</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#1B4332" }}>{fmt.currency(Math.round(totalIncentives))}</div>
            <p style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>Effective On-Road: {fmt.currency(price - totalIncentives)}*</p>
         </div>

         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "State Policy Incentive", val: subsidy },
              { label: "Road Tax Waiver", val: roadTax },
              { label: "Registration Fee Exemption", val: regFee },
              { label: "Scrappage Bonus", val: scrapBonus, hide: !scrappage },
              { label: "FAME II / PM E-Drive", val: "Applied", desc: "at point of sale" }
            ].map(item => {
              if (item.hide) return null;
              return (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                   <span style={{ color: C.ink3 }}>{item.label}</span>
                   <span style={{ fontWeight: 800, color: C.ink }}>{typeof item.val === "number" ? fmt.currency(item.val) : item.val}</span>
                </div>
              )
            })}
         </div>
      </Card>

      <Btn 
        onClick={() => onConvert({ totalIncentives: Math.round(totalIncentives), state, tool: "subsidy" })}
        style={{ width: "100%", padding: "16px", background: "#1B4332", color: "#F5C518", fontSize: 16, fontWeight: 800 }}
      >
        Show This Saving to Local Dealers ➔
      </Btn>
    </div>
  )
}
