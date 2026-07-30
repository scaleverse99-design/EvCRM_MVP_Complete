"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../../components/layout/Shell"
import { Card, Input, Btn } from "../../../components/ui"
import { C, SOURCES } from "../../../lib/constants"
import { db } from "../../../lib/firebase-client"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

const VEHICLES = ["Tata Nexon EV Max","Ather 450X Gen 3","Ola S1 Pro","TVS iQube ST","Bajaj Chetak Premium","Okaya Faast F4","Hero Optima CX"]

export default function NewLeadPage() {
  const router = useRouter()
  const [form,  setForm]   = useState({ name:"", phone:"", email:"", vehicle:"", source:"", notes:"" })
  const [errors,setErrors] = useState({})
  const [saving,setSaving] = useState(false)
  const [saved, setSaved]  = useState(false)

  const f = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}))

   const save = async () => {
    const e = {}
    if (!form.name.trim())           e.name    = "Name is required"
    if (form.phone.length < 10)      e.phone   = "Valid 10-digit number required"
    if (!form.vehicle)               e.vehicle = "Select a vehicle"
    if (!form.source)                e.source  = "Select lead source"
    if (Object.keys(e).length) { setErrors(e); return }
    
    setSaving(true)
    try {
      await addDoc(collection(db, "evcrm_leads"), {
        ...form,
        status: "NEW",
        score: Math.floor(Math.random() * 40) + 50, // Mock AI score initially
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      })
      setSaved(true)
    } catch (err) {
      console.error("Save lead error:", err)
      setErrors({ global: "Failed to save lead. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  if (saved) return (
    <Shell title="New Lead">
      <div style={{ maxWidth:480, margin:"60px auto", textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:8 }}>Lead Saved!</h2>
        <p style={{ fontSize:13, color:C.ink3, lineHeight:1.7, marginBottom:28 }}>Added to pipeline. Pulse AI will score it tonight and it may appear in tomorrow's queue if it looks HOT.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <Btn variant="secondary" onClick={()=>{ setSaved(false); setForm({ name:"",phone:"",email:"",vehicle:"",source:"",notes:"" }) }}>+ Add Another</Btn>
          <Btn onClick={()=>router.push("/leads")}>View Pipeline →</Btn>
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell title="New Lead">
      <div style={{ maxWidth:560 }}>
        <button onClick={()=>router.back()} style={{ background:"none",border:"none",color:C.ink3,cursor:"pointer",fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:6 }}>← Back</button>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>New Lead</h1>
        <p style={{ fontSize:12, color:C.ink3, marginBottom:24 }}>Quick entry — target 60 seconds</p>

        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:14, letterSpacing:"0.4px" }}>CUSTOMER DETAILS</p>
          <Input label="CUSTOMER NAME *" placeholder="Full name" icon="👤" value={form.name} onChange={f("name")} error={errors.name} />
          <Input label="PHONE NUMBER *" placeholder="98765 43210" type="tel" icon="📱" value={form.phone} maxLength={10} onChange={e=>setForm(p=>({...p,phone:e.target.value.replace(/\D/g,"")}))} error={errors.phone} />
          <Input label="EMAIL (optional)" placeholder="customer@email.com" type="email" icon="✉" value={form.email} onChange={f("email")} />
        </Card>

        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10, letterSpacing:"0.4px" }}>VEHICLE INTEREST *</p>
          {errors.vehicle && <p style={{ fontSize:10.5, color:C.red, marginBottom:8 }}>{errors.vehicle}</p>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {VEHICLES.map(v=>(
              <button key={v} onClick={()=>setForm(p=>({...p,vehicle:v}))} style={{ background:form.vehicle===v?C.greenL:C.bg, border:`1px solid ${form.vehicle===v?C.green:C.border}`, color:form.vehicle===v?C.greenD:C.ink2, borderRadius:9, padding:"7px 13px", fontSize:11, fontWeight:form.vehicle===v?700:400, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{v}</button>
            ))}
          </div>
        </Card>

        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:10, letterSpacing:"0.4px" }}>LEAD SOURCE *</p>
          {errors.source && <p style={{ fontSize:10.5, color:C.red, marginBottom:8 }}>{errors.source}</p>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {Object.entries(SOURCES).map(([id,src])=>(
              <button key={id} onClick={()=>setForm(p=>({...p,source:id}))} style={{ background:form.source===id?`${src.color}15`:C.bg, border:`1px solid ${form.source===id?src.color:C.border}`, color:form.source===id?src.color:C.ink2, borderRadius:9, padding:"7px 13px", fontSize:11, fontWeight:form.source===id?700:400, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{src.icon} {src.label}</button>
            ))}
          </div>
        </Card>

        <Card style={{ marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:8, letterSpacing:"0.4px" }}>INITIAL NOTES</p>
          <textarea value={form.notes} onChange={f("notes")} placeholder="What did the customer say? Interest level, objections, budget... (Hindi/English)" style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.ink, fontSize:12, padding:12, minHeight:80, resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box" }}/>
          <p style={{ fontSize:10, color:C.ink3, marginTop:6 }}>🤖 Pulse AI reads these notes to classify this lead as Hot/Warm/Cold</p>
        </Card>

        <Btn onClick={save} loading={saving} style={{ width:"100%" }}>Save Lead →</Btn>
      </div>
    </Shell>
  )
}
