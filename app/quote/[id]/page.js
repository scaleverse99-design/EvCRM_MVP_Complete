"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

const G = "#00B96B"
const INK = "#0D1117"
const INK2 = "#4A5568"
const INK3 = "#8B97A8"
const BG = "#F5F7FA"
const BORDER = "#E2E6EC"
const AMBER = "#F59E0B"
const AMBER_BG = "#FEF3C7"
const RED = "#EF4444"

const KYC_DOCS = [
  { id:"aadhaar_front",  label:"Aadhaar Card (Front)",           required:true,  hint:"Clear photo of front side"                       },
  { id:"aadhaar_back",   label:"Aadhaar Card (Back)",            required:true,  hint:"Clear photo of back side"                        },
  { id:"pan_card",       label:"PAN Card",                       required:true,  hint:"Required for RTO vehicle registration"           },
  { id:"address_proof",  label:"Address Proof",                  required:true,  hint:"Utility bill / rent agreement (last 3 months)"   },
  { id:"passport_photo", label:"Passport Photograph (2 copies)", required:true,  hint:"Recent white background photo"                   },
  { id:"form_60",        label:"Form 60",                        required:false, hint:"Only needed if you don't have a PAN card"        },
  { id:"finance_docs",   label:"Loan Sanction Letter",           required:false, hint:"If purchasing via vehicle finance / EMI loan"    },
  { id:"trade_in_rc",    label:"Old Vehicle RC Book",            required:false, hint:"Only if you're exchanging an old vehicle"        },
]

const RESP_STATUS = {
  agreed:       { label:"Agreed",          color:G,     bg:"#E6F7F1" },
  not_agreed:   { label:"Has Concerns",    color:RED,   bg:"#FEE2E2" },
  docs_uploaded:{ label:"Docs Uploaded",   color:G,     bg:"#E6F7F1" },
}

