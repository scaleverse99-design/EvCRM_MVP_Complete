# Dealer Onboarding Strategy

**Status**: Launch-ready  
**Updated**: 2026-08-05

## Overview

EvCRM dealer onboarding is **live and optimized for speed**. Dealers sign up in 3 minutes, get immediate access to their CRM dashboard, and can start receiving leads on day 1 of their 30-day free trial.

---

## Registration Flow (3 Minutes)

### Step 1: Account Setup (~1 min)
- Full name, email, password (8+ chars), phone
- State + district selection
- No friction — instant validation only

### Step 2: Business Verification (~1.5 min)
- Business name (legal entity)
- **GSTIN (optional)** ← Collected but not required
- Brands they sell (EV or ICE category)
- Office address

### Step 3: Preview & Launch (~0.5 min)
- Shows how dealership will appear to buyers
- ✓ Verified badge if GSTIN provided
- Instant 30-day free trial starts

---

## GSTIN Strategy: "Collect Now, Verify Later"

### Why This Approach?
- **Friction-free signup** — GSTIN is optional at registration
- **Show value first** — Dealers see the platform before verification delays them
- **Build trust gradually** — Follow up after they're using the product

### What Happens Now
1. **Signup** → Dealers provide GSTIN (if they have it ready)
2. **Saved** → GSTIN stored in `evcrm_users.gstin` and `dealers.gstNumber`
3. **Instant badge** → Format validation only (basic check)
4. **No API wait** → No govt verification latency at signup

### What Happens Later (Follow-ups)
Dealers get verification emails at key points in their trial:

| Day | Email | Purpose |
|-----|-------|---------|
| **Day 7** | "Unlock the Verified Badge" | Once they've used the platform, verify GSTIN |
| **Day 14** | "Verified Dealers Get 30% More Leads" | Social proof + urgency |
| **Day 30** | "Complete Your Profile for Renewals" | Before trial ends, final push |

**Execution**: Run via `node scripts/send-gstin-verification-followups.js --days 7`

### Fallback: Manual Verification
Dealers who want immediate verification can:
1. Email support@evcrm.in with their GSTIN
2. Upload a document (PAN, business registration, bank statement)
3. We manually verify and flag them ✓ Verified

---

## Technical Implementation

### Registration API (`app/api/register/route.js`)
- ✅ Now accepts `gstin`, `brands`, `address` from signup form
- ✅ Saves GSTIN to `evcrm_users.gstin`
- ✅ Creates `dealers` table row with:
  - `gstNumber` (the GSTIN)
  - `gstVerified: false` (for tracking)
  - `gstVerificationAttempts: 0` (for retry logic)
  - `brands` array (their inventory categories)
  - `category` (EV or ICE)

### Follow-up Tracking (`lib/cte/RUN_ME_IN_SUPABASE.sql`)
- New table: `gstin_verification_followups`
- Tracks: dealer, email, GSTIN, verification status, follow-up count, timestamps
- Run SQL to create table (comes with next prod deploy)

### Follow-up Script (`scripts/send-gstin-verification-followups.js`)
```bash
# Day 7 of trial
node scripts/send-gstin-verification-followups.js --days 7

# Day 14 of trial
node scripts/send-gstin-verification-followups.js --days 14
```

---

## Dealer Experience

### Day 1 (Signup)
- Sign up, provide GSTIN (if ready)
- Land in dashboard with 12 feature tabs
- See welcome email with onboarding guide link

### Day 7 (Engagement)
- Email: "Unlock the Verified Badge"
- Can click and verify GSTIN (or ignore)
- No friction if they skip

### Day 30 (Trial End)
- Email: "Your trial is ending"
- Subscription options or cancel

---

## What's Blocking Launch?

### Immediate (Required to Launch)
- [ ] Link `/help/dealer-onboarding` in homepage nav
- [ ] Test registration flow end-to-end
- [ ] Set up welcome email template

### Short-term (Can Be Async)
- [ ] Analytics API (`/api/dealer/analytics`) with real data
- [ ] GSTIN verification follow-up cron/scheduler
- [ ] Manual verification workflow for support team

---

## Metrics to Watch

After first 10 dealers onboard:
1. **Signup completion rate** — % who finish all 3 steps
2. **GSTIN submission rate** — % who provide a GSTIN at signup
3. **Dashboard first login** — % who enter their dashboard
4. **7-day retention** — % still active on day 7
5. **Verification response rate** — % who reply to verification email

---

## Rollback Plan

If dealers complain about GSTIN friction:
1. Make GSTIN truly optional (remove it from UI, keep API acceptance)
2. Move follow-ups to day 14+ (give more trial time first)
3. Add "Skip for now" button in settings

---

## Links

- **Signup**: `/register`
- **Help**: `/help/dealer-onboarding` (12 FAQ + 3-step guide)
- **Analytics**: `/dealer/analytics` (performance dashboard — mock data, ready for API)
- **API**: `/api/register` (POST to create dealer)
- **Follow-up Script**: `scripts/send-gstin-verification-followups.js`
