# EvCRM — Complete Cost Analysis (2026-07-18)

> **Purpose**: Total cost of ownership for the CRM + Marketplace platform  
> **Scale**: Baseline (10 dealers), Growth (50 dealers), Scale (500+ dealers)  
> **Currency**: INR (₹) + USD (where applicable)

---

## Executive Summary

| Scenario | Monthly Cost | Annual Cost | Per-Dealer Cost |
|----------|------------|-----------|-----------------|
| **Baseline (10 dealers)** | ₹15,000–20,000 | ₹180K–240K | ₹1,500–2,000 |
| **Growth (50 dealers)** | ₹50,000–70,000 | ₹600K–840K | ₹1,000–1,400 |
| **Scale (500 dealers)** | ₹300,000–500,000 | ₹3.6M–6M | ₹600–1,000 |

**Note**: Costs decrease per-dealer as infrastructure scales (fixed costs amortized over more users)

---

## Detailed Cost Breakdown

### 1. **Backend Infrastructure** (Firebase + Cloud Run)

| Service | Plan | Monthly | Annual | Usage |
|---------|------|---------|--------|-------|
| **Cloud Run** | Pay-per-use | $10–50 | $120–600 | Backend API, ~1M requests/month |
| **Firebase Hosting** | Spark (free) | $0 | $0 | Static files, CDN |
| **Cloud Storage** | $0.020/GB | $0–30 | $0–360 | Image uploads (~10 GB/month @ scale) |
| **Cloud SQL** | N/A (using Supabase) | $0 | $0 | Moved to Supabase |
| **Subtotal (Infra)** | | **$10–80/mo** | **$120–960/yr** | |

**Note**: Firebase Blaze plan (pay-as-you-go); costs scale linearly with traffic

---

### 2. **Database (Supabase)**

| Component | Plan | Monthly | Annual | Details |
|-----------|------|---------|--------|---------|
| **Database** | Free (500 MB) | $0 | $0 | ✅ Using free tier (MVP) |
| **Upgrade (>500 MB)** | Pro | ₹2,500 | ₹30,000 | $30 → ₹2,500/mo |
| **Storage (Images)** | Per-GB | $0.015/GB | Variable | ~10 GB @ scale → ₹1,500/mo |
| **Bandwidth (Egress)** | Per-GB | $0.09/GB | Variable | Free tier: 5 GB/mo; $0.09/GB overage → ₹400/mo @ 50 dealers |
| **Real-time (optional)** | Included | $0 | $0 | Not currently used |
| **Subtotal (Database)** | | **₹0–4,300/mo** | **₹0–51,600/yr** | Scales with data |

**Recommendation**: Migrate to Storage tier ($30/mo) once >100 dealers or when egress exceeds 20 GB/month

---

### 3. **Email (Resend API)**

| Tier | Monthly Cost | Annual | Limit | Current Usage |
|------|-------------|--------|-------|----------------|
| **Free** | ₹0 | ₹0 | 100/day, 3,000/month | ✅ Current (low volume) |
| **Professional** | ₹1,500–2,000 ($20) | ₹18K–24K | 50K/month | For >500 dealers |
| **Enterprise** | Custom | Custom | Unlimited | For 1K+ dealers |

**Current emails/month** (estimated):
- Dealer registration: 2–5/mo
- Password resets: 5–10/mo
- OEM bulk imports: 100–500/mo (when running)
- Booking confirmations: 50–200/mo
- **Total**: ~200–700/month (well within free tier)

**Fallback**: Gmail SMTP (free, unlimited)

**Subtotal (Email)**: **₹0–2,000/mo** | **₹0–24K/yr**

---

### 4. **AI/ML (Gemini API)**

| Feature | API | Model | Cost/1K requests | Monthly Usage | Monthly Cost |
|---------|-----|-------|------------------|----------------|--------------|
| **Brochure PDF Parsing** | Gemini | 2.5-flash | ₹0.30 | 10–50 PDFs | ₹0–₹15 |
| **Vehicle Search** | Gemini | 2.5-flash | ₹0.30 | 100–500 queries | ₹30–₹150 |
| **News/Pulse** | Gemini (defunct) | — | — | 0 (disabled) | ₹0 |
| **Subtotal (AI)** | | | | | **₹30–₹165/mo** |

**Note**: Google Free Tier covers $300/month on Gemini API (more than sufficient for MVP)

**Subtotal (AI)**: **₹30–165/mo** | **₹360–2K/yr** *(free tier covers MVP)*

