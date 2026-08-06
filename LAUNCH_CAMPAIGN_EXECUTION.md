# Launch Campaign Execution Guide
## "Free for First 100 Dealers" — Ready to Deploy

**Campaign Status**: ✅ Ready to Launch  
**Target**: 100 dealers in first month  
**Timeline**: Launch today, track for 4 weeks

---

## 🚀 **Pre-Launch Checklist (Do These First)**

### 1. **Database Setup** (5 minutes)
```bash
# Create FIRST100 promo code
# (Add to database via Supabase SQL editor)

INSERT INTO promo_codes (code, discount_type, value, max_uses, expires_at) 
VALUES ('FIRST100', 'trial_extension', 0, 100, NOW() + INTERVAL '30 days');

# Update evcrm_users table to track first 100
ALTER TABLE evcrm_users ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE evcrm_users ADD COLUMN IF NOT EXISTS first_100_dealer BOOLEAN DEFAULT FALSE;
```

### 2. **Load Dummy Inventory** (10 minutes)
```bash
# Create seed script
touch scripts/seed-demo-inventory.js

# (Use code from DUMMY_INVENTORY_SETUP.md)

# Run to load 3 sample vehicles
node scripts/seed-demo-inventory.js

# Verify in Supabase
SELECT * FROM dealer_inventory WHERE dealership = 'green-motors-hyderabad' LIMIT 5;
```

### 3. **Update Homepage** (15 minutes)
```bash
# Edit: app/page.js or app/showroom/ShowroomClient.js
# Add banner from PROMOTIONAL_MATERIALS.md
# Replace [_] spots remaining with live counter

# Add component to track spot usage:
const spotsUsed = await fetch('/api/admin/first-100-signups').then(r => r.json())
```

### 4. **Set Up Email Sequences** (20 minutes)
- Integrate email service (Sendgrid / Mailgun)
- Create welcome email (from PROMOTIONAL_MATERIALS.md)
- Schedule trial-ending email for day 28
- Set up SMS gateway (Twilio / AWS SNS)

### 5. **Create Tracking Dashboard** (30 minutes)
- Create `/admin/campaigns` page
- Track: clicks, signups, activations, conversions
- Display live metrics: signups, spots remaining, trial users

---

## 📋 **Campaign Content Ready to Use**

### **Files Created for You:**

1. **[WHATSAPP_TEMPLATES.md](WHATSAPP_TEMPLATES.md)**
   - 5 ready-to-use WhatsApp templates
   - Dealer acquisition (DM + broadcast)
   - OEM recruitment  
   - Referral bonus message
   - All with UTM tracking links

2. **[DUMMY_INVENTORY_SETUP.md](DUMMY_INVENTORY_SETUP.md)**
   - 3 sample vehicles (Nexon, Ather, Mahindra)
   - Seed script ready to run
   - JSON structure for inventory
   - Display examples

3. **[PROMOTIONAL_MATERIALS.md](PROMOTIONAL_MATERIALS.md)**
   - Homepage banner HTML
   - Welcome email template (copy-paste)
   - Dashboard banner component
   - SMS templates (3x)
   - Social media posts (4 platforms)
   - Referral email

---

## 📱 **Step-by-Step Execution**

### **Phase 1: Go Live (Day 1)**

```
🟢 Morning (9 AM)
✅ Update homepage with banner + spot counter
✅ Load dummy inventory to 5 test dealers
✅ Enable FIRST100 promo code
✅ Activate welcome email automation
✅ Test registration flow yourself

🟢 Afternoon (2 PM)
✅ Send SMS to 500 dealers (Template: "Limited offer - 30 days free")
✅ Start posting on social media
✅ Send email to existing contacts (referral angle)
✅ Notify partner network (OEMs, auto forums, etc)

🟢 Evening (5 PM)
✅ Launch WhatsApp broadcast to dealer groups
✅ Monitor dashboard for first signups
✅ Check email delivery rate
✅ Screenshot early momentum for social proof
```

### **Phase 2: Momentum (Days 2-7)**

```
Daily:
✅ Monitor signups dashboard
✅ Check if spots counter is updating
✅ Respond to inquiries within 2 hours
✅ Share early success stories

Day 3:
✅ Send SMS to non-clickers (second message)
✅ Post first customer success story to social
✅ Contact top 10 signups (call them, give onboarding help)

Day 5:
✅ Share on LinkedIn (post format in PROMOTIONAL_MATERIALS.md)
✅ Activate dealer referral program
✅ Send mid-week "50 spots filled, 50 left!" email
```

