"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const G   = "#059669", GD = "#065F46", GL = "#D1FAE5"
const INK = "#111827", I2 = "#374151", I3 = "#6B7280"
const BG  = "#F9FAFB", BD = "#E5E7EB", BDD = "#D1D5DB"
const RED = "#EF4444", RL = "#FEE2E2"
const ORG = "#F97316", ORL = "#FFEDD5"
const BLU = "#3B82F6", BLL = "#DBEAFE"

// ── Primitives ────────────────────────────────────────────────────
const Tag = ({ label, color=G }) => (
  <span style={{ background:`${color}15`, color, border:`1px solid ${color}25`, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:16, whiteSpace:"nowrap" }}>{label}</span>
)

function Field({ label, type="text", placeholder, value, onChange, icon, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ display:"block", fontSize:10.5, fontWeight:700, color:focused?G:I3, marginBottom:4, letterSpacing:"0.3px" }}>{label}{required&&<span style={{ color:RED }}> *</span>}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, opacity:0.4, pointerEvents:"none" }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", background:"#fff", border:`1.5px solid ${focused?G:BD}`, borderRadius:8, color:INK, fontSize:12, padding:`9px 10px 9px ${icon?"34px":"10px"}`, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
        />
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${BD}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:INK, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:I3, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"20px 22px" }}>{children}</div>
      </div>
    </div>
  )
}

function Avatar({ name, color=G, size=32 }) {
  const initials = name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?"
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}20`, border:`1.5px solid ${color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.34, fontWeight:800, color, flexShrink:0 }}>{initials}</div>
  )
}

