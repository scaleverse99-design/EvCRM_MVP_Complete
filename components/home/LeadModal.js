"use client"
import { useState, useEffect } from "react"
import { C, fmt } from "../../lib/constants"
import { Card, Btn, Input, Tag } from "../ui"
import { db } from "../../lib/firebase-client"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import VEHICLES from "../../data/vehicles.json"
import { calculateLeadScore } from "../../lib/scoring"

export default function LeadModal({ mode, data, onClose, location }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle: data?.model || "",
    test_ride_date: "",
    whatsapp_consent: true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 1) return setStep(2)
    
    setLoading(true)
    try {
      // 1. Prepare lead object with intent signals
      const leadData = {
        name: form.name,
        phone: form.phone,
        vehicle: form.vehicle,
        test_ride_date: form.test_ride_date,
        whatsapp_consent: form.whatsapp_consent,
        state: location?.state || "Telangana",
        district: location?.district || "Hyderabad",
        source: "Consumer Portal",
        source_context: mode, // tco, subsidy, emi, promo, talk
        used_tco: mode === "tco",
        used_subsidy: mode === "subsidy",
        used_emi: mode === "emi",
        promo_code: data?.code || null,
        dealerId: data?.dealerId || null,
        createdAt: serverTimestamp(),
        status: "NEW"
      }

      // 2. Calculate initial score
      const { score, recommendation } = calculateLeadScore(leadData)
      leadData.initial_score = score
      leadData.recommendation = recommendation

      // 3. Save to Firestore
      await addDoc(collection(db, "evcrm_leads"), leadData)
      
      setSuccess(true)
    } catch (error) {
      console.error("Lead submission failed", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
         <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
         <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Interest Received!</h2>
         <p style={{ fontSize: 14, color: C.ink3, lineHeight: 1.6, marginBottom: 32 }}>
           A verified dealer from {location?.district} will contact you within 2 hours with the best offers.
         </p>
         <Btn onClick={onClose} style={{ width: "100%", background: "#1B4332" }}>Back to Discovery</Btn>
      </div>
    )
  }

  return (
    <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
       <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>
            {mode === "tco" ? "⛽" : mode === "subsidy" ? "🇮🇳" : "🛵"}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            {mode === "talk" ? `Talk to ${data.name}` : "Reserve Your Best Price"}
          </h2>
          <p style={{ fontSize: 13, color: C.ink3 }}>
            Connect with local dealers and lock in your savings.
          </p>
       </div>

       <form onSubmit={handleSubmit}>
          {step === 1 ? (
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input 
                   label="Your Full Name" placeholder="e.g. Rahul Sharma" 
                   value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                />
                <Input 
                   label="Phone Number" placeholder="10-digit mobile" 
                   value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }} onClick={() => setForm({...form, whatsapp_consent: !form.whatsapp_consent})}>
                   <div style={{ width: 18, height: 18, border: `1.5px solid ${form.whatsapp_consent ? C.green : C.border}`, background: form.whatsapp_consent ? C.green : "none", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>{form.whatsapp_consent && "✓"}</div>
                   <div style={{ fontSize: 12, color: C.ink3 }}>Send me price alerts and dealer quotes on WhatsApp</div>
                </div>
                <Btn type="submit" disabled={!form.name || !form.phone} style={{ width: "100%", marginTop: 20, background: C.green }}>Continue ➔</Btn>
             </div>
          ) : (
             <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                   <label style={{ fontSize: 11, fontWeight: 800, color: C.ink3, marginBottom: 8, display: "block", textTransform: "uppercase" }}>Vehicle of Interest</label>
                   <select 
                     value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})}
                     style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 14 }}
                   >
                      <option value="">Select a Model</option>
                      {VEHICLES.map(v => <option key={v.id} value={v.model}>{v.brand} {v.model}</option>)}
                   </select>
                </div>
                
                <div>
                   <label style={{ fontSize: 11, fontWeight: 800, color: C.ink3, marginBottom: 8, display: "block", textTransform: "uppercase" }}>Preferred Test Ride Date (Optional)</label>
                   <input 
                     type="date" 
                     value={form.test_ride_date} onChange={e => setForm({...form, test_ride_date: e.target.value})}
                     style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 14 }}
                   />
                </div>

                <div style={{ background: C.bg, padding: 16, borderRadius: 12, border: `1px dashed ${C.border}` }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>💡</span>
                      <p style={{ fontSize: 11, color: C.ink3, lineHeight: 1.4 }}>
                        Providing a test ride date increases your priority score and guarantees a slot at the dealership.
                      </p>
                   </div>
                </div>
                
                <Btn type="submit" loading={loading} style={{ width: "100%", marginTop: 12, background: C.green, color: "#fff" }}>
                   Submit Interest
                </Btn>
                <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: C.ink3, fontSize: 12, cursor: "pointer" }}>Back to Contact Details</button>
             </div>
          )}
       </form>
    </div>
  )
}