### **Phase 3: Peak Push (Days 8-14)**

```
Day 10:
✅ Email blast: "Limited spots remaining!" 
✅ SMS reminder to all dealers (urgency angle)
✅ Partner outreach (OEM contacts, dealer networks)

Day 12:
✅ Highlight top performers (who got most leads)
✅ Share testimonials & success stories
✅ Increase frequency of social posts

Day 14:
✅ Launch referral incentive (if 60+ signed up)
✅ "Nearly Full" messaging everywhere
✅ Prepare for overflow/waitlist
```

### **Phase 4: Close Out (Days 15-30)**

```
When 100 Reached:
✅ Update banner: "100/100 - Waitlist Now Open"
✅ Create waitlist form
✅ Email all 100: "You made it! Here's your free access"
✅ Celebrate on social media
✅ Contact waitlisted dealers for next batch

Day 28 (Trial Ending Soon):
✅ Send "Your trial ends in 2 days" email
✅ Offer upgrade path: ₹4,999/month or free tier
✅ Special offer: First 20 upgraders get 3 months free rep
✅ Highlight their stats (X leads received, Y inquiries)
```

---

## 📊 **Real-Time Tracking**

### **Create Dashboard API** 
Add to `app/api/admin/campaign-metrics/route.js`:

```javascript
export async function GET() {
  const sb = createClient()

  // Total signups today
  const today = await sb
    .from('evcrm_users')
    .select('id')
    .eq('role', 'dealer')
    .gte('created_at', new Date().toISOString().split('T')[0])

  // Total first 100 signups  
  const first100 = await sb
    .from('evcrm_users')
    .select('id')
    .eq('first_100_dealer', true)

  // Trial activated (logged in)
  const activated = await sb
    .from('evcrm_users')
    .select('id')
    .eq('first_100_dealer', true)
    .neq('last_login', null)

  // Inventory uploaded
  const withInventory = await sb
    .from('evcrm_users')
    .select('id')
    .eq('first_100_dealer', true)
    .eq('has_inventory', true)

  return Response.json({
    spotsUsed: first100.data?.length || 0,
    spotsRemaining: 100 - (first100.data?.length || 0),
    activated: activated.data?.length || 0,
    activationRate: first100.data?.length > 0 
      ? Math.round((activated.data?.length / first100.data.length) * 100)
      : 0,
    withInventory: withInventory.data?.length || 0,
    inventoryRate: first100.data?.length > 0
      ? Math.round((withInventory.data?.length / first100.data.length) * 100)
      : 0,
    todaySignups: today.data?.length || 0,
  })
}
```

---

## 🎯 **WhatsApp Execution**

### **Groups to Target**

```
1. Dealer Networks (300-500 members each)
   - Delhi Auto Dealers
   - Mumbai Vehicle Resellers  
   - Bangalore EV Community
   - Hyderabad Auto Trade

2. OEM/Franchise Networks
   - Tata Showrooms India
   - Ather Energy Dealers
   - Mahindra EV Dealers
   - TVS Network

3. Industry Forums
   - Auto Industry Association
   - EV Startups India
   - Automotive Tech Group
   - Dealer Forums (city-specific)
```

### **Message Schedule**

```
Day 1 (9 AM): Dealer Template #1 (direct message to known dealers)
Day 1 (2 PM): Dealer Template #2 (broadcast to groups)
Day 3 (10 AM): Follow-up to non-responders
Day 7 (2 PM): "Spots filling fast" message
Day 14 (10 AM): "Nearly full" urgency
Day 30 (9 AM): Trial ending email (alternate channel)
```

---

## 📈 **Expected Results (Conservative Estimate)**

| Metric | Target | Tracking Link |
|--------|--------|---------------|
| WhatsApp impressions | 50,000 | Group analytics |
| CTR (clicks) | 8% = 4,000 | UTM parameters |
| Signup rate | 10% = 400 | Google Analytics |
| Trial activation | 75% = 300 | Dashboard logins |
| Inventory upload | 60% = 180 | API call count |
| First lead received | 40% = 120 | Leads DB |
| Upgrade to paid | 30% = 90 | Stripe events |

