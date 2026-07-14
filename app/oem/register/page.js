"use client"
import { useState } from "react"
import { Btn, Input, Card } from "../../../components/ui"
import { C } from "../../../lib/constants"
import { saveToken } from "../../../lib/token-storage"

export default function OEMRegisterPage() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", oemName: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const res = await fetch("/api/oem/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.token) saveToken(data.token)
        window.location.assign("/oem")
      } else {
        setErrors(data.errors || { global: data.error || "Registration failed" })
      }
    } catch {
      setErrors({ global: "Network error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: "#1E293B", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏭</div>
            <span style={{ fontSize: 24, fontWeight: 900, color: C.ink }}>EV<span style={{ color: "#8B5CF6" }}>.CRM</span></span>
          </div>
          <p style={{ fontSize: 13, color: C.ink3 }}>OEM Network Console — sponsor dealers, track service escalations</p>
        </div>

        <Card style={{ padding: 40, background: "#fff", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Register Your OEM Network</h2>
          <p style={{ fontSize: 13, color: C.ink3, marginBottom: 24 }}>
            Creates your OEM console and a private network ID. You'll sponsor dealer subscriptions from there to unlock their data.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="MANUFACTURER NAME" placeholder="e.g. Ather Energy" value={form.oemName}
                onChange={e => setForm({ ...form, oemName: e.target.value })} error={errors.oemName}
                hint="Becomes your network ID — dealers you distribute to or sponsor share it" />
              <Input label="YOUR FULL NAME" placeholder="e.g. Priya Nair" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} error={errors.name} />
              <Input label="WORK EMAIL" type="email" placeholder="you@manufacturer.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} error={errors.email} />
              <Input label="PASSWORD" type="password" placeholder="Minimum 8 characters, 1 uppercase, 1 number" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} error={errors.password} />
              <Input label="PHONE (OPTIONAL)" type="tel" placeholder="10-digit mobile" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={10} />

              <Btn type="submit" loading={loading} style={{ width: "100%", marginTop: 8, background: "#1E293B" }}>
                Create OEM Console →
              </Btn>

              {errors.global && <p style={{ textAlign: "center", color: C.red, fontSize: 12 }}>{errors.global}</p>}
            </div>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <a href="/login" style={{ fontSize: 12, color: C.ink3, textDecoration: "none", fontWeight: 600 }}>← Back to sign in</a>
          </div>
        </Card>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.ink3 }}>
          © 2026 EV.CRM · Secure OEM Onboarding
        </p>
      </div>
    </div>
  )
}
