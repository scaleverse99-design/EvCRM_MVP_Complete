// ── Client-side token storage ─────────────────────────────────────
// Firebase Hosting strips Set-Cookie headers from Cloud Function responses,
// so we store the JWT in localStorage and manually attach it to every request.

const TOKEN_KEY = "evcrm_auth_token"
const COOKIE_NAME = "__session"

export function saveToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token)
    // Synchronize to cookie for server-side recognition
    const maxAge = 7 * 24 * 60 * 60 // 7 days
    document.cookie = `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure' : ''}`
  }
}

export function getToken() {
  if (typeof window !== "undefined") {
    // 1. Try local storage (primary; "evcrm_token" is the legacy key older
    //    sessions were logged in under — honour it so they stay signed in)
    const lsToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(COOKIE_NAME)
    if (lsToken) return lsToken
    
    // 2. Fallback to cookie (if localStorage is delayed or cleared)
    const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'))
    if (match) {
      const cookieToken = match[2]
      localStorage.setItem(TOKEN_KEY, cookieToken) // Re-sync back to LS
      return cookieToken
    }
  }
  return null
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
  }
}

// Authenticated fetch — automatically attaches the token
export function authFetch(url, options = {}) {
  const token = getToken()
  // A FormData body must NOT get a manual Content-Type — the browser sets
  // "multipart/form-data; boundary=…" itself. Forcing application/json here
  // corrupted every file upload (server saw unparseable multipart → HTML 400).
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(isFormData ? {} : { "Content-Type": options.headers?.["Content-Type"] || "application/json" }),
    },
  })
}
