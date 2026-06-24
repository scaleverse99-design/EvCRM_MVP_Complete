"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Shell from "../../../components/layout/Shell"
import { Card, Avatar, StatusPill, Btn } from "../../../components/ui"
import { C } from "../../../lib/constants"
import { useAuth } from "../../../lib/AuthContext"
import { OpsProxy } from "../../../lib/ops-proxy"

const STATUSES = ["NEW", "WARM", "HOT", "COLD", "CLOSED"]
const STATUS_COLORS = {
  NEW: C.blue,
  WARM: C.yellow,
  HOT: C.red,
  COLD: C.orange,
  CLOSED: C.green
}

export default function LeadDetailEngine() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  useEffect(() => {
    const loadLead = async () => {
      if (!user?.opsmanager_url || !id) return
      setLoading(true)
      try {
        const leads = await OpsProxy.get("leads", user, "ev-crm")
        const found = leads.find(l => l.id === id)
        setLead(found || null)
      } catch (err) {
        console.error("[Sovereign Sync Error]:", err)
      } finally {
        setLoading(false)
      }
    }
    loadLead()
  }, [id, user?.opsmanager_url])

  const handleStatusChange = async (newStatus) => {
    if (!user?.opsmanager_url || !lead) return
    try {
      const res = await OpsProxy.act("UPDATE_RECORD", {
        sheet: "leads",
        id: lead.id,
        updates: { 
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      }, user, "ev-crm")

      if (res.success) {
        showToast(`✅ Lead updated to ${newStatus}`)
        setLead({ ...lead, status: newStatus })
      }
    } catch (err) {
      showToast("❌ Update failed")
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Synchronizing with Sovereign Rack...</div>
  if (!lead) return <div style={{ padding: 40, textAlign: "center" }}>Lead not found in your Drive.</div>

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Btn onClick={() => router.push("/leads")} style={{ marginBottom: 20 }}>← Back to Pipeline</Btn>
      <Card>
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <Avatar name={lead.name} size={64} color={STATUS_COLORS[lead.status]} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{lead.name}</h1>
            <p style={{ color: C.ink3, margin: "4px 0" }}>{lead.email} · {lead.phone}</p>
            <StatusPill status={lead.status} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
          <div style={{ background: C.bg, padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3 }}>VEHICLE INTEREST</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.vehicle || "General Inquiry"}</div>
          </div>
          <div style={{ background: C.bg, padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3 }}>LEAD SOURCE</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{lead.source || "Direct"}</div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: C.ink3 }}>UPDATE STATUS</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {STATUSES.map(s => (
              <button 
                key={s} 
                onClick={() => handleStatusChange(s)}
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  borderRadius: 8, 
                  border: `1px solid ${lead.status === s ? STATUS_COLORS[s] : C.border}`,
                  background: lead.status === s ? `${STATUS_COLORS[s]}10` : "#fff",
                  color: lead.status === s ? STATUS_COLORS[s] : C.ink2,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>
      {toast && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 12, fontWeight: 600, zIndex: 1000 }}>{toast}</div>}
    </div>
  )
}
