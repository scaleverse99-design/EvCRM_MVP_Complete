"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { C } from "../../lib/constants"

// Search bar for the Knowledge Hub / Blog: checks existing content first,
// generates a brand-new answer on the spot (~10-20s) if nothing already
// covers the question, then navigates straight to it. The generated article
// is saved permanently, so the next visitor asking something similar gets
// it back instantly instead of triggering another generation.
export default function KnowledgeSearchBar({ placeholder = "Ask anything about EVs, cars, or buying a vehicle…" }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)

    let location = null
    try {
      const cached = localStorage.getItem("evcrm_user_location")
      if (cached) location = JSON.parse(cached)
    } catch { /* ignore malformed cache */ }

    try {
      const res = await fetch("/api/learn/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, location }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong")
      router.push(`/${data.type}/${data.slug}`)
    } catch (err) {
      setError(err.message || "Couldn't find an answer right now — try rephrasing your question.")
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, background: "#fff", border: `1.5px solid ${loading ? C.green : C.border}`, borderRadius: 16, padding: 6 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: C.ink }}
        />
        <button type="submit" disabled={loading || !query.trim()}
          style={{ background: loading ? C.ink3 : C.green, color: "#fff", border: "none", borderRadius: 10, padding: "0 20px", fontSize: 13, fontWeight: 800, cursor: loading ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {loading ? "Researching…" : "Ask →"}
        </button>
      </form>
      {loading && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.ink3, marginTop: 8 }}>
          Checking what we already know, or writing you a fresh answer if this is new — a few seconds…
        </div>
      )}
      {error && (
        <div style={{ textAlign: "center", fontSize: 12, color: C.red, marginTop: 8 }}>{error}</div>
      )}
    </div>
  )
}
