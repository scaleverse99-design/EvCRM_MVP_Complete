"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, Input, Avatar } from "../../components/ui"
import { C } from "../../lib/constants"
import { authFetch, clearToken } from "../../lib/token-storage"
import { db } from "../../lib/firebase-client"
import { doc, getDoc, updateDoc } from "firebase/firestore"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ name: "", phone: "", dealership: "", location: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    const checkAuth = async (attempt = 1) => {
      try {
        const res = await authFetch("/api/auth/me")
        const d = await res.json()
        if (cancelled) return
        if (!d.success || !d.user) {
          if (attempt < 3) { setTimeout(() => checkAuth(attempt + 1), 1500); return }
          clearToken()
          router.push("/login"); return
        }
        setUser(d.user)
        try {
          const { doc, getDoc } = await import("firebase/firestore")
          const { db } = await import("../../lib/firebase-client")
          const docRef = doc(db, "evcrm_users", d.user.id)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            setProfile({ name: data.name||"", phone: data.phone||"", dealership: data.dealership||"", location: data.location||"" })
          }
        } catch(err) { console.error("Profile load error:", err) }
        finally { setLoading(false) }
      } catch {
        if (cancelled) return
        if (attempt < 3) { setTimeout(() => checkAuth(attempt + 1), 1500) }
        else {
          clearToken()
          router.push("/login")
        }
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [router])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage("")
    try {
      const docRef = doc(db, "evcrm_users", user.id)
      await updateDoc(docRef, {
        name: profile.name,
        phone: profile.phone,
        ...(user.role === "dealer" ? { dealership: profile.dealership, location: profile.location } : {}),
      })
      setMessage("Profile updated successfully!")
    } catch(err) {
      console.error(err)
      setMessage("Error updating profile.")
    }
    setSaving(false)
  }

  if (loading) return (
    <Shell title="Profile & Settings">
      <div style={{ padding: 40, textAlign: "center", color: C.ink3 }}>Loading profile...</div>
    </Shell>
  )

  const isDealer = user.role === "dealer" || user.role === "superadmin"

  return (
    <Shell title="Profile & Settings">
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 6 }}>My Profile</h1>
          <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>
            Update your personal details and manage your account settings here.
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
            <Avatar name={profile.name || user.email} size={64} color={isDealer ? C.green : C.orange} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{profile.name || "Set your name"}</div>
              <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>
                {user.email} • <span style={{ textTransform: "uppercase", fontWeight: 700, color: isDealer ? C.green : C.orange }}>{isDealer ? "Dealer Admin" : "Sales Rep"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Input 
                label="Full Name" 
                value={profile.name} 
                onChange={e => setProfile({...profile, name: e.target.value})} 
                placeholder="Ex. Rahul Sharma" 
              />
            </div>

            <Input 
              label="Phone Number" 
              value={profile.phone} 
              onChange={e => setProfile({...profile, phone: e.target.value})} 
              placeholder="+91 90000 00000" 
            />

            <Input 
              label="Email Address" 
              value={user.email} 
              disabled 
              hint="Email cannot be changed directly." 
            />

            {isDealer && (
              <>
                <div style={{ gridColumn: "1 / -1", height: 1, background: C.border, margin: "8px 0" }} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Dealership Details</div>
                </div>
                
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input 
                    label="Dealership Name" 
                    value={profile.dealership} 
                    onChange={e => setProfile({...profile, dealership: e.target.value})} 
                    placeholder="Ex. Green EV Motors" 
                  />
                </div>
                
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input 
                    label="Dealership Location" 
                    value={profile.location} 
                    onChange={e => setProfile({...profile, location: e.target.value})} 
                    placeholder="Ex. MG Road, Bengaluru" 
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <Btn onClick={handleSave} loading={saving}>Save Changes</Btn>
            {message && (
              <span style={{ fontSize: 12, fontWeight: 700, color: message.includes("success") ? C.greenD : C.red }}>
                {message}
              </span>
            )}
          </div>
        </Card>

        {/* Subscription details for Dealer */}
        {isDealer && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Subscription & Billing</h2>
                <p style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>Manage your Ev.CRM plan.</p>
              </div>
              <div style={{ background: C.greenL, color: C.greenD, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12 }}>ACTIVE</div>
            </div>
            
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, marginBottom: 4 }}>Ev.CRM Pro Plan</div>
                <div style={{ fontSize: 12, color: C.ink2 }}>Your next billing date is Dec 1, 2026.</div>
              </div>
              <Btn variant="secondary">Manage Billing</Btn>
            </div>
          </Card>
        )}

      </div>
    </Shell>
  )
}
