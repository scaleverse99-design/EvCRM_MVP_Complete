"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, Input, Avatar, StatusPill, Toggle, Modal } from "../../components/ui"
import { C } from "../../lib/constants"
import { authFetch } from "../../lib/token-storage"

export default function TeamPage() {
  const router = useRouter()
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRep, setSelectedRep] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRep, setNewRep] = useState({ name: "", email: "", phone: "", password: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Uses the same /api/dealer/reps endpoint as the dashboard's Team card so
  // reps created here are properly linked (rep record + scoped login).
  const fetchReps = async () => {
    try {
      const res = await authFetch("/api/dealer/reps")
      const data = await res.json()
      if (res.ok) setReps((data.reps || []).map(r => ({ ...r, is_active: r.active })))
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReps()
  }, [])

  const handleToggleActive = async (rep) => {
    if (!rep.hasLogin) return // no login to toggle
    try {
      const res = await authFetch("/api/dealer/reps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rep.id, action: rep.is_active ? "deactivate" : "reactivate" })
      })
      if (res.ok) {
        setReps(reps.map(r => r.id === rep.id ? { ...r, is_active: !rep.is_active } : r))
      }
    } catch(err) {
      console.error("Failed to toggle status")
    }
  }

  const handleCreateRep = async () => {
    setSaving(true)
    setError("")
    try {
      if (!newRep.name.trim()) throw new Error("Full name is required")
      const res = await authFetch("/api/dealer/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRep)
      })
      const data = await res.json()
      // The API returns the reason under `error`; surface it so the dealer
      // sees "That email is already in use" instead of a generic failure.
      if (!res.ok) throw new Error(data.error || data.message || "Failed to create rep")
      setIsModalOpen(false)
      setNewRep({ name: "", email: "", phone: "", password: "" })
      fetchReps()
    } catch(err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell title="Team Management">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 6 }}>Sales Team</h1>
          <p style={{ fontSize: 13, color: C.ink3 }}>Manage your dealership's sales representatives and access controls.</p>
        </div>
        <Btn onClick={() => setIsModalOpen(true)}>+ Add New Rep</Btn>
      </div>

      <Card noPad>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Loading team...</div>
        ) : reps.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>No Sales Reps Found</div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 16 }}>You haven't added any sales representatives yet.</div>
            <Btn onClick={() => setIsModalOpen(true)}>Add Your First Rep</Btn>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "14px 20px" }}>Sales Rep</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Assigned</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Converted</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Conv. %</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>📞 Calls</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>💬 Msgs</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Access</th>
              </tr>
            </thead>
            <tbody>
              {reps.map(rep => (
                <tr key={rep.id} onClick={() => setSelectedRep(rep)}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={rep.name || rep.email} size={36} color={rep.color || C.orange} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{rep.name || "Unknown"} <span style={{ fontSize: 15, color: C.ink3 }}>›</span></div>
                        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                          {rep.hasLogin
                            ? <span style={{ color: rep.is_active ? C.green : C.red, fontWeight: 700 }}>{rep.is_active ? "● Active login" : "● Login disabled"}</span>
                            : "No login"}
                          {rep.email ? ` · ${rep.email}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 14, fontWeight: 800, color: C.ink }}>{rep.leads || 0}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 14, fontWeight: 800, color: C.green }}>{rep.closed || 0}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: (rep.conversionRate||0) >= 25 ? C.green : C.ink2 }}>{rep.conversionRate || 0}%</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: C.ink }}>{rep.calls || 0}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: C.ink }}>{rep.messages || 0}</td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    {rep.hasLogin
                      ? <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: rep.is_active ? C.green : C.ink3 }}>{rep.is_active ? "ON" : "OFF"}</span>
                          <Toggle on={rep.is_active} onChange={() => handleToggleActive(rep)} />
                        </div>
                      : <span style={{ fontSize: 10, color: C.ink3 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Rep performance detail */}
      {selectedRep && (
        <Modal title={`${selectedRep.name} — Performance`} onClose={() => setSelectedRep(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Avatar name={selectedRep.name || selectedRep.email} size={44} color={selectedRep.color || C.orange} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.ink3 }}>{selectedRep.email || "no login"} {selectedRep.phone ? `· ${selectedRep.phone}` : ""}</div>
              <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                {selectedRep.hasLogin ? (selectedRep.is_active ? "Active login" : "Login disabled") : "No login"}
                {selectedRep.lastActivity ? ` · last active ${new Date(selectedRep.lastActivity).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}` : " · no activity yet"}
              </div>
            </div>
          </div>

          {/* Top-line funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
            {[
              ["Assigned", selectedRep.leads || 0, C.ink],
              ["Worked", selectedRep.worked || 0, C.blue],
              ["Converted", selectedRep.closed || 0, C.green],
              ["Conv. rate", `${selectedRep.conversionRate || 0}%`, (selectedRep.conversionRate||0) >= 25 ? C.green : C.ink2],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: C.bg, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 9.5, color: C.ink3, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Contact activity breakdown */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Contact activity</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              ["📞", "Calls", selectedRep.actions?.call || 0],
              ["💬", "WhatsApp", selectedRep.actions?.whatsapp || 0],
              ["📱", "SMS", selectedRep.actions?.sms || 0],
              ["✉️", "Email", selectedRep.actions?.email || 0],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginTop: 2 }}>{val}</div>
                <div style={{ fontSize: 9, color: C.ink3 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.6, background: C.bg, borderRadius: 8, padding: "8px 12px" }}>
            {selectedRep.worked || 0} of {selectedRep.leads || 0} assigned leads worked ·{" "}
            {(selectedRep.calls || 0) + (selectedRep.messages || 0)} total outreach actions logged.
            {selectedRep.covers?.length ? ` Currently covering ${selectedRep.covers.length} teammate${selectedRep.covers.length>1?"s":""}' leads.` : ""}
          </div>
        </Modal>
      )}

      {isModalOpen && (
        <Modal title="Add New Sales Rep" onClose={() => !saving && setIsModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Input label="Full Name" value={newRep.name} onChange={e => setNewRep({...newRep, name: e.target.value})} placeholder="Ex. Priya Singh" />
            <Input label="Email Address" value={newRep.email} onChange={e => setNewRep({...newRep, email: e.target.value})} placeholder="priya@dealership.com" />
            <Input label="Phone Number" value={newRep.phone} onChange={e => setNewRep({...newRep, phone: e.target.value})} placeholder="+91 90000 00000" />
            <Input label="Temporary Password" type="password" value={newRep.password} onChange={e => setNewRep({...newRep, password: e.target.value})} placeholder="Min 6 characters" />
            
            {error && <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginTop: 4 }}>{error}</div>}
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <Btn variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Btn>
              <Btn onClick={handleCreateRep} loading={saving}>Create Rep Account</Btn>
            </div>
          </div>
        </Modal>
      )}

    </Shell>
  )
}
