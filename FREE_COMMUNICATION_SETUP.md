# Free Communication Setup (No APIs, No Costs)
## Manual WhatsApp + Simple Email

**Cost**: ₹0/month  
**Setup Time**: 30 minutes  
**Tools**: WhatsApp (manual), Gmail/Email account, NodeMailer

---

## 📱 **Option 1: Manual WhatsApp Broadcasting (FREE)**

### **Method A: WhatsApp Broadcast Groups (No API)**

**Setup: 5 minutes**

```
1. Open WhatsApp on your phone (or web: web.whatsapp.com)
2. Create broadcast lists or groups
3. Add dealer phone numbers to groups
4. Send WhatsApp templates directly (copy-paste from WHATSAPP_TEMPLATES.md)
5. Dealer clicks link → arrives at /register?utm_source=whatsapp
```

**Broadcast Groups to Create:**

```
1. "EvCRM Dealers - Hyderabad" (max 256 members)
2. "EvCRM Dealers - Delhi" (max 256 members)
3. "EvCRM Dealers - Mumbai" (max 256 members)
4. "EvCRM OEM Partners" (max 256 members)
```

**How to Send Broadcasts:**

```
1. Open WhatsApp → New Broadcast
2. Select contacts (or copy phone numbers)
3. Type message from WHATSAPP_TEMPLATES.md
4. Add tracking link: https://evcrm.in/register?utm_source=whatsapp&campaign=dealer_free_100
5. Send!

No API, no costs, just manual messaging.
```

### **Method B: WhatsApp Web Automation (Semi-Auto, No Cost)**

If you want semi-automation without API:

**Install Puppeteer** (to control WhatsApp Web):

```bash
npm install puppeteer dotenv
```

**Create WhatsApp Sender** (`lib/whatsapp-manual.js`):

```javascript
const puppeteer = require('puppeteer')
const fs = require('fs')

async function sendWhatsAppWebMessage(groupName, message) {
  const browser = await puppeteer.launch({
    headless: false, // Must see it manually scan QR code first time
    args: ['--disable-notifications']
  })

  try {
    const page = await browser.newPage()
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' })

    // First time: manually scan QR code in browser window
    console.log('📱 Scan QR code in opened browser window...')
    await page.waitForTimeout(15000) // Wait 15 seconds for manual scan

    // Find the group by name
    const searchBox = await page.$('[contenteditable="true"]')
    if (searchBox) {
      await searchBox.click()
      await page.type('[contenteditable="true"]', groupName)
      await page.waitForTimeout(1000)

      // Click first search result
      const firstResult = await page.$('[data-testid="chat"]')
      if (firstResult) await firstResult.click()
    }

    // Wait for chat to load
    await page.waitForTimeout(2000)

    // Type and send message
    const messageBox = await page.$('[contenteditable="true"]')
    if (messageBox) {
      await messageBox.click()
      await page.type('[contenteditable="true"]', message)
      await page.waitForTimeout(500)

      // Send button
      const sendButton = await page.$('[data-testid="send"]')
      if (sendButton) await sendButton.click()

      console.log('✅ Message sent to', groupName)
    }

    await page.waitForTimeout(1000)
  } catch (error) {
    console.error('WhatsApp Web error:', error.message)
  } finally {
    await browser.close()
  }
}

module.exports = { sendWhatsAppWebMessage }
```

**Use It:**

```javascript
import { sendWhatsAppWebMessage } from '../../../lib/whatsapp-manual'

// Send to group
await sendWhatsAppWebMessage('EvCRM Dealers - Hyderabad', `
🚗⚡ FREE EV Dealer Platform for 30 Days

Join 100+ dealers getting real leads:
✅ Lead management
✅ WhatsApp integration
✅ Pricing tools
✅ 30 days FREE

👉 https://evcrm.in/register?utm_source=whatsapp&campaign=dealer_free_100

Only [SPOTS] spots left!
`)
```

**Pros:**
- ✅ 100% free
- ✅ No API costs
- ✅ Uses your personal WhatsApp

**Cons:**
- ⚠️ Manual first-time QR scan needed
- ⚠️ Slower than API (waits for browser)
- ⚠️ Can't send at scale (rate limited by WhatsApp)

**Best for**: Sending to 5-10 groups manually or semi-automated.

---

## 📧 **Option 2: Simple Email (FREE)**

### **Using NodeMailer + Gmail**

**Setup: 10 minutes**

