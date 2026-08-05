"use client"
import { useState } from "react"
import { C } from "../../../lib/constants"

const FAQ_ITEMS = [
  {
    q: "What is evcrm.in and why should I join?",
    a: "evcrm.in is India's largest dealer network for EV sales. We connect you with verified buyers actively looking for your brands, manage your leads end-to-end, and provide tools (BuildPrice, QuotePro) to close faster."
  },
  {
    q: "Is there a sign-up fee or upfront cost?",
    a: "No. We offer a 30-day free trial with full access to all dealer tools. After that, subscription plans start at ₹4,999/month for single-location dealers."
  },
  {
    q: "What do I need to join?",
    a: "You'll need: (1) Your mobile number and email, (2) Business name and GSTIN (optional but gets you a verified badge), (3) The brands/models you sell. That's it — takes 3 minutes."
  },
  {
    q: "What is a GSTIN and why do you ask for it?",
    a: "GSTIN is your Goods & Services Tax registration number (issued by the Indian govt). It proves your business is legitimate and gets you a ✓ Verified badge that buyers trust. You can skip it for now and add it later."
  },
  {
    q: "How do I verify my GSTIN?",
    a: "Once you enter your GSTIN during signup, we validate its format. If you provide a valid number, your dealership will show a ✓ Verified badge immediately. If you want us to cross-check it against the govt database, reply to your welcome email and we'll do that for you at no cost."
  },
  {
    q: "Can I sell both EV and ICE (petrol/diesel) vehicles?",
    a: "Yes! During signup, you choose your primary category, but you can manage both in your dashboard. We organize inventory and leads by category so you don't miss opportunities."
  },
  {
    q: "What happens after I sign up?",
    a: "You're taken straight to your dealer dashboard. There, you can: (1) Set up your dealership profile & storefront, (2) Connect your WhatsApp for lead follow-ups, (3) Upload your inventory, (4) Start receiving buyers interested in your brands."
  },
  {
    q: "Can my sales reps also use evcrm.in?",
    a: "Absolutely. You can invite team members (sales reps, managers, etc.) directly from Settings → Team Management. Each gets their own login and can manage leads assigned to them."
  },
  {
    q: "What leads will I get?",
    a: "You'll receive qualified leads from multiple channels: (1) Website visitors from evcrm.in, (2) Buyers using our BuildPrice & Subsidy calculator, (3) Referrals from OEMs. Each lead includes their name, phone, vehicle interest, and calculated purchase intent."
  },
  {
    q: "Is there a guide for first-time users?",
    a: "Yes. After signup, you'll see a 'Getting Started' guide in your dashboard. It walks you through profile setup, inventory upload, and your first lead follow-up. We also send weekly tips to your email."
  },
  {
    q: "What if I want to cancel during the trial?",
    a: "You can cancel anytime before the trial ends with no penalty. Just go to Settings → Subscription and click Pause. Your data stays with us and you can restart later."
  },
  {
    q: "How do I get support if something doesn't work?",
    a: "Email support@evcrm.in or click Help in the dashboard. Our team responds within 2 hours (9 AM–8 PM IST, Mon–Fri). For urgent issues, there's a WhatsApp number in the app."
  },
]

const STEPS = [
  {
    num: 1,
    title: "Create Your Account",
    desc: "Name, email, password, phone, and location (state + district).",
    time: "~1 min"
  },
  {
    num: 2,
    title: "Verify Your Business",
    desc: "Business name, GSTIN (optional), brands you sell, and office address.",
    time: "~1.5 min"
  },
  {
    num: 3,
    title: "Preview & Launch",
    desc: "See how you'll appear to buyers. Confirm and your dashboard is ready.",
    time: "~0.5 min"
  },
]

export default function DealerOnboardingHelp() {
  const [expandedFaq, setExpandedFaq] = useState(null)

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, color: "#fff", padding: "60px 40px", textAlign: "center" }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, margin: "0 0 12px" }}>Welcome to EvCRM 🚗⚡</h1>
        <p style={{ fontSize: 16, opacity: 0.95, margin: 0 }}>Join 500+ dealers already selling EVs smarter with our platform</p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: "60px auto", padding: "0 40px" }}>

        {/* Signup Process */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 32 }}>3-Minute Signup Process</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                background: C.card,
                border: `2px solid ${C.border}`,
                borderRadius: 16,
                padding: 28,
                textAlign: "center"
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  background: C.green,
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 900,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 8px" }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 12px", lineHeight: 1.6 }}>{step.desc}</p>
                <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>⏱️ {step.time}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 32 }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden"
              }}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    padding: 20,
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.ink,
                    fontFamily: "inherit"
                  }}
                >
                  {item.q}
                  <span style={{ fontSize: 18, transition: "transform 0.3s", transform: expandedFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {expandedFaq === i && (
                  <div style={{
                    padding: "0 20px 20px",
                    borderTop: `1px solid ${C.border}`,
                    color: C.ink2,
                    fontSize: 13,
                    lineHeight: 1.8
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{
          background: `linear-gradient(135deg, ${C.green}, ${C.blue})`,
          color: "#fff",
          borderRadius: 20,
          padding: 40,
          marginTop: 60,
          textAlign: "center"
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 12px" }}>Ready to Start?</h3>
          <p style={{ fontSize: 14, opacity: 0.9, margin: "0 0 24px" }}>30-day free trial, no card required</p>
          <a href="/register" style={{
            background: "#fff",
            color: C.green,
            padding: "12px 32px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
            display: "inline-block"
          }}>
            Start Free Trial →
          </a>
        </div>

      </div>
    </div>
  )
}
