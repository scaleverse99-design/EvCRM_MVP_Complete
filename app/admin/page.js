"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Shell from "../../components/layout/Shell"
import { C } from "../../lib/constants"

// ── Primitives ────────────────────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange, error, icon }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", fontSize:10.5, fontWeight:700, color:focused?C.green:C.ink3, marginBottom:4, letterSpacing:"0.3px" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, opacity:0.4, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:C.bg, border:`1.5px solid ${error?C.red:focused?C.green:C.border}`, borderRadius:9, color:C.ink, fontSize:12, padding:`9px 10px 9px ${icon?"34px":"10px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
        />
      </div>
      {error && <p style={{ fontSize:10, color:C.red, marginTop:4 }}>{error}</p>}
    </div>
  )
}

function Avatar({ name, size=36 }) {
  const initials = name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?"
  return <div style={{ width:size, height:size, borderRadius:"50%", background:`${C.orange}20`, border:`1.5px solid ${C.orange}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.32, fontWeight:800, color:C.orange, flexShrink:0 }}>{initials}</div>
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:440, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:C.ink, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.ink3, cursor:"pointer", fontSize:17 }}>✕</button>
        </div>
        <div style={{ padding:"18px 20px" }}>{children}</div>
      </div>
    </div>
  )
}

function StatusBadge({ active }) {
  return (
    <span style={{ background:active?C.greenL:"#FEE2E2", color:active?C.greenD:C.red, fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:16 }}>
      {active?"✓ Active":"✗ Inactive"}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════
//  ADMIN PANEL — Dealer manages their own sales reps
// ════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter()
  const [reps,    setReps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [dealer,  setDealer]  = useState(null)
  const [modal,   setModal]   = useState(null)
  const [selected,setSelected]= useState(null)
  const [toast,   setToast]   = useState("")
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState("")
  const [newRep,  setNewRep]  = useState({ name:"", email:"", password:"", phone:"" })
  const [newErr,  setNewErr]  = useState({})

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000) }

  // ── Load dealer info + their reps ─────────────────────────────
  useEffect(()=>{
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{
      if (!d.success) { router.push("/login"); return }
      if (d.user.role !== "dealer") { router.push("/dealer"); return }
      setDealer(d.user)
      loadReps()
    }).catch(()=>router.push("/login"))
  }, [])

  const loadReps = useCallback(async ()=>{
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/users?role=rep")
      const data = await res.json()
      if (data.success) setReps(data.users||[])
    } catch { showToast("❌ Failed to load team") }
    finally { setLoading(false) }
  }, [])

  // ── Create rep ────────────────────────────────────────────────
  const handleCreate = async () => {
    const e = {}
    if (!newRep.name.trim())    e.name     = "Required"
    if (!newRep.email.trim())   e.email    = "Required"
    else if (!/\S+@\S+\.\S+/.test(newRep.email)) e.email = "Invalid email"
    if (!newRep.password)       e.password = "Required (min 8 chars)"
    else if (newRep.password.length < 8) e.password = "Min 8 characters"
    if (Object.keys(e).length) { setNewErr(e); return }

    setSaving(true)
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          ...newRep,
          role:       "rep",
          dealership: dealer?.dealership||"",
        }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(`❌ ${data.error}`); return }
      showToast(`✅ ${newRep.name.split(" ")[0]} added to your team!`)
      setModal(null)
      setNewRep({ name:"", email:"", password:"", phone:"" })
      setNewErr({})
      loadReps()
    } catch { showToast("❌ Failed to add rep") }
    finally { setSaving(false) }
  }

  // ── Toggle active ─────────────────────────────────────────────
  const handleToggle = async (rep) => {
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ id:rep.id, is_active:!rep.is_active }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(`❌ ${data.error}`); return }
      showToast(`✅ ${rep.name.split(" ")[0]} ${!rep.is_active?"activated":"deactivated"}`)
      setModal(null); setSelected(null)
      loadReps()
    } catch { showToast("❌ Update failed") }
  }

  const filtered = reps.filter(r=>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:    reps.length,
    active:   reps.filter(r=>r.is_active).length,
    inactive: reps.filter(r=>!r.is_active).length,
  }

  return (
    <Shell title="Team Management">

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>My Sales Team</h1>
          <p style={{ fontSize:12, color:C.ink3 }}>
            {dealer?.dealership || "Your dealership"} · Manage your sales reps
          </p>
        </div>
        <button onClick={()=>{ setNewRep({ name:"", email:"", password:"", phone:"" }); setNewErr({}); setModal("create") }}
          style={{ background:C.green, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 2px 10px ${C.green}35`, display:"flex", alignItems:"center", gap:7 }}>
          + Add Sales Rep
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
        {[
          { v:stats.total,    l:"Total Reps",   c:C.blue   },
          { v:stats.active,   l:"Active",        c:C.green  },
          { v:stats.inactive, l:"Inactive",      c:C.orange },
        ].map((s,i)=>(
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px", textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11, color:C.ink3, marginTop:4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:16, maxWidth:340 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:.4 }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
          style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 12px 9px 36px", fontSize:12, outline:"none", fontFamily:"inherit", color:C.ink, boxSizing:"border-box" }}
        />
      </div>

      {/* Reps table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"48px 20px" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", border:`3px solid ${C.green}25`, borderTopColor:C.green, animation:"evcrm-spin .7s linear infinite", margin:"0 auto 12px" }}/>
            <p style={{ fontSize:12, color:C.ink3 }}>Loading your team...</p>
          </div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"52px 20px" }}>
            <div style={{ fontSize:44, marginBottom:14 }}>👥</div>
            <p style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:6 }}>
              {search ? "No reps found" : "No sales reps yet"}
            </p>
            <p style={{ fontSize:12, color:C.ink3, marginBottom:20 }}>
              {search ? "Try a different search" : "Add your first sales rep to get started"}
            </p>
            {!search && (
              <button onClick={()=>{ setNewRep({ name:"", email:"", password:"", phone:"" }); setNewErr({}); setModal("create") }}
                style={{ background:C.green, color:"#fff", border:"none", borderRadius:9, padding:"10px 22px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Add First Rep
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
                {["Sales Rep","Email","Phone","Status","Last Login","Actions"].map(h=>(
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rep,i)=>(
                <tr key={rep.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                >
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Avatar name={rep.name} size={36} />
                      <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{rep.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:12, color:C.ink2 }}>{rep.email}</span></td>
                  <td style={{ padding:"14px 16px" }}><span style={{ fontSize:12, color:C.ink2 }}>{rep.phone||"—"}</span></td>
                  <td style={{ padding:"14px 16px" }}><StatusBadge active={rep.is_active} /></td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{ fontSize:11, color:C.ink3 }}>
                      {rep.last_login ? new Date(rep.last_login).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "Never"}
                    </span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", gap:7 }}>
                      <button onClick={()=>{ setSelected(rep); setModal("toggle") }}
                        style={{ background:rep.is_active?`${C.red}12`:`${C.green}12`, border:`1px solid ${rep.is_active?C.red:C.green}25`, color:rep.is_active?C.red:C.green, borderRadius:7, padding:"5px 12px", fontSize:10.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        {rep.is_active?"Deactivate":"Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── ADD REP MODAL ── */}
      {modal==="create" && (
        <Modal title="Add Sales Rep" onClose={()=>setModal(null)}>
          <div style={{ background:C.greenL, border:`1px solid ${C.green}25`, borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:11.5, color:C.greenD, lineHeight:1.6 }}>
            📧 A welcome email with login credentials will be sent to the rep automatically.
          </div>

          <Field label="FULL NAME" placeholder="Ravi Kumar" icon="👤"
            value={newRep.name} error={newErr.name}
            onChange={e=>{ setNewRep(r=>({...r,name:e.target.value})); setNewErr(er=>({...er,name:""})) }}
          />
          <Field label="EMAIL ADDRESS" type="email" placeholder="ravi@gmail.com" icon="✉️"
            value={newRep.email} error={newErr.email}
            onChange={e=>{ setNewRep(r=>({...r,email:e.target.value})); setNewErr(er=>({...er,email:""})) }}
          />
          <Field label="PHONE NUMBER" placeholder="9999911111" icon="📱"
            value={newRep.phone}
            onChange={e=>setNewRep(r=>({...r,phone:e.target.value.replace(/\D/g,"")}))}
          />
          <Field label="TEMPORARY PASSWORD" type="password" placeholder="Min 8 chars" icon="🔒"
            value={newRep.password} error={newErr.password}
            onChange={e=>{ setNewRep(r=>({...r,password:e.target.value})); setNewErr(er=>({...er,password:""})) }}
          />
          <p style={{ fontSize:10.5, color:C.ink3, marginBottom:18, lineHeight:1.5 }}>
            💡 Tip: Use a simple temporary password. The rep can change it after first login.
          </p>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setModal(null)} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:9, padding:"11px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ flex:2, background:saving?"#E5E7EB":C.green, color:saving?C.ink3:"#fff", border:"none", borderRadius:9, padding:"11px", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {saving ? <div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(0,0,0,0.15)",borderTopColor:"rgba(0,0,0,0.5)",animation:"evcrm-spin .7s linear infinite" }}/> : "Add to My Team →"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── TOGGLE MODAL ── */}
      {modal==="toggle" && selected && (
        <Modal title={selected.is_active?"Deactivate Rep":"Activate Rep"} onClose={()=>{ setModal(null); setSelected(null) }}>
          <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
            <Avatar name={selected.name} size={52} />
            <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginTop:12 }}>{selected.name}</div>
            <div style={{ fontSize:12, color:C.ink3, marginTop:4 }}>{selected.email}</div>
            <div style={{ marginTop:14, fontSize:12, color:C.ink2, lineHeight:1.7, background:C.bg, borderRadius:10, padding:"10px 14px" }}>
              {selected.is_active
                ? "This will prevent the rep from logging in. Their data is kept safe."
                : "This will allow the rep to log in and access the system again."}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>{ setModal(null); setSelected(null) }} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:9, padding:"11px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={()=>handleToggle(selected)}
              style={{ flex:2, background:selected.is_active?C.red:C.green, color:"#fff", border:"none", borderRadius:9, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {selected.is_active?"Deactivate":"Activate"} {selected.name.split(" ")[0]} →
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:C.ink, color:"#fff", fontSize:12, fontWeight:700, padding:"10px 22px", borderRadius:24, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap" }}>{toast}</div>
      )}
    </Shell>
  )
}
