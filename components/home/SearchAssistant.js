"use client"
import { useState, useRef, useEffect } from "react"
import { C, fmt } from "../../lib/constants"

const GREETING = "Hi! Tell me what kind of EV you're looking for — budget, range, type, brand, whatever matters to you — and I'll find matches from live inventory."

/** Small result card for a matched vehicle inside the chat, opens the real detail page in a new tab. */
function VehicleResultCard({ v }) {
  return (
    <a href={`/vehicles/${v.id}`} target="_blank" rel="noopener noreferrer"
      style={{ display: "block", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginTop: 8, textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: C.ink3 }}>{v.brand}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{v.model} {v.variant}</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>
            {v.range ? `⚡ ${v.range} km` : ""}{v.range && v.exShowroom ? " · " : ""}{v.exShowroom ? fmt.currency(v.exShowroom) : ""}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.green, whiteSpace: "nowrap" }}>View →</span>
      </div>
    </a>
  )
}

export default function SearchAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: "assistant", text: GREETING, vehicles: [] }])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [ended, setEnded] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const resetChat = () => {
    setMessages([{ role: "assistant", text: GREETING, vehicles: [] }])
    setEnded(false)
    setInput("")
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending || ended) return
    const nextMessages = [...messages, { role: "user", text }]
    setMessages(nextMessages)
    setInput("")
    setSending(true)
    try {
      const res = await fetch("/api/marketplace/search-assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(m => ({ role: m.role, text: m.text })) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMessages(m => [...m, { role: "assistant", text: data.error || "Something went wrong — please try again.", vehicles: [] }])
        return
      }
      setMessages(m => [...m, { role: "assistant", text: data.reply, vehicles: data.vehicles || [] }])
      if (data.done) setEnded(true)
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Network error — please try again.", vehicles: [] }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating toggle */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1200,
          width: 58, height: 58, borderRadius: "50%", border: "none",
          background: C.green, color: "#fff", fontSize: 24, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(5,150,105,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Find your EV — chat with our search assistant">
        {open ? "✕" : "🔍"}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 1199,
          width: 360, maxWidth: "calc(100vw - 32px)", height: 480, maxHeight: "calc(100vh - 140px)",
          background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${C.border}`,
        }}>
          {/* Header */}
          <div style={{ background: C.ink, color: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>🔍 Find My EV</div>
              <div style={{ fontSize: 10.5, opacity: 0.65 }}>{ended ? "Chat ended" : "AI search assistant"}</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#fff", opacity: 0.7, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{
                  background: m.role === "user" ? C.green : "#fff",
                  color: m.role === "user" ? "#fff" : C.ink,
                  border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                  borderRadius: 14, padding: "9px 13px", fontSize: 12.5, lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
                {m.vehicles?.length > 0 && m.vehicles.map(v => <VehicleResultCard key={v.id} v={v} />)}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", fontSize: 11, color: C.ink3, padding: "4px 8px" }}>Searching inventory…</div>
            )}
            {ended && (
              <div style={{ alignSelf: "center", fontSize: 11, color: C.ink3, textAlign: "center", padding: "8px 0" }}>
                Glad you found what you needed! 🎉
                <div>
                  <button onClick={resetChat} style={{ marginTop: 6, background: "none", border: `1px solid ${C.border}`, color: C.ink2, borderRadius: 10, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Start a new search
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {!ended && (
            <div style={{ padding: 10, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, background: "#fff" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="e.g. SUV under 15 lakh, 300+ km range"
                disabled={sending}
                style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 12px", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={send} disabled={sending || !input.trim()}
                style={{ background: sending || !input.trim() ? C.ink3 : C.green, color: "#fff", border: "none", borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 800, cursor: sending || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