---

### 5. **Payments (Razorpay)**

| Transaction Type | Rate | Charge Cap | Monthly (10 dealers) | Monthly (50 dealers) |
|------------------|------|------------|----------------------|----------------------|
| **Test Drive Token** | 2.99% + ₹4.5 | N/A | ₹0 (test mode) | ₹0 (test mode) |
| **CRM Subscription** | 2% + ₹4.5 | N/A | ₹600–1,000 | ₹3,000–5,000 |
| **Custom Domain Setup** | 2.99% + ₹4.5 | N/A | ₹30–50 | ₹200–400 |
| **Custom Domain Monthly** | 2.99% + ₹4.5 | N/A | ₹30–50 | ₹200–400 |
| **Subtotal (Razorpay)** | | | **₹660–1,100/mo** | **₹3,400–5,800/mo** |

**Revenue Stream**:
- CRM subscriptions: ₹2,000–3,000 per dealer/month
- Custom domain: ₹1,000 setup (one-time) + ₹100/month
- OEM sponsorship (future): Markup on dealer subscriptions

**Razorpay takes** ~2.99% of revenue as processing fee

---

### 6. **DNS & CDN (Cloudflare)**

| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| **Free** | $0 | $0 | ✅ Current (sufficient for MVP) |
| **Pro** | $200 | $2,400 | Unlimited workers, advanced analytics |
| **Business** | $200+ | $2,400+ | Priority support, SLA |

**Current features**:
- ✅ Wildcard DNS (`*.evcrm.in`)
- ✅ DDoS protection
- ✅ Cache rules (HTML bypass, asset caching)
- ✅ Auto-purge (via API)

**Subtotal (Cloudflare)**: **₹0/mo** | **₹0/yr** *(free tier adequate)*

---

### 7. **SMS/WhatsApp (Future)**

| Service | Rate | Monthly (10 dealers) | Monthly (50 dealers) |
|---------|------|----------------------|----------------------|
| **Twilio SMS** | ₹3–5 per SMS | ₹500–1,000 | ₹2,500–5,000 |
| **WhatsApp (Twilio)** | ₹4–8 per message | ₹1,000–2,000 | ₹5,000–10,000 |
| **MSG91 SMS** | ₹1–2 per SMS | ₹200–500 | ₹1,000–2,500 |
| **Subtotal (SMS/WhatsApp)** | | **₹700–3,000/mo** | **₹3,500–15,000/mo** |

**Current status**: ❌ NOT IMPLEMENTED (MyGarage OTP is demo-mode)

**When to activate**: Once real customers exceed 50/month

---

### 8. **Monitoring & Analytics (Optional)**

| Tool | Plan | Monthly | Purpose |
|------|------|---------|---------|
| **Google Analytics** | Free | $0 | Traffic, user behavior |
| **Sentry** (Error tracking) | Free | $0 | Error monitoring |
| **LogRocket** (Session replay) | Pro | $129 | Debug production issues |
| **PostHog** (Product analytics) | Cloud | $0–500 | Feature adoption, funnels |

**Subtotal (Monitoring)**: **₹0–15,000/mo** *(optional, mostly free tier)*

---

## Total Monthly Cost Summary

### MVP (Free Tier Maximum)
```
Cloud Run:        ₹500–2,000
Supabase:         ₹0 (free)
Resend Email:     ₹0 (100/day free)
Gemini AI:        ₹30–165 (free tier covers)
Razorpay:         ₹660–1,100 (2.99% of revenue)
Cloudflare:       ₹0 (free)
SMS/WhatsApp:     ₹0 (not implemented)
─────────────────────────────
TOTAL:            ₹1,200–3,300/mo
```

### Growth Phase (One upgrade needed)
```
Cloud Run:        ₹1,000–3,000
Supabase Pro:     ₹2,500 (upgrade when >500MB)
Resend Email:     ₹0–2,000
Gemini AI:        ₹100–500
Razorpay:         ₹3,000–5,000 (transaction fees)
Cloudflare:       ₹0
SMS/WhatsApp:     ₹5,000–10,000 (if activated)
─────────────────────────────
TOTAL:            ₹11,600–23,000/mo
```

### Scale (Full Production)
```
Cloud Run:        ₹5,000–15,000
Supabase:         ₹2,500–10,000
Resend Email:     ₹2,000 (Professional)
Gemini AI:        ₹500–2,000
Razorpay:         ₹10,000–20,000
Cloudflare Pro:   ₹5,000
SMS/WhatsApp:     ₹15,000–30,000
Monitoring:       ₹5,000–15,000
─────────────────────────────
TOTAL:            ₹45,000–109,000/mo
```

