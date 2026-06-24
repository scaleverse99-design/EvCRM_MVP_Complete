"use client"
import { useState } from "react"
import { Btn, Input, StatusPill } from "../ui"
import { C } from "../../lib/constants"
import { db } from "../../lib/firebase-client"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getSilentTags } from "../../lib/IntentTracker"

export default function WhatsAppLeadCapture({ vehicle }) {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (phone.length < 10) return alert("Enter a valid WhatsApp number")

    setLoading(true)
    try {
      await addDoc(collection(db, "evcrm_leads"), {
        name: "Anonymous (WhatsApp)",
        phone,
        vehicle,
        source: "seo_expert_pdf",
        status: "NEW",
        score: 78,
        tags: ["intent:pdf_brochure", "channel:whatsapp", ...getSilentTags()],
        notes: `Customer requested On-Road Price PDF for ${vehicle}`,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      })
      setSuccess(true)
    } catch (err) {
      console.error(err)
      alert("Failed to send PDF. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div style={{ background: C.greenL, padding: '16px', borderRadius: 12, border: `1px solid ${C.green}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 20 }}>✅</div>
      <div>
         <div style={{ fontSize: 13, fontWeight: 800, color: C.greenD }}>PDF is on its way!</div>
         <div style={{ fontSize: 10, color: C.greenD, opacity: 0.8 }}>Check your WhatsApp in 2 minutes.</div>
      </div>
    </div>
  )

  return (
    <Card noPad style={{ background: '#F0FDFA', border: `1px solid ${C.green}40`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Get Local On-Road Price PDF</div>
         </div>
         <div style={{ animation: 'evcrm-pulse 2s infinite' }}>
            <StatusPill status="HOT" />
         </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
         <div style={{ flex: 1 }}>
            <Input 
              placeholder="Enter WhatsApp Number" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              maxLength={10}
              style={{ marginBottom: 0 }}
            />
         </div>
         <Btn loading={loading} style={{ background: C.greenD, height: 42 }}>
           Send Me PDF
         </Btn>
      </form>
      <div style={{ background: '#E6FFFA', padding: '8px 20px', fontSize: 9, color: C.ink3, textAlign: 'center' }}>
         Includes RTO, Insurance, and FAME-II subsidy breakdown.
      </div>
    </Card>
  )
}