export default function CustomerQuotePage() {
  const { id } = useParams()
  const [quote,      setQuote]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [step,       setStep]       = useState("view")   // view | agreed | not_agreed | done_disagree | done_docs
  const [feedback,   setFeedback]   = useState("")
  const [kycDocs,    setKycDocs]    = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setQuote(d.quote)
          // Restore prior state
          const cr = d.quote.customerResponse
          if (cr === "agreed")        setStep("agreed")
          if (cr === "docs_uploaded") { setStep("done_docs"); setKycDocs(d.quote.kycDocs || {}) }
          if (cr === "not_agreed")    { setStep("done_disagree"); setFeedback(d.quote.customerFeedback || "") }
        } else setError("Quote not found or link expired.")
      })
      .catch(() => setError("Could not load quote. Please check your link."))
      .finally(() => setLoading(false))
  }, [id])

  async function patch(body) {
    setSubmitting(true)
    const r = await fetch(`/api/quotes/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
    const d = await r.json()
    setSubmitting(false)
    return d
  }

  async function handleAgree() {
    await patch({ action:"agree" })
    setStep("agreed")
  }

  async function handleNotAgreed() {
    if (!feedback.trim()) { alert("Please write your concern before submitting."); return }
    await patch({ action:"not_agreed", feedback })
    setStep("done_disagree")
  }

  function handleDocFile(docId, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setKycDocs(prev => ({ ...prev, [docId]:{ name:file.name, type:file.type, data:e.target.result, uploadedAt:new Date().toISOString() } }))
    reader.readAsDataURL(file)
  }

  async function handleSubmitDocs() {
    const missing = KYC_DOCS.filter(d => d.required && !kycDocs[d.id]).map(d => d.label)
    if (missing.length) { alert("Please upload required documents:\n• " + missing.join("\n• ")); return }
    await patch({ action:"upload_kyc", docs:kycDocs })
    setStep("done_docs")
  }

  async function handleDeleteDocs() {
    if (!confirm("Delete all uploaded documents? This cannot be undone.")) return
    await patch({ action:"delete_docs" })
    setKycDocs({})
    setStep("agreed")
  }

  const fmt = n => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—"

  const wrap = { maxWidth:480, margin:"0 auto", padding:"24px 16px 60px", fontFamily:"system-ui,-apple-system,sans-serif", color:INK, background:BG, minHeight:"100vh" }
  const card = { background:"#fff", borderRadius:16, border:`1px solid ${BORDER}`, padding:20, marginBottom:16 }
  const btnG  = { width:"100%", background:G, color:"#fff", border:"none", borderRadius:12, padding:14, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }
  const btnSec = { width:"100%", background:"#fff", color:INK2, border:`1.5px solid ${BORDER}`, borderRadius:12, padding:13, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginTop:10 }
  const chip = (color, bg, label) => <span style={{ background:bg, color, border:`1px solid ${color}30`, borderRadius:100, padding:"3px 10px", fontSize:11, fontWeight:800 }}>{label}</span>

  if (loading) return (
    <div style={{ ...wrap, display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center", color:INK3 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div style={{ fontWeight:700 }}>Loading your quote...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ ...wrap, display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
        <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>Quote Not Found</div>
        <div style={{ color:INK3, fontSize:13 }}>{error}</div>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
        <div style={{ width:28, height:28, background:G, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:14 }}>E</div>
        <span style={{ fontWeight:900, fontSize:16, letterSpacing:"-0.5px" }}>EV<span style={{ color:G }}>.CRM</span></span>
      </div>

      {/* Disclaimer */}
      <div style={{ background:AMBER_BG, border:`1.5px solid ${AMBER}`, borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#92400E", letterSpacing:"0.3px" }}>⚠️ REFERENCE DOCUMENT — NOT AN ORIGINAL GST INVOICE</div>
        <div style={{ fontSize:10, color:"#B45309", marginTop:2, lineHeight:1.5 }}>This is a price reference shared by your dealer. The actual GST invoice will be issued separately by the dealership.</div>
      </div>

      {/* Quote Card */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:INK3 }}>From</div>
            <div style={{ fontWeight:800, fontSize:14, color:INK }}>{quote.dealerName}</div>
            {quote.dealerCity && <div style={{ fontSize:11, color:INK3 }}>{quote.dealerCity}</div>}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, fontWeight:700, color:INK }}>#{quote.quoteId}</div>
            <div style={{ fontSize:10, color:INK3 }}>Valid: {quote.validityDays} days</div>
            {quote.customerResponse && chip(RESP_STATUS[quote.customerResponse]?.color || INK2, RESP_STATUS[quote.customerResponse]?.bg || BG, RESP_STATUS[quote.customerResponse]?.label || quote.customerResponse)}
          </div>
        </div>

        <div style={{ fontSize:11, color:INK3, marginBottom:4 }}>PREPARED FOR</div>
        <div style={{ fontWeight:800, fontSize:16, color:INK, marginBottom:2 }}>{quote.customerName}</div>
        {quote.customerPhone && <div style={{ fontSize:12, color:INK3, marginBottom:14 }}>{quote.customerPhone}</div>}

        {quote.vehicleName && (
          <div style={{ background:BG, borderRadius:10, padding:14 }}>
            <div style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>{quote.vehicleName}</div>
            {[
              { label:"Ex-Showroom Price",        val:quote.exShowroom,    sign:"+" },
              { label:"FAME II Subsidy",           val:quote.fameSubsidy,   sign:"−", color:G },
              { label:"State Subsidy",             val:quote.stateSubsidy,  sign:"−", color:G },
              { label:"Dealer Discount",           val:quote.dealerDiscount,sign:"−", color:G },
              { label:"Registration + Insurance", val:quote.registration,  sign:"+" },
              { label:"Accessories / Warranty",   val:quote.accessories,   sign:"+" },
            ].filter(r => r.val > 0).map((r,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:INK3 }}>{r.sign==="−" ? "✓ " : ""}{r.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:r.color||INK }}>{r.sign==="−" ? "−" : ""}₹{r.val.toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:`1px solid ${BORDER}` }}>
              <span style={{ fontWeight:800, fontSize:14 }}>Net Reference Price</span>
              <span style={{ fontWeight:900, fontSize:22, color:G }}>₹{(quote.netPrice||0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {quote.offer && (
          <div style={{ background:"#ecfdf5", borderRadius:8, padding:12, border:`1px solid ${G}30`, marginTop:12 }}>
            <div style={{ fontSize:9, fontWeight:700, color:G, letterSpacing:"0.5px", marginBottom:4 }}>SPECIAL OFFER</div>
            <div style={{ fontSize:12, color:INK, lineHeight:1.5 }}>{quote.offer}</div>
          </div>
        )}

        {quote.hasReceipt && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, background:BG, borderRadius:8, padding:"8px 12px", border:`1px solid ${BORDER}` }}>
            <span>📎</span>
            <div style={{ fontSize:11, color:INK2, fontWeight:600 }}>Purchase receipt attached by dealer</div>
          </div>
        )}
      </div>

      {/* ── STEP: VIEW — Agree / Not Agree ── */}
      {step === "view" && (
        <div style={card}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Do you agree with this quote?</div>
          <div style={{ fontSize:12, color:INK3, marginBottom:18, lineHeight:1.5 }}>Review the price breakdown above. If you're happy with it, agree below to begin uploading your KYC documents for registration.</div>
          <button onClick={handleAgree} disabled={submitting} style={{ ...btnG, marginBottom:0 }}>
            {submitting ? "Please wait…" : "✅  I Agree with This Quote"}
          </button>
          <button onClick={() => setStep("not_agreed")} style={btnSec}>
            💬  I Have Concerns / Not Agreed
          </button>
        </div>
      )}

      {/* ── STEP: NOT AGREED — Feedback form ── */}
      {step === "not_agreed" && (
        <div style={card}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:4 }}>Tell us your concern</div>
          <div style={{ fontSize:12, color:INK3, marginBottom:14, lineHeight:1.5 }}>Write your concern below. The dealer will reach out to discuss and revise the quote if needed.</div>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="e.g. The price is higher than expected. Can the dealer discount be increased? Or I need more clarity on the EMI options..."
            style={{ width:"100%", minHeight:100, background:BG, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 12px", fontSize:13, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.5, boxSizing:"border-box", color:INK }}
          />
          <button onClick={handleNotAgreed} disabled={submitting} style={{ ...btnG, marginTop:12, background:"#EF4444" }}>
            {submitting ? "Submitting…" : "Submit My Concern"}
          </button>
          <button onClick={() => setStep("view")} style={btnSec}>← Back to Quote</button>
        </div>
      )}

      {/* ── STEP: DONE DISAGREE ── */}
      {step === "done_disagree" && (
        <div style={{ ...card, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>💬</div>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Concern Submitted</div>
          <div style={{ fontSize:12, color:INK3, lineHeight:1.5 }}>Your dealer has been notified. They will review your concern and contact you shortly to discuss a revised quote.</div>
          {feedback && (
            <div style={{ marginTop:14, background:BG, borderRadius:8, padding:12, textAlign:"left" }}>
              <div style={{ fontSize:10, fontWeight:700, color:INK3, marginBottom:4 }}>YOUR CONCERN</div>
              <div style={{ fontSize:12, color:INK2, lineHeight:1.5 }}>{feedback}</div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: AGREED — KYC Upload ── */}
      {step === "agreed" && (
        <div>
          <div style={{ ...card, background:"#ecfdf5", border:`1.5px solid ${G}` }}>
            <div style={{ fontWeight:800, fontSize:15, color:G, marginBottom:4 }}>✅ Quote Accepted</div>
            <div style={{ fontSize:12, color:"#065F46", lineHeight:1.5 }}>You've agreed to this quote. Please upload the required KYC documents below for vehicle registration. Your dealer's team will handle the offline registration process.</div>
          </div>

          {/* Liability disclaimer */}
          <div style={{ background:"#FFF7ED", border:`1px solid #FDBA74`, borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#9A3412", marginBottom:4 }}>ℹ️ About Your Documents</div>
            <ul style={{ fontSize:11, color:"#C2410C", paddingLeft:16, margin:0, lineHeight:1.7 }}>
              <li>Documents are shared only with your dealer for RTO registration</li>
              <li>EV.CRM is not liable for the registration or documentation process</li>
              <li>The actual registration is handled offline by the dealer's team</li>
              <li>You can delete your uploaded documents at any time from this page</li>
            </ul>
          </div>

          {/* KYC Doc upload list */}
          <div style={card}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:14 }}>Upload KYC Documents</div>
            {KYC_DOCS.map(doc => {
              const uploaded = kycDocs[doc.id]
              return (
                <div key={doc.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:`1px solid ${BORDER}` }}>
                  <div style={{ width:36, height:36, borderRadius:8, background: uploaded ? "#ecfdf5" : BG, border:`1px solid ${uploaded ? G : BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {uploaded ? "✅" : "📄"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:INK }}>{doc.label}</span>
                      {doc.required
                        ? <span style={{ background:"#FEE2E2", color:RED, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:800 }}>REQUIRED</span>
                        : <span style={{ background:BG, color:INK3, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700 }}>OPTIONAL</span>
                      }
                    </div>
                    <div style={{ fontSize:11, color:INK3, marginBottom:6 }}>{doc.hint}</div>
                    {uploaded ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:G, fontWeight:600 }}>📎 {uploaded.name}</span>
                        <button onClick={() => setKycDocs(p => { const n={...p}; delete n[doc.id]; return n })}
                          style={{ background:"none", border:"none", color:RED, cursor:"pointer", fontSize:11, fontWeight:700, padding:0 }}>Remove</button>
                      </div>
                    ) : (
                      <label style={{ display:"inline-flex", alignItems:"center", gap:6, background:BG, border:`1px dashed ${BORDER}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:INK2 }}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleDocFile(doc.id, e.target.files?.[0])} style={{ display:"none" }} />
                        ⬆️ Upload
                      </label>
                    )}
                  </div>
                </div>
              )
            })}

            <button onClick={handleSubmitDocs} disabled={submitting}
              style={{ ...btnG, marginTop:20 }}>
              {submitting ? "Submitting…" : "📤 Submit Documents to Dealer"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: DOCS SUBMITTED ── */}
      {step === "done_docs" && (
        <div>
          <div style={{ ...card, textAlign:"center", background:"#ecfdf5", border:`1.5px solid ${G}` }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:17, color:G, marginBottom:6 }}>Documents Submitted!</div>
            <div style={{ fontSize:12, color:"#065F46", lineHeight:1.6 }}>Your KYC documents have been shared with the dealer's team. They will process the registration offline and keep you updated.</div>
          </div>

          {/* Uploaded docs summary */}
          <div style={card}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Uploaded Documents</div>
            {Object.entries(kycDocs).map(([docId, doc]) => {
              const meta = KYC_DOCS.find(d => d.id === docId)
              return (
                <div key={docId} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${BORDER}` }}>
                  <span style={{ fontSize:16 }}>📎</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:INK }}>{meta?.label || docId}</div>
                    <div style={{ fontSize:11, color:INK3 }}>{doc.name}</div>
                  </div>
                  <span style={{ fontSize:10, color:G, fontWeight:700 }}>✓ Uploaded</span>
                </div>
              )
            })}

            <div style={{ marginTop:16, background:"#FFF7ED", border:`1px solid #FDBA74`, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:11, color:"#9A3412", fontWeight:600 }}>Want to delete your documents?</div>
              <div style={{ fontSize:11, color:"#C2410C", marginBottom:10, lineHeight:1.5 }}>You can delete all uploaded documents at any time. The dealer team will be notified.</div>
              <button onClick={handleDeleteDocs} disabled={submitting}
                style={{ background:"#FEE2E2", color:RED, border:`1px solid ${RED}30`, borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {submitting ? "Deleting…" : "🗑️ Delete My Documents"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign:"center", marginTop:24, fontSize:10, color:INK3, lineHeight:1.7 }}>
        Powered by <strong style={{ color:G }}>EV.CRM</strong><br />
        EV.CRM is a platform connecting buyers and dealers. We are not responsible for the vehicle registration or documentation process. All KYC documents are shared directly with your dealer.
      </div>
    </div>
  )
}
