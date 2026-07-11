"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { C, fmt } from "../../lib/constants"
import { Btn, Input, Card, Tag } from "../../components/ui"
import DISTRICTS from "../../data/districts.json"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "Telangana",
    district: "Hyderabad",
    businessName: "",
    gstin: "",
    address: "",
    brands: []
  })

  const EV_BRANDS = ["Tata Motors", "Ather Energy", "Ola Electric", "TVS", "Bajaj", "MG", "Mahindra", "Okaya", "Ampere"]

  const validateGst = (gst) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)

  const handleNext = () => {
    const e = {}
    if (step === 1) {
      if (!form.name) e.name = "Full name is required"
      if (!form.email || !form.email.includes("@")) e.email = "Valid email is required"
      if (!form.password || form.password.length < 8) e.password = "Min 8 characters required"
      if (!form.phone || form.phone.length < 10) e.phone = "10-digit mobile required"
    } else if (step === 2) {
      if (!form.businessName) e.businessName = "Business name is required"
      if (form.gstin && !validateGst(form.gstin)) e.gstin = "Invalid GSTIN format"
    }

    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    setStep(step + 1)
  }

  const toggleBrand = (b) => {
    setForm(f => ({
      ...f,
      brands: f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role: "dealer",
          city: form.district // Mapping for existing backend
        })
      })
      if (res.ok) {
        router.push("/dealer")
      } else {
        const data = await res.json()
        setErrors({ global: data.error || "Registration failed" })
      }
    } catch (err) {
      setErrors({ global: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
           <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, background: "#1B4332", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: 20 }}>⚡</div>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#1B4332" }}>evcrm<span style={{ color: "#F5C518" }}>.in</span></span>
           </div>
           <p style={{ fontSize: 13, color: C.ink3 }}>Join India's Largest Network of Verified EV Dealerships</p>
        </div>

        <Card style={{ padding: 40, background: "#fff", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
           {/* Steps Indicator */}
           <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ 
                  flex: 1, height: 6, borderRadius: 3, 
                  background: step >= s ? "#1B4332" : C.border,
                  transition: "background 0.3s"
                }} />
              ))}
           </div>

           {step === 1 && (
             <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Account Setup</h2>
                <p style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>Enter your basic details to start your 30-day free trial.</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                   <Input label="FULL NAME" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => setForm({...form, name: e.target.value})} error={errors.name} />
                   <Input label="WORK EMAIL" type="email" placeholder="ramesh@dealership.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} error={errors.email} />
                   <Input label="PASSWORD" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} error={errors.password} />
                   <Input label="MOBILE NUMBER" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} error={errors.phone} maxLength={10} />
                   
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                         <label style={{ fontSize: 11, fontWeight: 800, color: C.ink3, marginBottom: 8, display: "block" }}>STATE</label>
                         <select value={form.state} onChange={e => setForm({...form, state: e.target.value, district: DISTRICTS[e.target.value][0]})} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 13, background: "#fff" }}>
                            {Object.keys(DISTRICTS).map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </div>
                      <div>
                         <label style={{ fontSize: 11, fontWeight: 800, color: C.ink3, marginBottom: 8, display: "block" }}>DISTRICT</label>
                         <select value={form.district} onChange={e => setForm({...form, district: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, outline: "none", fontSize: 13, background: "#fff" }}>
                            {DISTRICTS[form.state]?.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                      </div>
                   </div>

                   <Btn onClick={handleNext} style={{ width: "100%", marginTop: 12, background: "#1B4332" }}>Next: Business Details ➔</Btn>
                </div>
             </div>
           )}

           {step === 2 && (
             <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Business Verification</h2>
                <p style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>Verify your dealership to unlock the verified badge.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                   <Input label="LEGAL BUSINESS NAME" placeholder="e.g. SRM EV Motors PVT LTD" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} error={errors.businessName} />
                   <Input label="GSTIN (OPTIONAL)" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} error={errors.gstin} hint="Required for verified badge" />
                   
                   <div>
                      <label style={{ fontSize: 11, fontWeight: 800, color: C.ink3, marginBottom: 12, display: "block" }}>BRANDS YOU SELL</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                         {EV_BRANDS.map(b => (
                           <button key={b} onClick={() => toggleBrand(b)} style={{ 
                             padding: "6px 12px", borderRadius: 10, 
                             border: `1.5px solid ${form.brands.includes(b) ? "#1B4332" : C.border}`,
                             background: form.brands.includes(b) ? "#E8F5E9" : "none",
                             color: form.brands.includes(b) ? "#1B4332" : C.ink2,
                             fontSize: 11, fontWeight: 700, cursor: "pointer"
                           }}>
                             {b}
                           </button>
                         ))}
                      </div>
                   </div>

                   <Input label="OFFICE ADDRESS" placeholder="Full address in your district" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />

                   <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <Btn variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</Btn>
                      <Btn onClick={handleNext} style={{ flex: 2, background: "#1B4332" }}>Preview Profile ➔</Btn>
                   </div>
                </div>
             </div>
           )}

           {step === 3 && (
             <div style={{ animation: "evcrm-fade-in 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Preview Your Profile</h2>
                <p style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>This is how your dealership will appear to local consumers.</p>

                <Card noPad style={{ marginBottom: 32, border: `2px solid ${C.green}` }}>
                   <div style={{ padding: 20, background: "#E8F5E9", borderBottom: `1px solid ${C.green}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: 16, fontWeight: 900, color: "#1B4332" }}>{form.businessName || "Your Dealership"}</h4>
                      <Tag label="VERIFIED ✓" color={C.green} bg="#fff" dot />
                   </div>
                   <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 12, color: C.ink3, marginBottom: 8 }}>📍 {form.address || "Address will appear here"}</div>
                      <div style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>🏡 {form.district}, {form.state}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {form.brands.slice(0, 3).map(b => <Tag key={b} label={b} color={C.blue} bg={C.blueL} />)}
                        {form.brands.length > 3 && <Tag label={`+${form.brands.length - 3} more`} color={C.ink3} bg={C.bg} />}
                      </div>
                   </div>
                </Card>

                <div style={{ background: "#FEF9C3", padding: 20, borderRadius: 16, border: "1px dashed #EAB308", marginBottom: 32 }}>
                   <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 24 }}>📦</div>
                      <div>
                         <div style={{ fontSize: 13, fontWeight: 800, color: "#854D0E" }}>One-Click Provisioning</div>
                         <div style={{ fontSize: 11, color: "#854D0E", opacity: 0.8, lineHeight: 1.4 }}>
                            By confirming, we'll automatically set up your Google Sheets CRM and Dealer Dashboard.
                         </div>
                      </div>
                   </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                   <Btn variant="secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</Btn>
                   <Btn onClick={handleSubmit} loading={loading} style={{ flex: 2, background: C.green, color: "#fff" }}>Launch My Dashboard</Btn>
                </div>

                {errors.global && <p style={{ textAlign: "center", color: "red", fontSize: 12, marginTop: 16 }}>{errors.global}</p>}
             </div>
           )}
        </Card>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.ink3 }}>
           By registering, you agree to our Terms of Service.<br/>© 2026 evcrm.in · Secure Dealer Onboarding
        </p>

      </div>
    </div>
  )
}
