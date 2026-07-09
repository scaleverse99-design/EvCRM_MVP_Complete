let scriptPromise = null
export function loadRazorpayScript() {
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
