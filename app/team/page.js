"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, Input, Avatar, StatusPill, Toggle, Modal } from "../../components/ui"
import { C } from "../../lib/constants"

export default function TeamPage() {
  const router = useRouter()
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRep, setSelectedRep] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRep, setNewRep] = useState({ name: "", email: "", phone: "", password: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchReps = async () => {
    try {
      const res = await fetch("/api/admin/users?role=rep")
      const data = await res.json()
      if (res.ok) setReps(data.users || [])
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
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rep.id, is_active: !rep.is_active })
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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRep, role: "rep" })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create rep")
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
                <th style={{ padding: "14px 20px" }}>Contact</th>
                <th style={{ padding: "14px 20px" }}>Joined</th>
                <th style={{ padding: "14px 20px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reps.map(rep => (
                <tr key={rep.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={rep.name || rep.email} size={36} color={C.orange} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{rep.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>ID: {rep.id.slice(0,6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 12, color: C.ink }}>{rep.email}</div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{rep.phone || "No phone"}</div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 12, color: C.ink }}>
                      {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : "Unknown"}
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <StatusPill status={rep.is_active ? "CLOSED" : "COLD"} />
                    <div style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>{rep.is_active ? "Active" : "Inactive"}</div>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: rep.is_active ? C.green : C.ink3 }}>
                        {rep.is_active ? "Access ON" : "Access OFF"}
                      </span>
                      <Toggle on={rep.is_active} onChange={() => handleToggleActive(rep)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

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
