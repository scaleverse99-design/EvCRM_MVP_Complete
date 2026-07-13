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
    setLoading(true)
    try {
      const { getToken } = await import("../../lib/token-storage")
      const token = getToken()
      const url = user?.dealership ? `/api/dealer/leads?dealership=${user.dealership}` : "/api/dealer/leads"
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setLeads(data.leads || [])
      }
    } catch (err) {
      console.error("[Leads Fetch Error]:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadLeads()
    }
  }, [user])

  useEffect(() => {
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId)
      setSelectedLead(lead || null)
    } else {
      setSelectedLead(null)
    }
  }, [leadId, leads])

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { getToken } = await import("../../lib/token-storage")
      const token = getToken()
      const res = await fetch("/api/dealer/leads", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          status: newStatus
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`✅ Lead updated to ${newStatus}`)
        loadLeads()
      } else {
        showToast(`❌ ${data.error || "Update failed"}`)
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

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <a href={`tel:+${(selectedLead.phone || "").replace(/\D/g, "").length === 10 ? "91" + (selectedLead.phone || "").replace(/\D/g, "") : (selectedLead.phone || "").replace(/\D/g, "")}`}
                style={{ flex: 1, textDecoration: "none", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", background: "#2563EB15", border: "1px solid #2563EB40", color: "#2563EB", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                📞 CALL
              </a>
              <a href={`https://wa.me/${(selectedLead.phone || "").replace(/\D/g, "").length === 10 ? "91" + (selectedLead.phone || "").replace(/\D/g, "") : (selectedLead.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent("Hi " + selectedLead.name + ", following up on your EV showroom inquiry.")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, textDecoration: "none", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", background: "#16A34A15", border: "1px solid #16A34A40", color: "#16A34A", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                💬 WHATSAPP
              </a>
              {selectedLead.email ? (
                <a href={`mailto:${selectedLead.email}?subject=${encodeURIComponent("Following up on your EV inquiry")}`}
                  style={{ flex: 1, textDecoration: "none", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", background: "#EA580C15", border: "1px solid #EA580C40", color: "#EA580C", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                  ✉ EMAIL
                </a>
              ) : null}
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
              <p style={{ fontSize: 12, color: C.ink3 }}>{leads.length} active leads from database</p>
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
                  {leads.filter(l => l.status === status).map(lead => {
                    const digits = (lead.phone || "").replace(/\D/g, "")
                    const phoneDigits = digits.length === 10 ? "91" + digits : digits
                    const waLink = `https://wa.me/${phoneDigits}?text=${encodeURIComponent("Hi " + lead.name + ", following up on your EV showroom inquiry.")}`
                    const callLink = `tel:+${phoneDigits}`
                    const mailLink = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent("Following up on your EV inquiry")}` : null

                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => router.push(`/leads?id=${lead.id}`)}
                        style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10, cursor: "pointer", transition: "transform 0.1s" }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{lead.name}</div>
                        <div style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>{lead.vehicle || "General Inquiry"}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                          <a href={callLink} title={`Call ${lead.phone}`} style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: "#F3F4F6", border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 11 }}>
                            📞
                          </a>
                          <a href={waLink} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: "#F3F4F6", border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 11 }}>
                            💬
                          </a>
                          {mailLink ? (
                            <a href={mailLink} title={`Email ${lead.email}`} style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: "#F3F4F6", border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 11 }}>
                              ✉
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
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
