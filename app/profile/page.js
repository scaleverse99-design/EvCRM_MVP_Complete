"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { Card, Btn, Input, Avatar } from "../../components/ui"
import { C } from "../../lib/constants"
import { authFetch, clearToken } from "../../lib/token-storage"
import { getBillingState, MONTHLY_PRICE_INR } from "../../lib/billing"
import { loadRazorpayScript } from "../../lib/payments/razorpayScript"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ name: "", phone: "", dealership: "", location: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
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
          const profileRes = await authFetch("/api/profile")
          const profileData = await profileRes.json()
          if (profileData.success) {
            setProfile(profileData.profile)
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
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          dealership: profile.dealership,
          location: profile.location,
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage("Profile updated successfully!")
      } else {
        setMessage(data.error || "Error updating profile.")
      }
    } catch(err) {
      console.error(err)
      setMessage("Error updating profile.")
    }
    setSaving(false)
  }

  const handleManageBilling = async () => {
    if (!user) return
    setBillingLoading(true)
    try {
      let subscriptionId = user.razorpaySubscriptionId
      let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      const isAuthorized = user.mandateStatus === "authorized"

      // If no subscription exists yet, or if it is not yet authorized, create a fresh one!
      if (!subscriptionId || !isAuthorized) {
        const res = await authFetch("/api/dealer/billing/create-subscription", {
          method: "POST",
          body: JSON.stringify({
            dealerId: user.id,
            dealerName: profile.name || user.name,
            dealerEmail: user.email,
            dealerPhone: profile.phone || user.phone,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to initialize billing")
        subscriptionId = data.subscriptionId
        keyId = data.keyId
      }

      await loadRazorpayScript()
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "Ev.CRM",
        description: `₹${MONTHLY_PRICE_INR}/month — subscription billing`,
        prefill: { name: profile.name || user.name, email: user.email, contact: profile.phone || user.phone },
        theme: { color: C.green },
        subscription_card_change: isAuthorized ? 1 : 0,
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert(err.message || "Failed to load billing portal.")
    } finally {
      setBillingLoading(false)
    }
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
        {isDealer && user && (() => {
          const billingInfo = getBillingState(user)
          const stateColors = {
            active: { bg: C.greenL, text: C.greenD, label: "ACTIVE" },
            past_due: { bg: "#FEE2E2", text: "#B91C1C", label: "PAST DUE" },
            trial: { bg: "#EDE9FE", text: "#6D28D9", label: "FREE TRIAL" },
            trial_expired: { bg: "#FEE2E2", text: "#B91C1C", label: "EXPIRED" },
            cancelled: { bg: "#F3F4F6", text: "#374151", label: "CANCELLED" },
          }
          const theme = stateColors[billingInfo.state] || { bg: C.bg, text: C.ink3, label: billingInfo.state?.toUpperCase() }
          
          return (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Subscription & Billing</h2>
                  <p style={{ fontSize: 12, color: C.ink3, marginBottom: 16 }}>Manage your Ev.CRM plan.</p>
                </div>
                <div style={{ background: theme.bg, color: theme.text, fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12 }}>
                  {theme.label}
                </div>
              </div>
              
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, marginBottom: 4 }}>Ev.CRM Pro Plan</div>
                  <div style={{ fontSize: 12, color: C.ink2 }}>{billingInfo.message}</div>
                </div>
                <Btn variant="secondary" onClick={handleManageBilling} loading={billingLoading}>Manage Billing</Btn>
              </div>
            </Card>
          )
        })()}

      </div>
    </Shell>
  )
}
