"use client"
import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, Input } from "../../components/ui"
import { C, fmt } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore"

function QuoteProContent() {
  const router   = useRouter()
  const search   = useSearchParams()
  
  // Get data from URL params (from buildprice)
  const [vehicle, setVehicle] = useState(search.get("v") || "Tata Nexon EV Max")
  const [net,     setNet]     = useState(parseInt(search.get("p")) || 1705000)
  
  const [name,   setName]   = useState("Amit Verma")
  const [phone,  setPhone]  = useState("+91 98765 43210")
  const [offer,  setOffer]  = useState("Free home charger installation (worth ₹8,000) + 2 years free service")
  const [sending,setSending]= useState(false)
  const [sent,   setSent]   = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const colRef = collection(db, "evcrm_quotes")
    const q = query(colRef, orderBy("created_at", "desc"), limit(10))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setHistory(list)
    }, (error) => {
      console.error("Firestore history subscription error:", error)
    })
    return () => unsubscribe()
  }, [])

  const emi36   = fmt.emi(net, 36)

  const downloadPDF = () => {
    const params = new URLSearchParams({
      customerName: name,
      phoneNumber: phone,
      vehicle: vehicle,
      exShowroomPrice: 1980000,
      famSubsidy: 150000,
      stateSubsidy: 125000,
      netPrice: net,
      emi: emi36,
      offer: offer,
      dealerName: "Sharma EV Motors",
      dealerCity: "Bangalore",
      dealerPhone: "+91 98765 43210",
      quoteId: `EV-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      validityDays: 7
    })

    const pdfWindow = window.open(`/api/quotes/generate-pdf?${params.toString()}`, '_blank')
    pdfWindow?.print()
  }

  const send = async () => {
    setSending(true)
    try {
      await addDoc(collection(db, "evcrm_quotes"), {
        customer: name,
        phone,
        vehicle,
        price: net,
        offer,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      })
      
      // Also log activity
      await addDoc(collection(db, "evcrm_feed"), {
        label: "QUOTE SENT",
        msg: `Quote sent to ${name} for ${vehicle}`,
        sub: `Value: ${fmt.currency(net)}`,
        color: C.green,
        created_at: new Date().toISOString()
      })
      
      setSent(true)
    } catch (err) {
      console.error("Quote save error:", err)
    } finally {
      setSending(false)
    }
  }

  if (sent) return (
    <div style={{ maxWidth:480, margin:"60px auto", textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:8 }}>Quote Sent!</h2>
      <div style={{ background:C.greenL, border:`1px solid ${C.green}30`, borderRadius:12, padding:16, marginBottom:24, fontSize:12, color:C.greenD, lineHeight:1.8 }}>
        📁 Saved to Google Drive<br/>
        💬 WhatsApp delivered to {name}<br/>
        ◎ Lead status updated in Pulse AI
      </div>
      <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
        <Btn variant="secondary" onClick={() => setSent(false)}>New Quote</Btn>
        <Btn onClick={() => router.push("/leads")}>Back to Leads →</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:20, maxWidth:900 }}>
      {/* Preview */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>QuotePro</h1>
        <p style={{ fontSize:12, color:C.ink3, marginBottom:20 }}>Build branded quote — preview updates live</p>
        {/* Quote preview card */}
        <div style={{ background:"#fff", border:`2px solid ${C.green}30`, borderRadius:16, padding:22, boxShadow:`0 4px 24px rgba(0,0,0,0.08)` }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:18, fontWeight:900, color:C.greenD }}>Ev<span style={{ color:C.ink }}>.CRM</span></div>
              <div style={{ fontSize:9.5, color:C.ink3, marginTop:1 }}>Sharma EV Motors, Bangalore</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.ink3 }}>QUOTE #EV-2847</div>
              <div style={{ fontSize:9.5, color:C.ink3, marginTop:1 }}>Valid: 7 days</div>
            </div>
          </div>
          {/* Customer */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, color:C.ink3, marginBottom:3, letterSpacing:"0.4px" }}>PREPARED FOR</div>
            <div style={{ fontSize:15, fontWeight:800, color:C.ink }}>{name||"—"}</div>
            <div style={{ fontSize:11, color:C.ink3 }}>{phone}</div>
          </div>
          {/* Vehicle */}
          <div style={{ background:C.bg, borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.ink, marginBottom:2 }}>{vehicle}</div>
            <div style={{ fontSize:10, color:C.ink3, marginBottom:10 }}>Empowered Plus · Intensi-Teal</div>
            {[["Ex-showroom Price","₹19,80,000",C.ink],["FAME-II Subsidy","−₹1,50,000",C.green],["Karnataka Incentive","−₹1,25,000",C.green]].map(([k,v,c],i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, color:C.ink3 }}>{k}</span>
                <span style={{ fontSize:11, fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:13, fontWeight:800, color:C.ink }}>Net Price</span>
              <span style={{ fontSize:18, fontWeight:900, color:C.greenD }}>{fmt.currency(net)}</span>
            </div>
            <div style={{ marginTop:4, fontSize:11, color:C.ink3 }}>EMI from ₹{emi36.toLocaleString("en-IN")}/month (36 months)</div>
          </div>
          {/* Offer */}
          {offer && (
            <div style={{ background:C.greenL, borderRadius:9, padding:12, border:`1px solid ${C.green}25`, marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.greenD, marginBottom:4, letterSpacing:"0.4px" }}>SPECIAL OFFER</div>
              <div style={{ fontSize:11, color:C.ink, lineHeight:1.5 }}>{offer}</div>
            </div>
          )}
          <div style={{ textAlign:"center", fontSize:9.5, color:C.ink3 }}>Prepared by Rahul Sharma · Sharma EV Motors · +91 98765 43210</div>
        </div>

        {/* Previously Shared Quotes List */}
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginTop:20 }}>
          <h3 style={{ fontSize:12, fontWeight:800, color:C.ink, marginBottom:12, display:"flex", alignItems:"center", gap:6, letterSpacing:"0.3px", textTransform:"uppercase" }}>
            📋 Shared Quotes History ({history.length})
          </h3>
          {history.length === 0 ? (
            <div style={{ fontSize:11, color:C.ink3, textAlign:"center", padding:"16px 0" }}>No quotes shared yet. Build one to get started!</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:260, overflowY:"auto", paddingRight:4 }}>
              {history.map((q) => {
                const dateStr = q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "Recently"
                return (
                  <div key={q.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:10, background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:C.ink }}>{q.customer || "Unnamed Customer"}</div>
                      <div style={{ fontSize:10, color:C.ink3, marginTop:1 }}>
                        {q.vehicle} · <strong style={{ color:C.greenD }}>{fmt.currency(q.price)}</strong>
                      </div>
                      <div style={{ fontSize:9, color:C.ink3, marginTop:2 }}>💬 {q.phone}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9.5, color:C.ink3 }}>{dateStr}</div>
                      <button
                        onClick={() => {
                          const lines = [
                            `*Reference Quote*`,
                            `Customer: ${q.customer}`,
                            `Vehicle: ${q.vehicle}`,
                            `Price: ${fmt.currency(q.price)}`,
                            q.offer ? `Special Offer: ${q.offer}` : "",
                          ].filter(Boolean).join("\n")
                          window.open(`https://wa.me/${(q.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(lines)}`, "_blank")
                        }}
                        style={{ background:"#25D366", color:"#fff", border:"none", borderRadius:6, padding:"4px 8px", fontSize:9.5, fontWeight:700, cursor:"pointer", marginTop:4, fontFamily:"inherit" }}>
                        💬 Resend
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div>
        <h2 style={{ fontSize:16, fontWeight:700, color:C.ink, marginBottom:14, opacity:0 }}>_</h2>
        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:12, letterSpacing:"0.4px" }}>CUSTOMER DETAILS</p>
          <Input label="CUSTOMER NAME" value={name} onChange={e=>setName(e.target.value)} icon="👤" />
          <Input label="PHONE NUMBER" value={phone} onChange={e=>setPhone(e.target.value)} icon="📱" />
        </Card>

        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:8, letterSpacing:"0.4px" }}>SPECIAL OFFER / NOTE</p>
          <textarea value={offer} onChange={e=>setOffer(e.target.value)} placeholder="Add special offers, benefits, or dealer notes..."
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, color:C.ink, fontSize:12, padding:12, minHeight:80, resize:"none", outline:"none", fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box" }}
          />
          <p style={{ fontSize:10, color:C.ink3, marginTop:6 }}>This appears as "Special Offer" on the quote PDF</p>
        </Card>

        <Btn onClick={send} loading={sending} style={{ width:"100%", marginBottom:10 }}>💬 Send via WhatsApp</Btn>
        <button onClick={downloadPDF} style={{ width:"100%", background:C.blue, color:"#fff", border:"none", borderRadius:10, padding:12, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>📥 Download PDF</button>
        <button onClick={send} style={{ width:"100%", background:"none", border:`1px solid ${C.blue}40`, color:C.blue, borderRadius:10, padding:12, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📧 Send via Email</button>
        <p style={{ textAlign:"center", marginTop:10, fontSize:10.5, color:C.ink3 }}>📁 Quote PDF auto-saved to dealer's Google Drive</p>

        <div style={{ marginTop:16, background:C.bg, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.ink3, marginBottom:6 }}>VEHICLE SUMMARY</p>
          {[{l:"Range",v:"465km"},{l:"Top Speed",v:"150km/h"},{l:"Charge Time",v:"60 min (DC fast)"},{l:"Warranty",v:"3 years / 1.2L km"}].map((s,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
              <span style={{ fontSize:11, color:C.ink3 }}>{s.l}</span>
              <span style={{ fontSize:11, fontWeight:600, color:C.ink2 }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function QuoteProPage() {
  return (
    <Shell title="QuotePro">
      <Suspense fallback={<div>Loading QuotePro...</div>}>
        <QuoteProContent />
      </Suspense>
    </Shell>
  )
}