**Step 1: Enable Gmail App Password**

```
1. Go to: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. App passwords → Select "Mail" + "Windows Computer"
4. Google generates 16-char password
5. Copy and save securely
```

**Step 2: Install NodeMailer**

```bash
npm install nodemailer dotenv
```

**Step 3: Create Email Service** (`lib/email-nodemailer.js`):

```javascript
const nodemailer = require('nodemailer')

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_APP_PASSWORD // 16-char app password, NOT Gmail password
  }
})

async function sendWelcomeEmail(dealerEmail, dealerName) {
  try {
    await transporter.sendMail({
      from: `EvCRM <${process.env.EMAIL_ADDRESS}>`,
      to: dealerEmail,
      subject: '🎉 Welcome to EvCRM! Your Free Trial Starts Now',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${dealerName},</h2>
          
          <p>Welcome to EvCRM! Your <strong>30-day free trial</strong> has started.</p>
          
          <h3>✅ What's Included:</h3>
          <ul>
            <li>Full dealer dashboard</li>
            <li>Lead management</li>
            <li>WhatsApp integration</li>
            <li>Pricing tools (BuildPrice, QuotePro)</li>
            <li>Team member access</li>
            <li>Performance analytics</li>
          </ul>
          
          <h3>🚀 Quick Start:</h3>
          <ol>
            <li><a href="https://evcrm.in/dealer">Log in to dashboard</a></li>
            <li>See sample vehicles (already loaded)</li>
            <li>Add your vehicles</li>
            <li>Start getting leads!</li>
          </ol>
          
          <p>
            <a href="https://evcrm.in/dealer" style="background: #1B4332; color: white; 
               padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Open Dashboard →
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Need help? Reply to this email or WhatsApp us at ${process.env.SUPPORT_PHONE}
          </p>
        </div>
      `
    })

    console.log('✅ Email sent to', dealerEmail)
    return { success: true }
  } catch (error) {
    console.error('Email error:', error.message)
    return { success: false, error: error.message }
  }
}

async function sendTrialExpiringEmail(dealerEmail, dealerName, daysLeft) {
  try {
    await transporter.sendMail({
      from: `EvCRM <${process.env.EMAIL_ADDRESS}>`,
      to: dealerEmail,
      subject: `⏰ Your EvCRM trial ends in ${daysLeft} days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${dealerName},</h2>
          
          <p>Your free trial ends in <strong>${daysLeft} days</strong>.</p>
          
          <p>You can:</p>
          <ul>
            <li><strong>₹4,999/month</strong> - Full access (best for active dealers)</li>
            <li><strong>Free tier</strong> - Limited features (1 vehicle, no team members)</li>
            <li><strong>Cancel anytime</strong> - No lock-in</li>
          </ul>
          
          <p>
            <a href="https://evcrm.in/dealer/settings" style="background: #1B4332; color: white; 
               padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Choose Plan →
            </a>
          </p>
        </div>
      `
    })

    console.log('✅ Expiry email sent to', dealerEmail)
    return { success: true }
  } catch (error) {
    console.error('Email error:', error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendWelcomeEmail, sendTrialExpiringEmail }
```

**Add to .env:**

```
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char app password
SUPPORT_PHONE=+91-9876543210
```

**Use in Code** (`app/api/register/route.js`):

```javascript
import { sendWelcomeEmail } from '../../../lib/email-nodemailer'

// After dealer registers
await sendWelcomeEmail(newUser.email, body.name)
```

---

## ❌ **Skip OTP (Simple Registration)**

Current registration requires phone verification. **Remove OTP:**

**Edit: `app/register/page.js`**

```javascript
// REMOVE OTP step, just verify email

const handleSubmit = async () => {
  // Direct registration, no OTP
  const res = await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      dealership: form.businessName,
      dealerCategory: form.dealerCategory,
      gstin: form.gstin,
      brands: form.brands,
      address: form.address
    })
  })

  if (res.ok) {
    // Direct to dashboard, no OTP step
    window.location.assign("/dealer")
  }
}
```

**Result: 3-step registration → 2-step (no OTP)**

---

## 📊 **Setup Summary**

| Component | Method | Cost | Time |
|-----------|--------|------|------|
| WhatsApp | Manual groups + browser | ₹0 | 5 mins |
| Email | NodeMailer + Gmail | ₹0 | 10 mins |
| SMS | Optional (skip if budget) | ₹0 | 0 mins |
| OTP | Skip (remove) | ₹0 | 5 mins |
| **TOTAL** | **Free setup** | **₹0/month** | **20 mins** |

---

## 🚀 **Quick Start (30 Minutes)**

### **Minute 0-10: Email Setup**

```bash
# 1. Get Gmail app password (https://myaccount.google.com/apppasswords)
# 2. Run:
npm install nodemailer