---

## Revenue Model & Profitability

### Dealer Subscription Revenue

| Scenario | Dealers | CRM/mo | Custom Domain/mo | Monthly Revenue | Annual Revenue |
|----------|---------|--------|-----------------|-----------------|-----------------|
| **MVP (10)** | 10 | ₹2,000 | ₹100 (2 active) | ₹20,200 | ₹242,400 |
| **Growth (50)** | 50 | ₹2,500 | ₹200 (8 active) | ₹126,600 | ₹1,519,200 |
| **Scale (500)** | 500 | ₹2,000 | ₹100 (50 active) | ₹1,005,000 | ₹12,060,000 |

### Gross Margin (After Razorpay)

```
Scenario         Revenue    Razorpay Fee (2.99%)    Net Margin
MVP (10)         ₹20,200    ₹604                    ₹19,596 (97%)
Growth (50)      ₹126,600   ₹3,789                  ₹122,811 (97%)
Scale (500)      ₹1,005,000 ₹30,049                 ₹974,951 (97%)
```

### Profitability (Revenue - Infrastructure Costs)

```
Scenario         Revenue    Infrastructure Cost   Profit     Margin
MVP              ₹20,200    ₹1,200–3,300         ₹16,900–19,000   83–94%
Growth           ₹126,600   ₹11,600–23,000       ₹103,600–115,000 81–91%
Scale            ₹1,005,000 ₹45,000–109,000      ₹896,000–960,000 89–95%
```

**Key insight**: Platform is highly profitable at scale (89–95% margin after all costs)

---

## Cost Optimization Strategies

### Immediate (0-3 months)
- ✅ Keep free tiers (Supabase, Resend, Gemini, Cloudflare)
- ✅ Use Firebase Spark plan → Blaze only when >1M requests/month
- ✅ Gmail fallback for email (free, unlimited)
- ✅ Defer SMS/WhatsApp until 50+ dealers need it

### Short-term (3-6 months)
- Upgrade Supabase to Pro ($30/mo) only if >500 MB data
- Monitor Cloud Run costs; optimize API queries if >$50/mo
- Consider AWS RDS instead of Supabase if >1,000 dealers (cheaper at scale)

### Medium-term (6-12 months)
- Upgrade Resend ($20/mo) only if >3,000 emails/month
- Implement SMS gateway (₹1–2/SMS, but only for real customers)
- Move images to Supabase Storage ($0.015/GB, cheaper than egress)

### Long-term (12+ months)
- Self-host backend (bring Cloud Run cost from $50 to $20)
- Negotiate bulk rates with Razorpay (2.99% → 1.99% at $1M+ GMV)
- Use Stripe instead of Razorpay (1.99% + ₹5.9 vs 2.99% + ₹4.5)

---

## Comparison: All Scenarios (MVP → 1,000 Dealers)

| Metric | MVP (10) | Growth (50) | Scale (500) | Max (1,000) | Ultra (5,000) |
|--------|----------|----------|----------|-----------|-----------|
| **Monthly Cost** | ₹1.2K–3.3K | ₹11.6K–23K | ₹100K–170K | ₹133K–215K | ₹600K–900K |
| **Monthly Revenue** | ₹20.2K | ₹126.6K | ₹1,005K | ₹2,010K | ₹10,050K |
| **Monthly Profit** | ₹16.9K–19K | ₹103.6K–115K | ₹835K–905K | ₹1,795K–1,877K | ₹9,150K–9,450K |
| **Profit Margin** | 83–94% | 81–91% | 83–88% | 89–94% | 91–94% |
| **Annual Profit** | ₹203K–228K | ₹1.24M–1.38M | ₹10M–10.86M | ₹21.5M–22.5M | ₹109.8M–113.4M |
| **Cost per Dealer** | ₹120–330 | ₹232–460 | ₹200–340 | ₹133–215 | ₹120–180 |
| **Revenue per Dealer** | ₹2,020 | ₹2,532 | ₹2,010 | ₹2,010 | ₹2,010 |

**Key insight**: Cost per dealer DECREASES with scale (fixed costs amortized). At 1,000 dealers: **₹1.8M monthly profit with 89–94% margin**

---

## Hidden Costs Not Included