// ════════════════════════════════════════════════════════════════
//  ADMIN PAGE
// ════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter()
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [modal,    setModal]    = useState(null) // "create" | "edit" | "confirm-deactivate"
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState("")
  const [saving,   setSaving]   = useState(false)

  const [newUser, setNewUser] = useState({ name:"", email:"", password:"", role:"rep", phone:"", dealership:"", city:"" })
  const [newErrors, setNewErrors] = useState({})

  const showToast = (msg, duration=3000) => { setToast(msg); setTimeout(()=>setToast(""), duration) }

  // ── Fetch users ───────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set("role", roleFilter)
      if (search)     params.set("search", search)
      const res  = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (res.status === 401) { router.push("/login"); return }
      if (data.success) { setUsers(data.users || []); setTotal(data.total || 0) }
    } catch { showToast("❌ Failed to load users") }
    finally { setLoading(false) }
  }, [roleFilter, search])

  useEffect(()=>{ fetchUsers() }, [fetchUsers])

  // ── Create user ───────────────────────────────────────────────
  const handleCreate = async () => {
    const e = {}
    if (!newUser.name.trim())    e.name     = "Required"
    if (!newUser.email.trim())   e.email    = "Required"
    if (!newUser.password)       e.password = "Required (min 8 chars)"
    if (!newUser.phone.trim())   e.phone    = "Required"
    if (Object.keys(e).length) { setNewErrors(e); return }

    setSaving(true)
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) { showToast(`❌ ${data.error}`); return }
      showToast(`✅ ${data.user.role === "dealer" ? "Dealer" : "Sales Rep"} account created!`)
      setModal(null)
      setNewUser({ name:"", email:"", password:"", role:"rep", phone:"", dealership:"", city:"" })
      setNewErrors({})
      fetchUsers()
    } catch { showToast("❌ Failed to create user") }
    finally { setSaving(false) }
  }

  // ── Toggle active status ──────────────────────────────────────
  const handleToggleActive = async (user) => {
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ id:user.id, is_active:!user.is_active }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(`❌ ${data.error}`); return }
      showToast(`✅ ${user.name.split(" ")[0]} ${!user.is_active ? "activated" : "deactivated"}`)
      fetchUsers()
    } catch { showToast("❌ Failed to update user") }
    setModal(null)
  }

  const stats = {
    total:    users.length,
    dealers:  users.filter(u=>u.role==="dealer").length,
    reps:     users.filter(u=>u.role==="rep").length,
    active:   users.filter(u=>u.is_active).length,
    pending:  users.filter(u=>!u.is_active&&u.role==="dealer").length,
  }

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {/* Top bar */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${BD}`, padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:40, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${G}18`, border:`1.5px solid ${G}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>⚡</div>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:16, fontWeight:900, color:INK }}>Ev<span style={{ color:G }}>.CRM</span></div>
            <div style={{ fontSize:9.5, color:I3 }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>router.push("/dealer")} style={{ background:BG, border:`1px solid ${BD}`, color:I2, borderRadius:8, padding:"6px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>← Dashboard</button>
          <button onClick={()=>{ setNewUser({ name:"", email:"", password:"", role:"rep", phone:"", dealership:"", city:"" }); setNewErrors({}); setModal("create") }} style={{ background:G, color:"#fff", border:"none", borderRadius:8, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 2px 10px ${G}35` }}>
            + Add User
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
          {[
            { v:stats.total,   l:"Total Users",    c:BLU  },
            { v:stats.dealers, l:"Dealers",         c:G    },
            { v:stats.reps,    l:"Sales Reps",      c:ORG  },
            { v:stats.active,  l:"Active",          c:G    },
            { v:stats.pending, l:"Pending Approval",c:RED  },
          ].map((s,i)=>(
            <div key={i} style={{ background:"#fff", border:`1px solid ${BD}`, borderRadius:12, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize:26, fontWeight:900, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:10.5, color:I3, marginTop:4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background:"#fff", border:`1px solid ${BD}`, borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:0.4 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
              style={{ width:"100%", background:BG, border:`1px solid ${BD}`, borderRadius:8, padding:"8px 10px 8px 32px", fontSize:12, outline:"none", fontFamily:"inherit", color:INK, boxSizing:"border-box" }}
            />
          </div>
          <div style={{ display:"flex", gap:0, background:BG, border:`1px solid ${BD}`, borderRadius:8, overflow:"hidden" }}>
            {[{v:"",l:"All"},{v:"dealer",l:"Dealers"},{v:"rep",l:"Reps"}].map(f=>(
              <button key={f.v} onClick={()=>setRoleFilter(f.v)} style={{ background:roleFilter===f.v?"#fff":"transparent", border:"none", color:roleFilter===f.v?G:I3, padding:"7px 16px", fontSize:11, fontWeight:roleFilter===f.v?700:400, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>{f.l}</button>
            ))}
          </div>
          <span style={{ fontSize:11, color:I3 }}>{total} user{total!==1?"s":""}</span>
        </div>

        {/* Table */}
        <div style={{ background:"#fff", border:`1px solid ${BD}`, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${G}25`, borderTopColor:G, animation:"evcrm-spin .7s linear infinite", margin:"0 auto 12px" }}/>
              <p style={{ fontSize:12, color:I3 }}>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <p style={{ fontSize:14, fontWeight:700, color:INK, marginBottom:6 }}>No users found</p>
              <p style={{ fontSize:12, color:I3, marginBottom:20 }}>Add your first user to get started</p>
              <button onClick={()=>setModal("create")} style={{ background:G, color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add First User</button>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:BG, borderBottom:`1px solid ${BD}` }}>
                  {["User","Role","Contact","Dealership","Status","Joined","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:I3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} style={{ borderBottom:i<users.length-1?`1px solid ${BD}`:"none", background:"#fff" }}
                    onMouseEnter={e=>e.currentTarget.style.background=BG}
                    onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                  >
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <Avatar name={u.name} color={u.role==="dealer"?G:ORG} size={34} />
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:INK }}>{u.name}</div>
                          <div style={{ fontSize:10.5, color:I3 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <Tag label={u.role==="dealer"?"🏪 Dealer":"⚡ Sales Rep"} color={u.role==="dealer"?G:ORG} />
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ fontSize:11.5, color:I2 }}>{u.phone||"—"}</div>
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ fontSize:11.5, color:I2 }}>{u.dealership||"—"}</div>
                      {u.city && <div style={{ fontSize:10.5, color:I3, marginTop:1 }}>{u.city}</div>}
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <Tag label={u.is_active?"✓ Active":"⏳ Pending"} color={u.is_active?G:ORG} />
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ fontSize:11, color:I3 }}>{new Date(u.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
                      {u.last_login && <div style={{ fontSize:10, color:I3, marginTop:1 }}>Last: {new Date(u.last_login).toLocaleDateString("en-IN")}</div>}
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>{ setSelected(u); setModal("confirm-toggle") }} style={{ background:u.is_active?RL:GL, border:`1px solid ${u.is_active?RED:G}25`, color:u.is_active?RED:GD, borderRadius:7, padding:"5px 11px", fontSize:10.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          {u.is_active?"Deactivate":"Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CREATE USER MODAL ── */}
      {modal==="create" && (
        <Modal title="Add New User" onClose={()=>setModal(null)}>
          {/* Role tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {[{v:"dealer",icon:"🏪",l:"Dealer"},{v:"rep",icon:"⚡",l:"Sales Rep"}].map(r=>(
              <button key={r.v} onClick={()=>setNewUser(u=>({...u,role:r.v}))} style={{ flex:1, background:newUser.role===r.v?`${r.v==="dealer"?G:ORG}10`:"transparent", border:`1.5px solid ${newUser.role===r.v?r.v==="dealer"?G:ORG:BD}`, borderRadius:10, padding:"9px", cursor:"pointer", fontFamily:"inherit", textAlign:"center" }}>
                <div style={{ fontSize:16 }}>{r.icon}</div>
                <div style={{ fontSize:11, fontWeight:700, color:newUser.role===r.v?r.v==="dealer"?G:ORG:INK, marginTop:3 }}>{r.l}</div>
              </button>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <Field label="FULL NAME" placeholder="Ravi Kumar" icon="👤" value={newUser.name}
                onChange={e=>{ setNewUser(u=>({...u,name:e.target.value})); setNewErrors(er=>({...er,name:""})) }} required />
              {newErrors.name && <p style={{ fontSize:10,color:RED,marginTop:-8,marginBottom:8 }}>{newErrors.name}</p>}
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <Field label="EMAIL" type="email" placeholder="ravi@gmail.com" icon="✉️" value={newUser.email}
                onChange={e=>{ setNewUser(u=>({...u,email:e.target.value})); setNewErrors(er=>({...er,email:""})) }} required />
              {newErrors.email && <p style={{ fontSize:10,color:RED,marginTop:-8,marginBottom:8 }}>{newErrors.email}</p>}
            </div>
            <Field label="PASSWORD" type="password" placeholder="Min 8 chars" icon="🔒" value={newUser.password}
              onChange={e=>{ setNewUser(u=>({...u,password:e.target.value})); setNewErrors(er=>({...er,password:""})) }} required />
            <Field label="PHONE" placeholder="9999900000" icon="📱" value={newUser.phone}
              onChange={e=>setNewUser(u=>({...u,phone:e.target.value.replace(/\D/g,"")}))} required />
            {newErrors.phone && <p style={{ fontSize:10,color:RED,marginTop:-8,marginBottom:8,gridColumn:"2" }}>{newErrors.phone}</p>}
          </div>

          {newUser.role==="dealer" && (
            <Field label="DEALERSHIP NAME" placeholder="Sharma EV Motors" icon="🏪" value={newUser.dealership}
              onChange={e=>setNewUser(u=>({...u,dealership:e.target.value}))} />
          )}
          <Field label="CITY" placeholder="Hyderabad" icon="📍" value={newUser.city}
            onChange={e=>setNewUser(u=>({...u,city:e.target.value}))} />

          {newErrors.password && <p style={{ fontSize:10,color:RED,marginBottom:8 }}>{newErrors.password}</p>}

          <div style={{ background:BG, border:`1px solid ${BD}`, borderRadius:9, padding:"9px 12px", marginBottom:16, fontSize:11, color:I3, lineHeight:1.6 }}>
            📧 A welcome email with login credentials will be sent automatically.
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setModal(null)} style={{ flex:1, background:BG, border:`1px solid ${BD}`, color:I2, borderRadius:9, padding:"11px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} style={{ flex:2, background:saving?"#E5E7EB":G, color:saving?I3:"#fff", border:"none", borderRadius:9, padding:"11px", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {saving ? <div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(0,0,0,0.15)",borderTopColor:"rgba(0,0,0,0.5)",animation:"evcrm-spin .7s linear infinite" }}/> : `Create ${newUser.role==="dealer"?"Dealer":"Rep"} Account →`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── TOGGLE ACTIVE MODAL ── */}
      {modal==="confirm-toggle" && selected && (
        <Modal title={selected.is_active?"Deactivate User":"Activate User"} onClose={()=>{ setModal(null); setSelected(null) }}>
          <div style={{ textAlign:"center", padding:"10px 0 20px" }}>
            <Avatar name={selected.name} color={selected.role==="dealer"?G:ORG} size={52} />
            <div style={{ fontSize:15, fontWeight:700, color:INK, marginTop:12 }}>{selected.name}</div>
            <div style={{ fontSize:12, color:I3, marginTop:4 }}>{selected.email}</div>
            <div style={{ marginTop:16, fontSize:13, color:I2, lineHeight:1.7 }}>
              {selected.is_active
                ? "This will prevent the user from logging in. You can reactivate anytime."
                : "This will allow the user to log in and access the system."}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>{ setModal(null); setSelected(null) }} style={{ flex:1, background:BG, border:`1px solid ${BD}`, color:I2, borderRadius:9, padding:"11px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={()=>handleToggleActive(selected)} style={{ flex:2, background:selected.is_active?RED:G, color:"#fff", border:"none", borderRadius:9, padding:"11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {selected.is_active?"Yes, Deactivate":"Yes, Activate"} →
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:INK, color:"#fff", fontSize:12, fontWeight:700, padding:"10px 22px", borderRadius:24, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap" }}>{toast}</div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes evcrm-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