**Revenue Projection**: 90 dealers × ₹4,999 × 12 months = **₹54L annual recurring**

---

## 🔧 **Technical Checklist**

- [ ] Promo code FIRST100 in database
- [ ] Homepage banner component created
- [ ] Spot counter API built (`/api/admin/first-100-signups`)
- [ ] Dummy inventory seeded to test dealers
- [ ] Email templates configured in sendgrid/mailgun
- [ ] SMS gateway (Twilio) configured
- [ ] UTM tracking parameters live
- [ ] Analytics dashboard created
- [ ] Welcome email automation active
- [ ] Trial expiry scheduler running
- [ ] Upgrade flow tested end-to-end
- [ ] Social media graphics created
- [ ] WhatsApp message links tested

---

## 💼 **OEM Outreach Angle**

Use this for contacting OEMs directly:

```
Subject: Partner with EvCRM - Reach 100+ Dealers in 7 Days

Hi [OEM Manager],

We're launching a "free for first 100 dealers" campaign starting [DATE].

This is ideal for OEMs because:
✅ 100+ partners on one platform by week 2
✅ Real-time visibility into dealer network  
✅ Zero setup cost for you + your dealers
✅ Co-marketing opportunity

Brands participating: Tata, Mahindra, Ather, OLA, TVS

Interested in co-promoting this to your dealer network?

Reply or call +91-XXXXX for partnership options.

Best,
[Your Name]
```

---

## 📞 **Support Team Prep**

Brief your support team on:

1. **Common Questions**
   - How to add first vehicle
   - How to receive leads
   - How to accept payment later
   - What happens after trial ends

2. **Escalation Paths**
   - Lead quality issues → engineering
   - Payment questions → billing
   - Technical bugs → tech support
   - "Too expensive" → upsell free tier

3. **Proactive Outreach**
   - Call top 20 signups (day 3)
   - Offer onboarding help
   - Send tips via WhatsApp

---

## ✅ **Go/No-Go Decision**

**Before launching, confirm:**

- [ ] Homepage updated ✅
- [ ] Email sequences working ✅
- [ ] SMS gateway live ✅
- [ ] WhatsApp templates ready ✅
- [ ] Dummy inventory loaded ✅
- [ ] Analytics tracking live ✅
- [ ] Support team ready ✅
- [ ] First 5 dealers tested end-to-end ✅

**If all ✅: LAUNCH TODAY**

**If any ❌: Fix before launch**

---

## 🎬 **Launch Announcement Message**

Post this on all channels Day 1:

```
🚀 **LIVE NOW: Free EV Dealer Platform for 30 Days**

We just launched EvCRM and we're giving away FREE access to the first 100 dealers.

No credit card. No setup fee. Cancel anytime.

What you get:
📊 Lead management dashboard
💬 WhatsApp integration  
💰 Pricing tools
📈 Performance analytics

First 100 dealers: https://evcrm.in/register?promo=FIRST100

Only [X] spots remaining! 🔥

Questions? Reply here or WhatsApp https://wa.me/91XXXXX

#EV #Dealers #Startup
```

---

## 📅 **Campaign Calendar (4 Weeks)**

Print this and post in office:

```
WEEK 1 - LAUNCH WEEK
├─ Day 1: Go live + all channels
├─ Day 3: SMS follow-up + stories
├─ Day 5: Email + social posts
└─ Day 7: Mid-week "momentum" push

WEEK 2 - SCALING
├─ Day 10: Email "50 spots left"
├─ Day 12: LinkedIn + testimonials  
└─ Day 14: Partner outreach

WEEK 3 - PEAK
├─ Day 17: Waitlist prep
├─ Day 19: Referral launch
└─ Day 21: Success stories

WEEK 4 - CLOSE
├─ Day 24: "Nearly full" messages
├─ Day 28: Trial ends, upgrade offer
├─ Day 30: Celebrate 100, launch waitlist
└─ Day 31: Analyze results
```

---

## 🎁 **Bonus: Referral Incentive**

If 60+ dealers sign up by day 7, activate referral bonuses:

- Each dealer: ₹500 per referral
- Capped at ₹5,000/month per dealer
- Valid for 90 days after signup
- Automatic payout when referee upgrades

---

**You're ready. Launch today and track daily. Questions? All materials are in the repo.**

**Next: Execute Phase 1 ✅**
