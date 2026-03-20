"use client"
import { useState, useRef, useCallback } from "react"
import Shell from "../../components/layout/Shell"
import { C } from "../../lib/constants"

// ── Shared primitives ────────────────────────────────────────────
const Tag = ({ label, color = C.green }) => (
  <span style={{ background:`${color}18`, color, border:`1px solid ${color}30`, fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20, whiteSpace:"nowrap", lineHeight:1.6, display:"inline-flex", alignItems:"center" }}>{label}</span>
)

const Spin = ({ size=18, color=C.green }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", border:`2.5px solid ${color}28`, borderTopColor:color, animation:"evcrm-spin .7s linear infinite", flexShrink:0 }}/>
)

function Btn({ children, onClick, color=C.green, outline=false, disabled=false, loading=false, full=false, style:xs={} }) {
  const bg = disabled||loading ? C.borderD : outline ? "transparent" : `linear-gradient(135deg,${color}dd,${color})`
  const fc = disabled||loading ? C.ink3 : outline ? color : "#fff"
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{ background:bg, color:fc, border:outline?`1.5px solid ${disabled?C.border:color}`:"none", borderRadius:10, padding:"9px 18px", fontSize:12, fontWeight:700, cursor:disabled||loading?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7, transition:"all .15s", boxShadow:(!outline&&!disabled&&!loading)?`0 3px 12px ${color}35`:"none", width:full?"100%":"auto", ...xs }}
      onMouseEnter={e=>{ if(!disabled&&!loading) e.currentTarget.style.opacity=".88" }}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}
    >{loading ? <Spin size={14} color={outline?color:"#fff"}/> : children}</button>
  )
}

function Tx({ t, size=12, color=C.ink2 }) {
  if (!t) return null
  const parts = String(t).split(/(\*\*[^*]+\*\*)/g).map((p,i) =>
    p.startsWith("**") ? <strong key={i} style={{ color:C.ink }}>{p.slice(2,-2)}</strong> : p
  )
  return <span style={{ fontSize:size, color, lineHeight:1.6 }}>{parts}</span>
}

function SH({ icon, text, color=C.ink }) {
  return <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><span style={{ fontSize:16 }}>{icon}</span><span style={{ fontSize:13, fontWeight:700, color }}>{text}</span></div>
}

function Card({ children, style:xs={}, noPad=false }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:noPad?0:"14px 16px", marginBottom:14, boxShadow:"0 1px 3px rgba(0,0,0,0.05)", overflow:noPad?"hidden":"visible", ...xs }}>{children}</div>
}

function WinBadge({ w }) {
  const m = { win:{c:C.green,bg:C.greenL,l:"✓ We Win"}, lose:{c:C.red,bg:"#FEE2E2",l:"⚠ Loses"}, tie:{c:C.yellow,bg:"#FEF9C3",l:"≈ Tie"} }[w]||{c:C.yellow,bg:"#FEF9C3",l:"≈ Tie"}
  return <span style={{ background:m.bg, color:m.c, fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:8, whiteSpace:"nowrap" }}>{m.l}</span>
}

function Ring({ score, label, color, size=62 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}15`, border:`3px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*.28, fontWeight:900, color }}>{score}</span>
      </div>
      <span style={{ fontSize:9.5, color:C.ink3, textAlign:"center", maxWidth:80, lineHeight:1.3 }}>{label}</span>
    </div>
  )
}

const PITCH_COLORS = [C.green, C.blue, C.orange, C.purple, C.teal]