1. **Team salaries** — Not calculated (dev, ops, support)
2. **Third-party integrations** — Google Maps API, Lead scoring tools
3. **Compliance & legal** — Data protection, contractual liability
4. **Backup & disaster recovery** — Snapshots, redundancy
5. **Upgrades/replacements** — Hardware, software licenses
6. **Customer support** — Slack, Zendesk, etc.

---

## Recommended Production Stack (Day 1)

```
Service              Plan              Monthly Cost      Why
─────────────────────────────────────────────────────────
Firebase + Cloud Run Blaze (pay-use)  ₹500–2,000       Scales with traffic
Supabase             Free tier         ₹0               Adequate for MVP
Cloudflare           Free              ₹0               Wildcard DNS, DDoS
Resend               Free              ₹0               100 emails/day
Gemini API           Free tier         ₹0               $300/mo credit
Razorpay             Pay-per-use       ₹660–1,100       Included in revenue
─────────────────────────────────────────────────────────
TOTAL                                  ₹1,200–3,300/mo
```

---

## Upgrades Timeline

| Event | When | Action | Cost Impact |
|-------|------|--------|------------|
| **Data >500MB** | 6 months (est.) | Supabase Pro | +₹2,500/mo |
| **Cloud Run >$30** | 6 months (est.) | Already on Blaze | +₹1,500/mo |
| **Emails >3K/mo** | 12 months (est.) | Resend Pro | +₹2,000/mo |
| **100+ dealers** | 9–12 months (est.) | Add SMS | +₹2,500–5,000/mo |
| **Custom domains >10** | 6–9 months (est.) | None (included) | ₹0 |

---

## 1,000 Dealer Scenario (Year 2-3 Target)

**When**: Assuming ~10 dealers/month growth, reach 1,000 dealers by Month 100 (3+ years)

| Metric | Monthly | Annual |
|--------|---------|--------|
| **Revenue** | ₹2,010,000 | ₹24,120,000 |
| **Cost** | ₹133,000–215,000 | ₹1,596,000–2,580,000 |
| **Profit** | ₹1,795,000–1,877,000 | ₹21,540,000–22,524,000 |
| **Margin** | 89.2–93.6% | 89.2–93.6% |

**Cost breakdown at 1K dealers:**
- Cloud Run: ₹20K–50K (heavy infrastructure)
- Supabase: ₹5K–20K (large database)
- Razorpay: ₹60K–70K (payment processing)
- SMS/WhatsApp: ₹30K–50K (activated at scale)
- Other services: ₹18K–25K (email, API, monitoring)

**Key insight**: Cost per dealer drops to **₹133–215** (from ₹120–330 at MVP), but margin stays **89–94%**. This is ultra-profitable scaling.

---

## Bottom Line

| Milestone | Monthly Cost | Monthly Revenue | Monthly Profit | Margin | Timeline |
|-----------|------------|-----------------|-----------------|--------|----------|
| **MVP (10 dealers)** | ₹1.2K–3.3K | ₹20.2K | ₹16.9K–19K | 83–94% | Month 1 |
| **Growth (50 dealers)** | ₹11.6K–23K | ₹126.6K | ₹103.6K–115K | 81–91% | Month 5 |
| **Scale (500 dealers)** | ₹100K–170K | ₹1,005K | ₹835K–905K | 83–88% | Month 50 |
| **Max (1,000 dealers)** | ₹133K–215K | ₹2,010K | ₹1,795K–1,877K | 89–94% | Month 100 |

**Conclusion**: 
- ✅ **Immediately profitable** from MVP launch (payback <1 month)
- ✅ **Scales beautifully** — cost per dealer decreases, margin stays 89–94%
- ✅ **Year 1 profit**: ₹203K–228K (MVP)
- ✅ **Year 3 profit**: ₹21.5M–22.5M (1,000 dealers)
- ✅ **5-year projection**: Could reach ₹100M+ annual profit at scale

---

## Footnotes

- **Razorpay rates**: 2.99% + ₹4.5 per transaction (includes bank charges)
- **Exchange rate**: 1 USD = ₹83 (as of 2026-07-18)
- **Firebase pricing**: $0.40/GB egress (₹33/GB), $0.0001 per read/write
- **Supabase pricing**: $30/mo Pro (₹2,500), $0.015/GB storage, $0.09/GB egress
- **All figures assume**: Dev server (local), no duplicate infrastructure, no redundancy
- **Not included**: Domain registration (₹600–2,000/year per domain)

