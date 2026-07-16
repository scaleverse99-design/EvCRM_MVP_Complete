"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { C } from "../../../lib/constants"

function VerifyProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    businessName: "",
    ownerName: "",
  })

  const [expiryAt, setExpiryAt] = useState(null)

  useEffect(() => {
    if (!token) {
      setError("Verification link is missing or invalid")
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/dealer/verify-profile?token=${token}`)
        const data = await res.json()

        if (!data.success) {
          setError(data.message || "Failed to load profile")
          setLoading(false)
          return
        }

        setForm(data.user)
        setExpiryAt(new Date(data.expiryAt))
        setError(null)
      } catch (e) {
        setError(`Failed to load profile: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [token])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/dealer/verify-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data: form }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message || "Failed to verify profile")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.replace("/login")
      }, 2000)
    } catch (e) {
      setError(`Failed to verify profile: ${e.message}`)
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
  }

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 800,
    color: C.ink3,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  }

  const containerStyle = {
    maxWidth: 600,
    margin: "0 auto",
    padding: "40px 24px",
  }

  const cardStyle = {
    background: "#fff",
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", color: C.ink3 }}>Loading your profile...</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Profile Verified!</div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 20 }}>
              Your account is now active. Redirecting you to login...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: C.ink }}>
            Verify Your Ev.CRM Account
          </h1>
          <p style={{ margin: "0", fontSize: 13, color: C.ink3 }}>
            Please verify the details below. If anything is incorrect, you can edit before saving.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: `1px solid ${C.red}40`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: C.red,
            }}
          >
            {error}
          </div>
        )}

        {expiryAt && (
          <div
            style={{
              background: "#FEF3C7",
              border: "1px solid #FBBF24",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 12,
              color: "#78350F",
            }}
          >
            ⚠️ This link expires on {expiryAt.toLocaleString("en-IN")}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={e => handleChange("businessName", e.target.value)}
              style={inputStyle}
              placeholder="e.g. Raj Motors Pvt Ltd"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email (Read-only)</label>
            <input
              type="email"
              value={form.email}
              disabled
              style={{ ...inputStyle, background: "#F9FAFB", color: C.ink3, cursor: "not-allowed" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange("phone", e.target.value)}
                style={inputStyle}
                placeholder="10-digit mobile"
              />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text"
                value={form.city}
                onChange={e => handleChange("city", e.target.value)}
                style={inputStyle}
                placeholder="e.g. Mumbai"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>State</label>
            <input
              type="text"
              value={form.state}
              onChange={e => handleChange("state", e.target.value)}
              style={inputStyle}
              placeholder="e.g. Maharashtra"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Owner Name (Optional)</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={e => handleChange("ownerName", e.target.value)}
              style={inputStyle}
              placeholder="e.g. Raj Kumar"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: "#1E293B",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontSize: 13,
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {submitting ? "Verifying..." : "✓ Verify & Proceed to Login"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#F0FDF4",
            border: `1px solid #059669`,
            borderRadius: 10,
            fontSize: 12,
            color: "#065F46",
          }}
        >
          ✓ After verification, you can log in with your email and create a password at{" "}
          <a href="/login" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
            evcrm.in/login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function VerifyProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px 24px", textAlign: "center", color: "#64748b" }}>Loading...</div>}>
      <VerifyProfileContent />
    </Suspense>
  )
}
