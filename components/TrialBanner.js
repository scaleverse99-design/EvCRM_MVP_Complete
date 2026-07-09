"use client"
import { useState } from "react"
import { C } from "../lib/constants"
import { getBillingState, MONTHLY_PRICE_INR } from "../lib/billing"
import { authFetch } from "../lib/token-storage"
import { loadRazorpayScript } from "../lib/payments/razorpayScript"

// Drop <TrialBanner dealer={user} /> near the top of the dealer dashboard
// so trial/billing status is always visible.
export default function TrialBanner({ dealer }) {
  const [loading, setLoading] = useState(false)
  const { state, daysLeft, message } = getBillingState(dealer)

  if (state === "active") return null // no banner once fully paid + active

  const urgent = state === "trial_expired" || state === "past_due" || (state === "trial" && daysLeft <= 5)
  const color  = urgent ? C.red : C.green
  const showButton = state !== "trial_expired" || dealer.mandateStatus !== "authorized"

  const handleAddPaymentMethod = async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/dealer/billing/create-subscription", {
        method: "POST",
        body: JSON.stringify({
          dealerId: dealer.id,
          dealerName: dealer.name,
          dealerEmail: dealer.email,
          dealerPhone: dealer.phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start checkout")

      await loadRazorpayScript()
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Ev.CRM",
        description: `₹${MONTHLY_PRICE_INR}/month — starts after your free trial`,
        prefill: { name: dealer.name, email: dealer.email, contact: dealer.phone },
        theme: { color: C.green },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert(err.message || "Something went wrong starting checkout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background:`${color}10`, border:`1px solid ${color}25`, borderRadius:10,
      padding:"10px 16px", marginBottom:20,
      display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
    }}>
      <span style={{ fontSize:12, fontWeight:600, color }}>{message}</span>
      {showButton && (
        <button onClick={handleAddPaymentMethod} disabled={loading}
          style={{
            flexShrink:0, background:color, color:"#fff", border:"none", borderRadius:8,
            padding:"7px 16px", fontSize:12, fontWeight:700, cursor: loading?"not-allowed":"pointer",
            fontFamily:"inherit", opacity: loading?0.7:1,
          }}>
          {loading ? "Loading…" : "Add payment method"}
        </button>
      )}
    </div>
  )
}