// ── Research result display ──────────────────────────────────────
function ResearchResult({ res, query, imgSrc, onReset }) {
  const ov = res.overview || {}
  return (
    <div>
      {/* Header strip */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 16px", marginBottom:18, display:"flex", gap:10, alignItems:"center" }}>
        {imgSrc ? <img src={imgSrc} alt="" style={{ width:36, height:36, objectFit:"cover", borderRadius:7, border:`1px solid ${C.border}`, flexShrink:0 }}/> : <span style={{ fontSize:18 }}>🔍</span>}
        <span style={{ fontSize:13, fontWeight:600, color:C.ink, flex:1 }}>{query||"Image search"}</span>
        <Btn onClick={onReset} outline color={C.ink3} style={{ padding:"5px 14px", fontSize:11 }}>New Search</Btn>
      </div>

      {/* Overview hero */}
      {ov.name && (
        <div style={{ background:`linear-gradient(135deg,${C.greenL},${C.card})`, border:`1.5px solid ${C.green}30`, borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:C.ink, letterSpacing:"-0.5px" }}>{ov.name}</div>
              <div style={{ fontSize:11, color:C.ink3, marginTop:2 }}>{ov.category}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:900, color:C.greenD }}>{ov.priceRange}</div>
              <div style={{ fontSize:9.5, color:C.ink3 }}>Market range</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {(ov.tags||[]).map((t,i) => <Tag key={i} label={t} color={C.green}/>)}
          </div>
        </div>
      )}

      {/* Specs grid */}
      {res.specs?.length > 0 && (
        <Card>
          <SH icon="⚡" text="Key Specifications"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {res.specs.map((s,i) => (
              <div key={i} style={{ background:C.bg, borderRadius:9, padding:"9px 12px" }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.ink3, marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:13, fontWeight:800, color:s.highlight?C.green:C.ink }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pricing */}
      {res.pricing && (
        <Card>
          <SH icon="₹" text="Pricing Intelligence"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            {[{l:"Market Avg",v:res.pricing.marketAvg,c:C.blue},{l:"Dealer Price",v:res.pricing.dealerPrice,c:C.greenD},{l:"Position",v:res.pricing.position,c:res.pricing.positionColor||C.orange}].map((p,i) => (
              <div key={i} style={{ background:`${p.c}10`, border:`1px solid ${p.c}25`, borderRadius:10, padding:"11px", textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:900, color:p.c }}>{p.v}</div>
                <div style={{ fontSize:9.5, color:C.ink3, marginTop:3 }}>{p.l}</div>
              </div>
            ))}
          </div>
          {res.pricing.insight && <div style={{ background:"#DBEAFE", border:"1px solid #3B82F625", borderRadius:9, padding:"9px 12px", fontSize:11.5, color:C.blue, lineHeight:1.6 }}>💡 {res.pricing.insight}</div>}
        </Card>
      )}

      {/* Competitor table */}
      {res.competitors?.length > 0 && (
        <Card noPad>
          <div style={{ padding:"12px 16px 10px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <span>🏆</span><span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Competitor Comparison</span>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Model","Price","Range","Speed","vs Dealer"].map(h => (
                  <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.competitors.map((cm,i) => (
                <tr key={i} style={{ background:cm.isDealer?C.greenL:C.card, borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontSize:12, fontWeight:cm.isDealer?800:600, color:cm.isDealer?C.greenD:C.ink }}>{cm.isDealer?"★ ":""}{cm.model}</div>
                    <div style={{ fontSize:10, color:C.ink3 }}>{cm.brand}</div>
                  </td>
                  <td style={{ padding:"11px 14px" }}><span style={{ fontSize:12, fontWeight:700, color:cm.isDealer?C.greenD:C.ink2 }}>{cm.price}</span></td>
                  <td style={{ padding:"11px 14px" }}><span style={{ fontSize:12, color:C.ink2 }}>{cm.range}</span></td>
                  <td style={{ padding:"11px 14px" }}><span style={{ fontSize:12, color:C.ink2 }}>{cm.speed}</span></td>
                  <td style={{ padding:"11px 14px" }}>{cm.isDealer ? <Tag label="Your Stock" color={C.green}/> : <Tag label={cm.vsDealer||"—"} color={cm.vsDealer?.startsWith("+")?C.red:C.green}/>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pitch points */}
      {res.pitchPoints?.length > 0 && (
        <div style={{ background:`linear-gradient(135deg,${C.greenL},${C.card})`, border:`1.5px solid ${C.green}30`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
          <SH icon="🎯" text="Pitch Points — Say These to Customers" color={C.greenD}/>
          {res.pitchPoints.map((p,i) => (
            <div key={i} style={{ background:`${PITCH_COLORS[i%5]}10`, border:`1px solid ${PITCH_COLORS[i%5]}25`, borderRadius:10, padding:"10px 14px", marginBottom:7, display:"flex", gap:10 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:`${PITCH_COLORS[i%5]}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:800, color:PITCH_COLORS[i%5] }}>{i+1}</div>
              <Tx t={p} size={12} color={C.ink}/>
            </div>
          ))}
        </div>
      )}

      {/* Objections */}
      {res.objections?.length > 0 && (
        <Card>
          <SH icon="💬" text="Customer Objections & Rebuttals"/>
          {res.objections.map((o,i) => (
            <div key={i} style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:8 }}>
              <div style={{ background:"#FEE2E2", padding:"8px 12px", fontSize:11.5, fontWeight:700, color:C.red }}>❓ {o.objection}</div>
              <div style={{ background:C.greenL, padding:"8px 12px", fontSize:11.5, color:C.greenD, lineHeight:1.5 }}><strong>✓ </strong>{o.rebuttal}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Trends */}
      {res.trends && (
        <Card>
          <SH icon="📈" text="Market Trends & Timing"/>
          {res.trends.split("\n").filter(l=>l.trim()).map((line,i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
              <span style={{ color:C.green, fontWeight:800, flexShrink:0 }}>›</span>
              <Tx t={line.replace(/^[-•]\s*/,"")} size={12} color={C.ink2}/>
            </div>
          ))}
        </Card>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", display:"flex", gap:10, alignItems:"center" }}>
        <span>💡</span>
        <span style={{ fontSize:12, color:C.ink2, flex:1 }}>Share this intelligence with your team or use it in your next customer pitch</span>
        <Btn onClick={()=>window.print()} outline color={C.ink3} style={{ padding:"6px 12px", fontSize:11 }}>🖨 Print</Btn>
        <Btn onClick={()=>navigator.clipboard?.writeText(`${ov.name||query}\n${res.pitchPoints?.[0]||""}`)} color={C.green} style={{ padding:"6px 14px", fontSize:11 }}>📋 Copy</Btn>
      </div>
    </div>
  )
}

// ── Compare result display ───────────────────────────────────────
function CompareResult({ res, v1, v2, onReset }) {
  const { vehicle1:va, vehicle2:vb, headToHead, verdict } = res
  return (
    <div>
      {/* VS hero */}
      <div style={{ background:`linear-gradient(135deg,${C.greenL},${C.card})`, border:`1.5px solid ${C.green}30`, borderRadius:14, padding:"18px 20px", marginBottom:18 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 52px 1fr", gap:12, alignItems:"center", marginBottom:16 }}>
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`2px solid ${C.green}`, textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:800, color:C.greenD, letterSpacing:"0.5px", marginBottom:4 }}>★ YOUR VEHICLE</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.greenD }}>{va?.name||v1}</div>
            <div style={{ fontSize:12, color:C.ink3, marginTop:3 }}>{va?.price||"—"}</div>
          </div>
          <div style={{ width:52, height:52, borderRadius:"50%", background:C.greenD, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", fontWeight:900, flexShrink:0, margin:"0 auto" }}>VS</div>
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`1.5px solid ${C.border}`, textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:800, color:C.ink3, letterSpacing:"0.5px", marginBottom:4 }}>COMPETITOR</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.ink }}>{vb?.name||v2}</div>
            <div style={{ fontSize:12, color:C.ink3, marginTop:3 }}>{vb?.price||"—"}</div>
          </div>
        </div>
        {verdict && (
          <div style={{ display:"flex", gap:14, alignItems:"center", justifyContent:"center" }}>
            <Ring score={verdict.ourScore} label={`${va?.name||v1} Score`} color={C.green} size={60}/>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.ink3, marginBottom:8 }}>OVERALL VERDICT</div>
              <div style={{ background:verdict.winner==="ours"?C.greenL:verdict.winner==="tie"?"#FEF9C3":"#FEE2E2", border:`2px solid ${verdict.winner==="ours"?C.green:verdict.winner==="tie"?C.yellow:C.red}`, borderRadius:12, padding:"9px 16px", display:"inline-block" }}>
                <div style={{ fontSize:14, fontWeight:900, color:verdict.winner==="ours"?C.greenD:verdict.winner==="tie"?C.yellow:C.red }}>
                  {verdict.winner==="ours"?"✓ Your Vehicle Wins":verdict.winner==="tie"?"≈ Close Match":"⚠ Competitor Leads"}
                </div>
                {verdict.summary && <div style={{ fontSize:10.5, color:C.ink3, marginTop:3 }}>{verdict.summary}</div>}
              </div>
            </div>
            <Ring score={verdict.theirScore} label={`${vb?.name||v2} Score`} color={C.red} size={60}/>
          </div>
        )}
      </div>

      {/* Head-to-head table */}
      {headToHead?.length > 0 && (
        <Card noPad>
          <div style={{ padding:"12px 16px 10px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <span>⚔️</span><span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Head-to-Head Comparison</span>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.bg }}>
                <th style={{ padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:C.ink3, borderBottom:`1px solid ${C.border}`, width:"20%" }}>Attribute</th>
                <th style={{ padding:"10px 14px", textAlign:"center", fontSize:10.5, fontWeight:700, color:C.greenD, borderBottom:`1px solid ${C.border}`, width:"28%" }}>★ {va?.name||v1}</th>
                <th style={{ padding:"10px 14px", textAlign:"center", fontSize:10.5, fontWeight:700, color:C.ink3, borderBottom:`1px solid ${C.border}`, width:"28%" }}>{vb?.name||v2}</th>
                <th style={{ padding:"10px 14px", textAlign:"center", fontSize:10.5, fontWeight:700, color:C.ink3, borderBottom:`1px solid ${C.border}`, width:"24%" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {headToHead.map((row,i) => (
                <tr key={i} style={{ background:row.winner==="ours"?`${C.green}06`:row.winner==="theirs"?`${C.red}05`:C.card, borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{row.attribute}</div>
                    {row.explanation && <div style={{ fontSize:9.5, color:C.ink3, marginTop:2 }}>{row.explanation}</div>}
                  </td>
                  <td style={{ padding:"11px 14px", textAlign:"center", background:row.winner==="ours"?`${C.green}10`:"transparent" }}>
                    <div style={{ fontSize:13, fontWeight:row.winner==="ours"?900:500, color:row.winner==="ours"?C.greenD:C.ink2 }}>{row.ourValue}</div>
                    {row.winner==="ours" && <div style={{ fontSize:9, color:C.green, fontWeight:700, marginTop:1 }}>✓ Better</div>}
                  </td>
                  <td style={{ padding:"11px 14px", textAlign:"center", background:row.winner==="theirs"?`${C.red}08`:"transparent" }}>
                    <div style={{ fontSize:13, fontWeight:row.winner==="theirs"?900:500, color:row.winner==="theirs"?C.red:C.ink2 }}>{row.theirValue}</div>
                    {row.winner==="theirs" && <div style={{ fontSize:9, color:C.red, fontWeight:700, marginTop:1 }}>⚠ Ahead</div>}
                  </td>
                  <td style={{ padding:"11px 14px", textAlign:"center" }}>
                    <WinBadge w={row.winner==="ours"?"win":row.winner==="theirs"?"lose":"tie"}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Why choose ours */}
      {res.whyChooseOurs?.length > 0 && (
        <div style={{ background:`linear-gradient(135deg,${C.greenL},${C.card})`, border:`1.5px solid ${C.green}30`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
          <SH icon="🎯" text={`Why Choose ${va?.name||v1} — Tell Your Customer`} color={C.greenD}/>
          {res.whyChooseOurs.map((p,i) => (
            <div key={i} style={{ background:`${PITCH_COLORS[i%5]}10`, border:`1px solid ${PITCH_COLORS[i%5]}25`, borderRadius:10, padding:"10px 14px", marginBottom:7, display:"flex", gap:10 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:`${PITCH_COLORS[i%5]}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:800, color:PITCH_COLORS[i%5] }}>{i+1}</div>
              <Tx t={p} size={12} color={C.ink}/>
            </div>
          ))}
        </div>
      )}

      {/* Handle competitor advantages */}
      {res.handleCompetitorAdvantages?.length > 0 && (
        <Card>
          <SH icon="🛡️" text={`When Customer Prefers ${vb?.name||v2} — Your Responses`}/>
          {res.handleCompetitorAdvantages.map((a,i) => (
            <div key={i} style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:8 }}>
              <div style={{ background:"#FEE2E2", padding:"8px 12px", fontSize:11.5, fontWeight:700, color:C.red }}>⚠️ Customer says: "{a.concern}"</div>
              <div style={{ background:C.greenL, padding:"8px 12px", fontSize:11.5, color:C.greenD, lineHeight:1.5 }}><strong>✓ Your answer: </strong>{a.response}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Customer profiles */}
      {res.customerProfiles && (
        <Card>
          <SH icon="👥" text="Who Should Buy Which Vehicle?"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ background:C.greenL, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.green}25` }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.greenD, marginBottom:8 }}>★ Ideal for {va?.name||v1}</div>
              {(res.customerProfiles.ours||[]).map((p,i) => (
                <div key={i} style={{ display:"flex", gap:7, marginBottom:5 }}>
                  <span style={{ color:C.green, fontWeight:700, flexShrink:0 }}>›</span>
                  <span style={{ fontSize:11, color:C.ink2 }}>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"#FFF8F8", borderRadius:10, padding:"12px 14px", border:`1px solid ${C.red}20` }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.red, marginBottom:8 }}>Ideal for {vb?.name||v2}</div>
              {(res.customerProfiles.theirs||[]).map((p,i) => (
                <div key={i} style={{ display:"flex", gap:7, marginBottom:5 }}>
                  <span style={{ color:C.red, fontWeight:700, flexShrink:0 }}>›</span>
                  <span style={{ fontSize:11, color:C.ink2 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Closing lines */}
      {res.closingLines?.length > 0 && (
        <div style={{ background:`linear-gradient(135deg,${C.greenD},${C.green})`, borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:"0.4px", marginBottom:10 }}>💬 CLOSING LINES — SAY THESE TO SEAL THE DEAL</div>
          {res.closingLines.map((l,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,.12)", borderRadius:10, padding:"10px 14px", marginBottom:7, fontSize:12, color:"#fff", lineHeight:1.6, fontStyle:"italic" }}>"{l}"</div>
          ))}
        </div>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", display:"flex", gap:10, alignItems:"center" }}>
        <span>📊</span>
        <span style={{ fontSize:12, color:C.ink2, flex:1 }}>Save this battle card for team briefing or share before the customer visit</span>
        <Btn onClick={()=>window.print()} outline color={C.ink3} style={{ padding:"6px 12px", fontSize:11 }}>🖨 Print</Btn>
        <Btn onClick={onReset} color={C.green} style={{ padding:"6px 14px", fontSize:11 }}>New Compare</Btn>
      </div>
    </div>
  )
}

// ── Claude API helper ────────────────────────────────────────────
async function callClaude(system, userContent) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:3000, system, messages:[{ role:"user", content:userContent }] }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("")
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("No JSON in response")
  return JSON.parse(match[0])
}

// ════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function MarketResearchPage() {
  const [tab,       setTab]       = useState("research")
  const [mode,      setMode]      = useState("text")
  const [query,     setQuery]     = useState("")
  const [imgData,   setImgData]   = useState(null)
  const [imgFile,   setImgFile]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState("")
  const [dragging,  setDragging]  = useState(false)
  const [v1,        setV1]        = useState("")
  const [v2,        setV2]        = useState("")
  const [cmpLoad,   setCmpLoad]   = useState(false)
  const [cmpResult, setCmpResult] = useState(null)
  const [cmpError,  setCmpError]  = useState("")

  const fileRef = useRef(null)
  const resRef  = useRef(null)

  const handleImg = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return
    setImgFile(file)
    const r = new FileReader()
    r.onload = e => setImgData(e.target.result)
    r.readAsDataURL(file)
  }, [])

  const RESEARCH_SYSTEM = `You are an expert EV market analyst for Indian dealers. Return ONLY valid JSON (no markdown) in this structure:
{"overview":{"name":"full name","category":"category","priceRange":"₹X.XL – ₹X.XL","tags":["t1","t2","t3","t4"]},"specs":[{"label":"Real Range","value":"XXX km","highlight":true},{"label":"Top Speed","value":"XX km/h","highlight":false},{"label":"Charge Time (Home)","value":"X hrs","highlight":false},{"label":"Fast Charge","value":"XX min","highlight":true},{"label":"Motor Power","value":"XX kW","highlight":false},{"label":"Battery","value":"X.X kWh","highlight":false},{"label":"Warranty","value":"X years","highlight":false},{"label":"Weight","value":"XXX kg","highlight":false}],"competitors":[{"model":"name","brand":"brand","price":"₹X.XL","range":"XXXkm","speed":"XXkm/h","vsDealer":"string","isDealer":false}],"pricing":{"marketAvg":"₹X.XL","dealerPrice":"₹X.XL","position":"Competitive","positionColor":"#059669","insight":"one sentence"},"pitchPoints":["**Label**: detail with ₹ numbers"],"objections":[{"objection":"string","rebuttal":"string"}],"trends":"- **Point**: detail\n- **Point2**: detail\n- **Point3**: detail"}
Use real 2025 Indian EV market data. Include the vehicle in competitors with isDealer:true. 5 pitch points, 4 objections, 4 trend lines.`

  const COMPARE_SYSTEM = `You are an EV sales coach for Indian dealers. Return ONLY valid JSON (no markdown):
{"vehicle1":{"name":"string","price":"₹X.XL","category":"string"},"vehicle2":{"name":"string","price":"₹X.XL","category":"string"},"headToHead":[{"attribute":"Price","ourValue":"₹X.XL","theirValue":"₹X.XL","winner":"ours|theirs|tie","explanation":"why"},{"attribute":"Real Range","ourValue":"XXXkm","theirValue":"XXXkm","winner":"ours|theirs|tie","explanation":""},{"attribute":"Charging","ourValue":"Xhr home","theirValue":"Xhr home","winner":"ours|theirs|tie","explanation":""},{"attribute":"Top Speed","ourValue":"XXkm/h","theirValue":"XXkm/h","winner":"ours|theirs|tie","explanation":""},{"attribute":"Warranty","ourValue":"X years","theirValue":"X years","winner":"ours|theirs|tie","explanation":""},{"attribute":"Service Network","ourValue":"XX+ cities","theirValue":"XX+ cities","winner":"ours|theirs|tie","explanation":""},{"attribute":"Resale Value","ourValue":"XX% at 3yr","theirValue":"XX% at 3yr","winner":"ours|theirs|tie","explanation":""},{"attribute":"Monthly Fuel Savings","ourValue":"₹X,XXX","theirValue":"₹X,XXX","winner":"ours|theirs|tie","explanation":"vs petrol"},{"attribute":"Unique Feature","ourValue":"feature","theirValue":"feature","winner":"ours|theirs|tie","explanation":""}],"verdict":{"winner":"ours|theirs|tie","ourScore":"X/10","theirScore":"X/10","summary":"one line"},"whyChooseOurs":["**Label**: detail with ₹ numbers"],"handleCompetitorAdvantages":[{"concern":"string","response":"string"}],"customerProfiles":{"ours":["profile1","profile2","profile3"],"theirs":["profile1","profile2","profile3"]},"closingLines":["line1","line2","line3"]}
Use real Indian EV data. Dealer sells Vehicle 1. Make pitch points natural for Indian dealers.`

  const doResearch = async () => {
    if (mode==="text" && !query.trim()) return
    if (mode==="image" && !imgData) return
    setLoading(true); setError(""); setResult(null)
    try {
      const msg = mode==="image"
        ? [{ type:"image", source:{ type:"base64", media_type:imgFile.type, data:imgData.split(",")[1] }}, { type:"text", text:`Analyse this EV image and provide full market intelligence.${query?` Context: ${query}`:""}` }]
        : `Full EV market intelligence for: "${query}" in India 2025-26.`
      const parsed = await callClaude(RESEARCH_SYSTEM, msg)
      setResult(parsed)
      setTimeout(() => resRef.current?.scrollIntoView({ behavior:"smooth" }), 100)
    } catch(e) {
      setError(e.message || "Research failed — please try again")
    } finally { setLoading(false) }
  }

  const doCompare = async () => {
    if (!v1.trim() || !v2.trim()) return
    setCmpLoad(true); setCmpError(""); setCmpResult(null)
    try {
      const parsed = await callClaude(COMPARE_SYSTEM, `Dealer sells: ${v1}\nCompetitor: ${v2}\nIndian market 2025-26. Provide complete comparison from dealer's perspective.`)
      setCmpResult(parsed)
    } catch(e) {
      setCmpError(e.message || "Comparison failed — please try again")
    } finally { setCmpLoad(false) }
  }

  const resetR = () => { setResult(null); setError(""); setQuery(""); setImgData(null); setImgFile(null) }
  const resetC = () => { setCmpResult(null); setCmpError(""); setV1(""); setV2("") }

  const QUICK    = ["Ather 450X Gen 3","Tata Nexon EV Max","Ola S1 Pro","TVS iQube ST","Bajaj Chetak Premium","Hero Optima CX","Okaya Faast F4","Simple One"]
  const OUR_VEH  = ["Ather 450X Gen 3","Tata Nexon EV Max","Ola S1 Pro","TVS iQube ST","Bajaj Chetak","Okaya Faast F4","Hero Optima"]
  const COMP_VEH = ["Ola S1 Pro","Ather 450X Gen 3","Tata Nexon EV","TVS iQube ST","Bajaj Chetak","Simple One","Ultraviolette F77","Ola S1 Air"]

  return (
    <Shell title="Market Research">
      {/* Tab switcher */}
      <div style={{ display:"flex", gap:0, background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:24, maxWidth:520 }}>
        {[
          { id:"research", icon:"🔍", label:"Market Research" },
          { id:"compare",  icon:"⚔️", label:"Compare Vehicles" },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, background:tab===t.id?C.green:"transparent", border:"none", color:tab===t.id?"#fff":C.ink3, padding:"11px 16px", fontSize:13, fontWeight:tab===t.id?700:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s" }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════ RESEARCH TAB ══════════════════════════════════ */}
      {tab==="research" && (
        <>
          {!result && !loading && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>EV Market Research</h1>
                <p style={{ fontSize:12, color:C.ink3 }}>Search any EV by name or photo — get competitor pricing, pitch points and market trends powered by AI</p>
              </div>

              {/* Mode toggle */}
              <div style={{ display:"flex", gap:0, background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:18, maxWidth:480 }}>
                {[{id:"text",icon:"🔍",l:"Search by Name"},{id:"image",icon:"📷",l:"Search by Photo"}].map(m => (
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{ flex:1, background:mode===m.id?C.card:"transparent", border:"none", borderBottom:`2.5px solid ${mode===m.id?C.green:"transparent"}`, color:mode===m.id?C.green:C.ink3, padding:"11px 14px", fontSize:12, fontWeight:mode===m.id?700:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7, transition:"all .15s" }}>
                    <span style={{ fontSize:16 }}>{m.icon}</span>{m.l}
                  </button>
                ))}
              </div>

              {/* Text search */}
              {mode==="text" && (
                <div>
                  <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16, maxWidth:640 }}>
                    <div style={{ display:"flex" }}>
                      <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doResearch()}
                        placeholder="e.g. Ather 450X, Tata Nexon EV Max, Okaya Faast F4..."
                        style={{ flex:1, border:"none", padding:"14px 18px", fontSize:14, color:C.ink, background:"transparent", fontFamily:"inherit" }}
                      />
                      <Btn onClick={doResearch} disabled={!query.trim()} loading={loading} style={{ borderRadius:0, padding:"0 24px", borderLeft:`1px solid ${C.border}`, fontSize:13 }}>
                        <span style={{ fontSize:16 }}>🔍</span>Research
                      </Btn>
                    </div>
                  </div>
                  <p style={{ fontSize:11, color:C.ink3, marginBottom:10 }}>Popular searches:</p>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    {QUICK.map(v => (
                      <button key={v} onClick={()=>setQuery(v)} style={{ background:C.card, border:`1px solid ${C.border}`, color:C.ink2, borderRadius:20, padding:"5px 13px", fontSize:11, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.color=C.green;e.currentTarget.style.background=C.greenL}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.ink2;e.currentTarget.style.background=C.card}}
                      >{v}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image search */}
              {mode==="image" && (
                <div style={{ maxWidth:640 }}>
                  <div onDrop={e=>{e.preventDefault();setDragging(false);handleImg(e.dataTransfer.files[0])}} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onClick={()=>!imgData&&fileRef.current?.click()}
                    style={{ border:`2px dashed ${dragging?C.green:imgData?C.green:C.borderD}`, borderRadius:16, padding:imgData?18:44, background:dragging?C.greenL:imgData?`${C.green}06`:C.card, cursor:imgData?"default":"pointer", marginBottom:12, textAlign:imgData?"left":"center", transition:"all .2s" }}
                  >
                    {imgData ? (
                      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                        <img src={imgData} alt="" style={{ width:110, height:86, objectFit:"cover", borderRadius:12, border:`1px solid ${C.border}`, flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:C.greenD, marginBottom:4 }}>✓ Image ready for analysis</div>
                          <div style={{ fontSize:11, color:C.ink3, marginBottom:12 }}>{imgFile?.name} · {(imgFile?.size/1024).toFixed(0)}KB</div>
                          <div style={{ display:"flex", gap:8 }}>
                            <Btn onClick={()=>{setImgData(null);setImgFile(null)}} outline color={C.red} style={{ padding:"5px 12px", fontSize:11 }}>Remove</Btn>
                            <Btn onClick={()=>fileRef.current?.click()} outline color={C.ink3} style={{ padding:"5px 12px", fontSize:11 }}>Change</Btn>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:48, marginBottom:12, opacity:.35 }}>📷</div>
                        <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:6 }}>Drop any EV photo here</div>
                        <div style={{ fontSize:12, color:C.ink3, marginBottom:16 }}>Brochure, WhatsApp image, product photo — anything works</div>
                        <div style={{ background:C.green, color:"#fff", borderRadius:10, padding:"9px 24px", display:"inline-block", fontSize:12, fontWeight:700 }}>Browse Photo</div>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e=>handleImg(e.target.files[0])} style={{ display:"none" }}/>
                  <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Optional: add context (e.g. 'comparing with Ather 450X')"
                    style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.ink, fontFamily:"inherit", marginBottom:12 }}
                  />
                  <Btn onClick={doResearch} disabled={!imgData} loading={loading} full style={{ padding:"13px" }}>
                    <span style={{ fontSize:16 }}>🔍</span>Research this Vehicle
                  </Btn>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <Spin size={44} color={C.green}/>
              <div style={{ marginTop:20, fontSize:16, fontWeight:700, color:C.ink }}>Researching EV Market...</div>
              <div style={{ marginTop:8, fontSize:12, color:C.ink3, marginBottom:16 }}>Competitor pricing · Pitch points · Objection rebuttals · Market trends</div>
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                {["Specs","Pricing","Competitors","Pitch Points","Trends"].map(l=><Tag key={l} label={l} color={C.green}/>)}
              </div>
            </div>
          )}

          {error && !loading && (
            <div style={{ background:"#FEE2E2", border:`1px solid ${C.red}30`, borderRadius:12, padding:"14px 18px", display:"flex", gap:12, alignItems:"center", maxWidth:640 }}>
              <span style={{ fontSize:20 }}>⚠️</span>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.red }}>Research Failed</div><div style={{ fontSize:11, color:C.red, marginTop:2, opacity:.8 }}>{error}</div></div>
              <button onClick={()=>setError("")} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
          )}

          {result && !loading && (
            <div ref={resRef}>
              <ResearchResult res={result} query={query} imgSrc={imgData} onReset={resetR}/>
            </div>
          )}
        </>
      )}

      {/* ══════════ COMPARE TAB ═══════════════════════════════════ */}
      {tab==="compare" && (
        <>
          {!cmpResult && !cmpLoad && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:C.ink, marginBottom:4 }}>Head-to-Head Comparison</h1>
                <p style={{ fontSize:12, color:C.ink3 }}>Pick your dealer vehicle vs a competitor — get a full battle card to win the customer</p>
              </div>

              {/* VS selector */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr", gap:16, alignItems:"start", marginBottom:20 }}>
                {/* Our vehicle */}
                <div style={{ background:C.card, border:`2px solid ${C.green}`, borderRadius:14, padding:"18px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:C.greenD, letterSpacing:"0.6px", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <span>★</span> YOUR VEHICLE
                    <span style={{ background:C.greenL, color:C.greenD, borderRadius:6, padding:"1px 7px", fontWeight:700, fontSize:9 }}>DEALER STOCK</span>
                  </div>
                  <input value={v1} onChange={e=>setV1(e.target.value)} placeholder="Type your vehicle name..."
                    style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", fontSize:13, fontWeight:600, color:C.ink, fontFamily:"inherit", marginBottom:12 }}
                  />
                  <p style={{ fontSize:10.5, color:C.ink3, marginBottom:8 }}>Quick select:</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {OUR_VEH.map(v => (
                      <button key={v} onClick={()=>setV1(v)} style={{ background:v1===v?C.greenL:C.bg, border:`1px solid ${v1===v?C.green:C.border}`, color:v1===v?C.greenD:C.ink2, borderRadius:8, padding:"5px 11px", fontSize:10.5, cursor:"pointer", fontFamily:"inherit", fontWeight:v1===v?700:400, transition:"all .12s" }}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* VS divider */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", paddingTop:54 }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:C.greenD, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, color:"#fff", fontWeight:900 }}>VS</div>
                </div>

                {/* Competitor */}
                <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"18px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:C.ink3, letterSpacing:"0.6px", marginBottom:10 }}>COMPETITOR VEHICLE</div>
                  <input value={v2} onChange={e=>setV2(e.target.value)} placeholder="Type competitor name..."
                    style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", fontSize:13, fontWeight:600, color:C.ink, fontFamily:"inherit", marginBottom:12 }}
                  />
                  <p style={{ fontSize:10.5, color:C.ink3, marginBottom:8 }}>Quick select:</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {COMP_VEH.map(v => (
                      <button key={v} onClick={()=>setV2(v)} style={{ background:v2===v?"#FEE2E2":C.bg, border:`1px solid ${v2===v?C.red:C.border}`, color:v2===v?C.red:C.ink2, borderRadius:8, padding:"5px 11px", fontSize:10.5, cursor:"pointer", fontFamily:"inherit", fontWeight:v2===v?700:400, transition:"all .12s" }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature preview */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.ink3, marginBottom:12, letterSpacing:"0.4px" }}>THIS BATTLE CARD INCLUDES</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    { i:"⚔️", l:"Head-to-Head Table",    d:"Every spec compared with clear winner" },
                    { i:"🛡️", l:"Handle Objections",     d:"Responses when customer prefers competitor" },
                    { i:"🎯", l:"5 Pitch Points",         d:"Ready-to-say lines with ₹ numbers" },
                    { i:"👥", l:"Customer Profiles",      d:"Who should buy yours vs theirs" },
                    { i:"💬", l:"3 Closing Lines",        d:"Seal-the-deal phrases for Indian customers" },
                    { i:"📊", l:"Win / Lose Score",       d:"Overall score to know your edge" },
                  ].map((f,i) => (
                    <div key={i} style={{ background:C.bg, borderRadius:10, padding:"11px 12px", display:"flex", gap:10 }}>
                      <span style={{ fontSize:17, flexShrink:0 }}>{f.i}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:C.ink }}>{f.l}</div>
                        <div style={{ fontSize:9.5, color:C.ink3, marginTop:2, lineHeight:1.4 }}>{f.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Btn onClick={doCompare} disabled={!v1.trim()||!v2.trim()} full style={{ padding:"14px", fontSize:14 }}>
                <span style={{ fontSize:18 }}>⚔️</span> Generate Battle Card
              </Btn>

              {cmpError && (
                <div style={{ background:"#FEE2E2", border:`1px solid ${C.red}30`, borderRadius:12, padding:"12px 16px", marginTop:14, fontSize:12, color:C.red, display:"flex", gap:10, alignItems:"center" }}>
                  <span>⚠️</span>{cmpError}
                </div>
              )}
            </div>
          )}

          {cmpLoad && (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <Spin size={44} color={C.green}/>
              <div style={{ marginTop:20, fontSize:16, fontWeight:700, color:C.ink }}>Building Battle Card...</div>
              <div style={{ marginTop:8, fontSize:13, color:C.ink3, marginBottom:16 }}>
                <span style={{ color:C.greenD, fontWeight:700 }}>{v1}</span>
                <span style={{ margin:"0 12px", color:C.ink3 }}>vs</span>
                <span style={{ color:C.red, fontWeight:700 }}>{v2}</span>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                {["Spec comparison","Pricing","Pitch points","Objection handlers","Closing lines"].map(l=><Tag key={l} label={l} color={C.green}/>)}
              </div>
            </div>
          )}

          {cmpResult && !cmpLoad && (
            <CompareResult res={cmpResult} v1={v1} v2={v2} onReset={resetC}/>
          )}
        </>
      )}
    </Shell>
  )
}
