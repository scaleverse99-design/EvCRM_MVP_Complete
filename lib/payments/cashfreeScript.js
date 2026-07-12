let scriptPromise = null

// Loads the Cashfree JS v3 SDK and returns a ready checkout instance.
export function loadCashfree(mode = "sandbox") {
  if (typeof window === "undefined") return Promise.reject(new Error("Client only"))
  const make = () => window.Cashfree({ mode })
  if (window.Cashfree) return Promise.resolve(make())
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = "https://sdk.cashfree.com/js/v3/cashfree.js"
      s.onload = resolve
      s.onerror = () => reject(new Error("Failed to load Cashfree checkout"))
      document.body.appendChild(s)
    })
  }
  return scriptPromise.then(make)
}
