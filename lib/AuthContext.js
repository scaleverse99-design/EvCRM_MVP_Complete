"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { authFetch, clearToken } from "./token-storage"
import { useRouter } from "next/navigation"

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: () => {},
  refresh: () => {}
})

// Public consumer-marketplace routes — no login required to browse/book.
// Anything not listed here bounces a logged-out visitor to /login, so every
// customer-facing page (showroom, mygarage, content pages) must be included.
const PUBLIC_PATH_PREFIXES = [
  "/login", "/register",
  "/showroom", "/buy-vehicles", "/vehicles/",
  "/mygarage", "/service-centers", "/charging",
  "/subsidies", "/news", "/blog", "/best-ev", "/pulse", "/search",
]
const isPublicPath = (path) => path === "/" || PUBLIC_PATH_PREFIXES.some(p => path === p || path.startsWith(p))

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkAuth = async (attempt = 1) => {
    try {
      const res = await authFetch("/api/auth/me")
      
      if (res.ok) {
        const d = await res.json()
        if (d.success && d.user) {
          setUser(d.user)
          setLoading(false)
          return
        }
      }

      // 🛑 IMMEDIATELY fail on 401 (Unauthorized). Do not retry.
      if (res.status === 401) {
        console.warn("[AuthContext] Session expired or invalid. Redirecting...")
        setUser(null)
        setLoading(false)
        clearToken()
        if (typeof window !== "undefined") {
          const path = window.location.pathname
          if (!isPublicPath(path)) {
            router.replace("/login")
          }
        }
        return
      }

      // Retry logic for other errors (Production Cold Starts)
      if (attempt < 3) {
        console.warn(`[AuthContext] Identity check trial ${attempt} failed. Retrying in 1s...`)
        setTimeout(() => checkAuth(attempt + 1), 1000)
      } else {
        setUser(null)
        setLoading(false)
      }
    } catch {
      if (attempt < 5) {
        setTimeout(() => checkAuth(attempt + 1), 2000)
      } else {
        setUser(null)
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const logout = () => {
    authFetch("/api/auth/logout", { method: "POST" }).finally(() => {
      clearToken()
      setUser(null)
      router.push("/login")
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
