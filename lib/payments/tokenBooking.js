let scriptPromise = null
function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Client only"))
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = resolve
    s.onerror = () => reject(new Error("Failed to load Razorpay checkout"))
    document.body.appendChild(s)
  })
  return scriptPromise
}

/**
 * Books a test drive. If Razorpay is configured, collects the ₹1,000
 * token via Razorpay Checkout (held, not captured, until the dealer
 * confirms the sale). If Razorpay isn't configured yet (placeholder keys),
 * transparently falls back to a no-payment booking so the demo still works.
 */
export async function bookTestDrive({ vehicleId, name, phone, email, preferredDate, message }) {
  const orderRes = await fetch("/api/marketplace/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId }),
  })
  const orderData = await orderRes.json()

  if (!orderRes.ok) {
    if (orderData.code === "RAZORPAY_NOT_CONFIGURED") {
      const res = await fetch("/api/marketplace/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, name, phone, email, preferredDate, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Booking failed")
      return { ...data.booking, viaGateway: false }
    }
    throw new Error(orderData.error || "Could not start payment")
  }

  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: orderData.keyId,
      order_id: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "EV.CRM",
      description: `₹1,000 token — ${orderData.vehicleName}`,
      prefill: { name, email, contact: phone },
      theme: { color: "#00c896" },
      handler: async (response) => {
        try {
          const verifyRes = await fetch("/api/marketplace/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              vehicleId, name, phone, email, preferredDate, message,
            }),
          })
          const verifyData = await verifyRes.json()
          if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed")
          resolve({ ...verifyData.booking, viaGateway: true })
        } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    })
    rzp.on("payment.failed", (resp) => reject(new Error(resp.error?.description || "Payment failed")))
    rzp.open()
  })
}
