"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Avatar, StatusPill, Tag, Btn } from "../../components/ui"
import { C } from "../../lib/constants"
import { useAuth } from "../../lib/AuthContext"
import { OpsProxy } from "../../lib/ops-proxy"

const STATUSES = ["NEW", "WARM", "HOT", "COLD", "CLOSED"]
const STATUS_COLORS = {
  NEW: C.blue,
  WARM: C.yellow,
  HOT: C.red,
  COLD: C.orange,
  CLOSED: C.green
}

function LeadsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const leadId = searchParams.get("id")
  
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("kanban")
  const [toast, setToast] = useState("")

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const loadLeads = async () => {
    if (!user?.opsmanager_url) return
    setLoading(true)
    try {
      const data = await OpsProxy.get("leads", user, "ev-crm")
      setLeads(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[Sovereign Sync Error]:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [user?.opsmanager_url])

  useEffect(() => {
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId)
      setSelectedLead(lead || null)
    } else {
      setSelectedLead(null)
    }
  }, [leadId, leads])

  const handleStatusChange = async (id, newStatus) => {
    if (!user?.opsmanager_url) return
    try {
      const res = await OpsProxy.act("UPDATE_RECORD", {
        sheet: "leads",
        id: id,
        updates: { 
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      }, user, "ev-crm")

      if (res.success) {
        showToast(`✅ Lead updated to ${newStatus}`)
        loadLeads()
      }
    } catch (err) {
      showToast("❌ Update failed")
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Synchronizing with Sovereign Rack...</div>

  return (
    <>
      {selectedLead ? (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Btn onClick={() => router.push("/leads")} style={{ marginBottom: 20 }}>← Back to Pipeline</Btn>
          <Card>
            <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
              <Avatar name={selectedLead.name} size={64} color={STATUS_COLORS[selectedLead.status]} />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{selectedLead.name}</h1>
                <p style={{ color: C.ink3, margin: "4px 0" }}>{selectedLead.email} · {selectedLead.phone}</p>
                <StatusPill status={selectedLead.status} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <div style={{ background: C.bg, padding: 15, borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3 }}>VEHICLE INTEREST</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedLead.vehicle || "General Inquiry"}</div>
              </div>
              <div style={{ background: C.bg, padding: 15, borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.ink3 }}>LEAD SOURCE</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedLead.source || "Direct"}</div>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: C.ink3 }}>UPDATE STATUS</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {STATUSES.map(s => (
                  <button 
                    key={s} 
                    onClick={() => handleStatusChange(selectedLead.id, s)}
                    style={{ 
                      flex: 1, 
                      padding: 10, 
                      borderRadius: 8, 
                      border: `1px solid ${selectedLead.status === s ? STATUS_COLORS[s] : C.border}`,
                      background: selectedLead.status === s ? `${STATUS_COLORS[s]}10` : "#fff",
                      color: selectedLead.status === s ? STATUS_COLORS[s] : C.ink2,
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
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Sovereign Pipeline</h1>
              <p style={{ fontSize: 12, color: C.ink3 }}>{leads.length} active leads synchronized from Drive</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setView(view === "kanban" ? "table" : "kanban")} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
                {view === "kanban" ? "Table View" : "Board View"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`, gap: 16, overflowX: "auto" }}>
            {STATUSES.map(status => (
              <div key={status} style={{ minWidth: 260 }}>
                <div style={{ background: STATUS_COLORS[status], padding: "8px 12px", borderRadius: "10px 10px 0 0", color: "#fff", fontSize: 12, fontWeight: 800 }}>
                  {status} ({leads.filter(l => l.status === status).length})
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 12, minHeight: 400 }}>
                  {leads.filter(l => l.status === status).map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => router.push(`/leads?id=${lead.id}`)}
                      style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10, cursor: "pointer", transition: "transform 0.1s" }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{lead.name}</div>
                      <div style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>{lead.vehicle || "General Inquiry"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {toast && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 12, fontWeight: 600, zIndex: 1000 }}>{toast}</div>}
    </>
  )
}

export default function LeadsPage() {
  return (
    <Shell title="Sovereign Pipeline">
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Initializing Sovereign Shell...</div>}>
        <LeadsContent />
      </Suspense>
    </Shell>
  )
}
