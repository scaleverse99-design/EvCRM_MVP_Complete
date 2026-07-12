import { loadCashfree } from "./cashfreeScript"

/**
 * Books a test drive. If a payment gateway (Cashfree) is configured, collects
 * the ₹1,000 token via Cashfree popup checkout, then verifies server-side and
 * creates the booking. If no gateway is configured (placeholder keys),
 * transparently falls back to a no-payment booking so the flow still works.
 */
export async function bookTestDrive({ vehicleId, name, phone, email, preferredDate, message }) {
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

  const cashfree = await loadCashfree(orderData.mode)

  // Opens the Cashfree checkout as a modal overlay on the current page.
  const result = await cashfree.checkout({
    paymentSessionId: orderData.paymentSessionId,
    redirectTarget: "_modal",
  })

  // User closed the modal without paying.
  if (result?.error) throw new Error(result.error.message || "Payment cancelled")

  // Verify server-side that the order is actually PAID, then create booking.
  const verifyRes = await fetch("/api/marketplace/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderData.orderId, vehicleId, name, phone, email, preferredDate, message }),
  })
  const verifyData = await verifyRes.json()
  if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed")
  return { ...verifyData.booking, viaGateway: true }
}