# 3. Add to .env:
# EMAIL_ADDRESS=your-email@gmail.com
# EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### **Minute 10-20: Create Email Service**

Copy `lib/email-nodemailer.js` from above (no edits needed)

### **Minute 20-25: Wire to Registration**

Edit `app/api/register/route.js`:
```javascript
import { sendWelcomeEmail } from '../../../lib/email-nodemailer'

// Add after dealer created:
await sendWelcomeEmail(newUser.email, body.name)
```

### **Minute 25-30: Manual WhatsApp Setup**

```
1. Create WhatsApp groups for dealers
2. Add contacts
3. Copy templates from WHATSAPP_TEMPLATES.md
4. Send manually or use Puppeteer script
```

---

## 📝 **Campaign Execution (Free Version)**

### **Week 1: Launch**

```
Day 1 (Morning):
✅ Homepage live
✅ Dummy inventory loaded
✅ Email automation active
✅ Create WhatsApp groups

Day 1 (Afternoon):
✅ Send WhatsApp to groups (manual copy-paste)
✅ Post on social media
✅ Monitor first signups

Day 3:
✅ Follow-up WhatsApp to non-responders
✅ Email successful registrations "welcome!"
```

### **Week 2-4: Scale**

```
Every 3 days:
✅ Send WhatsApp to groups: "X spots filled, Y remaining"
✅ Share success stories on social media
✅ Day 28: Send trial-expiring emails
```

---

## 💡 **Pro Tips**

### **WhatsApp Automation (Optional)**

If you want to send to multiple groups without copy-paste:

```javascript
// Use Puppeteer to semi-automate
// Still manual, but faster than copy-paste to 10 groups

const groups = [
  'EvCRM Dealers - Hyderabad',
  'EvCRM Dealers - Delhi',
  'EvCRM Dealers - Mumbai',
  'EvCRM OEM Partners'
]

for (const group of groups) {
  await sendWhatsAppWebMessage(group, messageTemplate)
  await delay(2000) // Rate limiting
}
```

### **Tracking Without APIs**

WhatsApp links go through your registration page:
```
https://evcrm.in/register?utm_source=whatsapp&utm_campaign=dealer_free_100
```

Google Analytics tracks:
- Clicks (from WhatsApp)
- Signups (completed registration)
- Activation (first login)

Simple and free!

### **Email Sending Limits**

Gmail: 500 emails/day (more than enough for 100 dealers)

If you hit limits: use your domain's email server or alternate Gmail accounts.

---

## ✅ **Checklist**

- [ ] Gmail app password generated
- [ ] NodeMailer installed
- [ ] .env configured (EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
- [ ] Email service created (`lib/email-nodemailer.js`)
- [ ] Registration wired to send welcome email
- [ ] WhatsApp groups created (5-10 groups, 256 members each)
- [ ] WhatsApp templates copied to notes app
- [ ] Puppeteer installed (optional, for semi-automation)
- [ ] OTP step removed from registration
- [ ] Campaign templates ready in WHATSAPP_TEMPLATES.md
- [ ] Dummy inventory loaded
- [ ] Homepage banner live

**All set! Zero costs, ready to launch tomorrow.** ✅

---

## 🎯 **Campaign Flow (No APIs)**

```
Dealer sees WhatsApp message
        ↓
Clicks link → https://evcrm.in/register?utm_source=whatsapp
        ↓
Fills registration (3 steps, no OTP)
        ↓
Confirmation: Dashboard opens
        ↓
Welcome email sent (NodeMailer)
        ↓
Email: "See dashboard, demo vehicles loaded"
        ↓
Dealer logs in, sees inventory
        ↓
Gets leads, converts to paid
        ↓
Success! 🎉
```

**100% manual, 100% free, works great for first 100 dealers.**

---

## 📞 **Support Channel**

Add support phone to emails:
```
Need help? WhatsApp us: +91-9876543210
or Email: support@evcrm.in
```

You handle inquiries manually (or forward to support team).

---

**You're ready. No APIs, no costs, launch tomorrow!** 🚀
