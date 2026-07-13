import { loadRazorpayScript } from "./razorpayScript"

/**
 * Books a test drive. If a payment gateway (Razorpay) is configured, collects
 * the ₹1,000 token via Razorpay popup checkout, then verifies server-side and
 * creates the booking. If no gateway is configured (placeholder keys),
 * transparently falls back to a no-payment booking so the flow still works.
 */
export async function bookTestDrive({ vehicleId, name, phone, email, preferredDate, message, payToken = true }) {
  if (!payToken) {
    const res = await fetch("/api/marketplace/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, name, phone, email, preferredDate, message }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Booking failed")
    return { ...data.booking, viaGateway: false }
  }

  const orderRes = await fetch("/api/marketplace/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId, name, phone, email }),
  })
  const orderData = await orderRes.json()

  if (!orderRes.ok) {
    if (orderData.code === "PG_NOT_CONFIGURED") {
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

  // Load Razorpay checkout script
  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const options = {
      key: orderData.keyId,
      amount: orderData.amountPaise,
      currency: "INR",
      name: "Ev.CRM",
      description: `Token booking for ${orderData.vehicleName}`,
      order_id: orderData.orderId,
      handler: async function (response) {
        try {
          const verifyRes = await fetch("/api/marketplace/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              vehicleId,
              name,
              phone,
              email,
              preferredDate,
              message,
            }),
          })
          const verifyData = await verifyRes.json()
          if (!verifyRes.ok) {
            reject(new Error(verifyData.error || "Payment verification failed"))
          } else {
            resolve({ ...verifyData.booking, viaGateway: true })
          }
        } catch (err) {
          reject(err)
        }
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled by user"))
        },
      },
      prefill: {
        name,
        email,
        contact: phone,
      },
      theme: {
        color: "#059669",
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  })
}
