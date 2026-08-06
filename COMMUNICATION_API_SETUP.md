# Communication API Integration Guide
## WhatsApp, SMS, Email Setup for Campaign

**Status**: Required before campaign launch  
**Timeline**: 2-7 days to fully integrate  
**Cost**: $20-100/month depending on volume

---

## 📋 **APIs You Need**

| Channel | Provider | Setup Time | Cost | Volume/Month |
|---------|----------|-----------|------|--------------|
| **WhatsApp** | Meta Business Platform | 3-5 days | ₹0-500 | 1000s |
| **SMS** | AWS SNS / Twilio | 30 mins | ₹100-500 | 10,000s |
| **Email** | Sendgrid / Mailgun | 15 mins | ₹0-200 | 100,000s |

---

## 1️⃣ **WhatsApp Business API** (Meta)

### **Option A: Meta Cloud API (Recommended for Scale)**

**Setup Time**: 3-5 days  
**Cost**: ₹0-500/month  
**Best for**: 100+ dealers

**Step 1: Register Business Account**
```
1. Go to https://business.facebook.com/
2. Create business account (if not already)
3. Add business info (name, address, phone)
4. Verify phone number (SMS OTP)
```

**Step 2: Create WhatsApp Business App**
```
1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Choose "Business" type
4. App name: "EvCRM WhatsApp"
5. App purpose: "Business"
6. Fill business details
```

**Step 3: Add WhatsApp Product**
```
1. In app dashboard → "Add Product"
2. Search for "WhatsApp" → Click "Set Up"
3. Choose "WhatsApp Business Platform"
4. Accept terms
```

**Step 4: Get Access Token**
```
1. Go to "Settings" → "Basic"
2. Copy App ID + App Secret (save securely)
3. Go to "Messenger" → "Settings" → "Access Tokens"
4. Generate token (valid 60 days, refresh needed)
```

**Step 5: Connect Phone Number**
```
1. In WhatsApp product settings → "Phone Numbers"
2. Click "Add Phone Number"
3. Enter business WhatsApp number (verify via SMS)
4. Note the Phone Number ID (you'll need it)
```

**Step 6: Set Up Webhooks (for receiving messages)**
```
1. Go to "Webhooks" → "Manage"
2. Set Webhook URL: https://evcrm.in/api/webhooks/whatsapp
3. Webhook token: Generate secure random string (save in .env)
4. Subscribe to: messages, message_status, message_template_status_update
```

### **Integrate WhatsApp into Code**

**Install SDK:**
```bash
npm install axios dotenv
```

**Create WhatsApp Service** (`lib/whatsapp.js`):
```javascript
const axios = require('axios')

const WHATSAPP_API_URL = `https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

// Send template message (e.g., welcome message)
async function sendTemplateMessage(recipientPhone, templateName, params = []) {
  try {
    const response = await axios.post(WHATSAPP_API_URL, {
      messaging_product: "whatsapp",
      to: recipientPhone.replace(/[^\d]/g, ''), // Format: 919876543210
      type: "template",
      template: {
        name: templateName, // e.g., "welcome_dealer"
        language: {
          code: "en"
        },
        parameters: {
          body: {
            parameters: params.map(p => ({ type: "text", text: p }))
          }
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    return { success: true, messageId: response.data.messages[0].id }
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

// Send text message (only for 24-hour window after customer message)
async function sendTextMessage(recipientPhone, message) {
  try {
    const response = await axios.post(WHATSAPP_API_URL, {
      messaging_product: "whatsapp",
      to: recipientPhone.replace(/[^\d]/g, ''),
      type: "text",
      text: {
        body: message
      }
    }, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    return { success: true, messageId: response.data.messages[0].id }
  } catch (error) {
    console.error('WhatsApp text send error:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendTemplateMessage, sendTextMessage }
```

**Create WhatsApp Webhook** (`app/api/webhooks/whatsapp/route.js`):
```javascript
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    return Response.json(challenge)
  }

  return Response.json({ error: 'Unauthorized' }, { status: 403 })
}

export async function POST(req) {
  const body = await req.json()

  // Handle incoming messages
  if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
    const message = body.entry[0].changes[0].value.messages[0]
    const senderPhone = body.entry[0].changes[0].value.contacts[0].wa_id
    const messageText = message.text?.body

    console.log(`Received message from ${senderPhone}: ${messageText}`)

    // TODO: Store in database, trigger response
  }

  return Response.json({ success: true })
}
```

**Create WhatsApp Templates**

Templates must be pre-approved by Meta before use.

```bash
# Create template via API (or manually in Meta Business Manager)

# Template: "welcome_dealer"
curl -X POST "https://graph.instagram.com/v18.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_dealer",
    "language": "en",
    "category": "TRANSACTIONAL",
    "components": [
      {
        "type": "BODY",
        "text": "Welcome to EvCRM, {{1}}! Your 30-day free trial starts now.\n\nView dashboard: https://evcrm.in/dealer\n\nWe've loaded 3 sample vehicles so you can see how it works."
      }
    ]
  }'
```

### **Send Welcome Message on Signup**

In registration API (`app/api/register/route.js`):

```javascript
import { sendTemplateMessage } from '../../../lib/whatsapp'

// After dealer registers
const { phone } = body

// Send WhatsApp welcome
const whatsappResult = await sendTemplateMessage(phone, 'welcome_dealer', [user.name])

if (!whatsappResult.success) {
  console.warn('WhatsApp failed (non-blocking):', whatsappResult.error)
  // Don't block registration
}
```

**Add to .env:**
```
WHATSAPP_PHONE_ID=1234567890123456
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_TOKEN=your_secure_webhook_token_here
```

---

## 2️⃣ **SMS API** (Twilio or AWS SNS)

### **Option A: Twilio (Easier, More Features)**

**Setup Time**: 15 minutes  
**Cost**: ₹0.50-1 per SMS  
**Best for**: Quick setup, good support

**Step 1: Create Twilio Account**
```
1. Go to https://www.twilio.com/
2. Sign up (free trial: ₹500 credit)
3. Verify phone number (receive SMS)
4. Get: Account SID, Auth Token, Phone Number
```

**Step 2: Install SDK**
```bash
npm install twilio
```

**Step 3: Create SMS Service** (`lib/sms.js`):
```javascript
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function sendSMS(toPhone, message) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone
    })

    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error('SMS send error:', error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendSMS }
```

**Use in Code:**
```javascript
import { sendSMS } from '../../../lib/sms'

// Send welcome SMS to new dealer
await sendSMS(phone, `Welcome to EvCRM! Start free: https://evcrm.in/dealer`)

// Send trial expiry reminder (day 28)
await sendSMS(phone, `Your EvCRM trial ends in 2 days. Upgrade at: https://evcrm.in/dealer/settings`)
```

**Add to .env:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+919876543210
```

### **Option B: AWS SNS (Cheaper, More Scalable)**

**Setup Time**: 20 minutes  
**Cost**: ₹0.30-0.50 per SMS  
**Best for**: High volume

```bash
npm install aws-sdk
```

**Service** (`lib/sms-aws.js`):
```javascript
const AWS = require('aws-sdk')

const sns = new AWS.SNS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

async function sendSMS(toPhone, message) {
  try {
    const result = await sns.publish({
      PhoneNumber: toPhone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'EvCRM'
        }
      }
    }).promise()

    return { success: true, messageId: result.MessageId }
  } catch (error) {
    console.error('AWS SMS error:', error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendSMS }
```

---

## 3️⃣ **Email API** (Sendgrid or Mailgun)

### **Option A: Sendgrid (Most Popular)**

**Setup Time**: 10 minutes  
**Cost**: Free tier 100 emails/day, paid ₹400+/month  
**Best for**: Transactional emails

**Step 1: Create Account**
```
1. Go to https://sendgrid.com/
2. Sign up free
3. Create API key
4. Verify domain (for branded emails)
```

**Step 2: Install SDK**
```bash
npm install @sendgrid/mail
```

**Step 3: Create Email Service** (`lib/email.js`):
```javascript
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

async function sendWelcomeEmail(email, dealerName) {
  try {
    await sgMail.send({
      to: email,
      from: 'noreply@evcrm.in',
      subject: '🎉 Welcome to EvCRM! Your Free Trial Starts Now',
      html: `
        <h2>Hi ${dealerName},</h2>
        <p>Welcome to EvCRM! Your 30-day free trial has started.</p>
        
        <h3>Quick Start:</h3>
        <ol>
          <li>Log in to your dashboard: <a href="https://evcrm.in/dealer">https://evcrm.in/dealer</a></li>
          <li>See sample vehicles (already loaded)</li>
          <li>Add your vehicles or import from Excel</li>
          <li>Start receiving leads!</li>
        </ol>
        
        <p><a href="https://evcrm.in/dealer">Open Dashboard →</a></p>
        
        <hr>
        <p>Need help? Reply to this email or WhatsApp us</p>
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error.message)
    return { success: false, error: error.message }
  }
}

async function sendTrialEndingEmail(email, dealerName, daysLeft) {
  try {
    await sgMail.send({
      to: email,
      from: 'noreply@evcrm.in',
      subject: `⏰ Your EvCRM trial ends in ${daysLeft} days`,
      html: `
        <h2>Hi ${dealerName},</h2>
        <p>Your free trial ends in <strong>${daysLeft} days</strong>.</p>
        
        <p>You've received ${/* lead count */} leads so far. Ready to continue?</p>
        
        <p><a href="https://evcrm.in/dealer/settings">Choose your plan →</a></p>
        
        <ul>
          <li>₹4,999/month - Full access</li>
          <li>Free tier - Limited features</li>
          <li>Cancel anytime</li>
        </ul>
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendWelcomeEmail, sendTrialEndingEmail }
```

**Add to .env:**
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

---

## 🔌 **Wiring Everything Together**

### **Communication Service Hub** (`lib/communications.js`):

```javascript
import { sendTemplateMessage, sendTextMessage } from './whatsapp'
import { sendSMS } from './sms'
import { sendWelcomeEmail, sendTrialEndingEmail } from './email'

// Send multi-channel welcome
async function onboardDealer(dealer) {
  const { email, phone, name } = dealer

  const results = await Promise.all([
    // WhatsApp
    sendTemplateMessage(phone, 'welcome_dealer', [name]),
    // SMS (backup if WhatsApp fails)
    sendSMS(phone, `Welcome to EvCRM ${name}! Start free: https://evcrm.in/dealer`),
    // Email
    sendWelcomeEmail(email, name)
  ])

  return results
}

// Trial expiry reminder (day 28)
async function sendTrialExpiryReminder(dealer, daysLeft) {
  const results = await Promise.all([
    sendTextMessage(dealer.phone, `Your EvCRM trial ends in ${daysLeft} days`),
    sendSMS(dealer.phone, `Your EvCRM trial ends in ${daysLeft} days`),
    sendTrialEndingEmail(dealer.email, dealer.name, daysLeft)
  ])

  return results
}

module.exports = { onboardDealer, sendTrialExpiryReminder }
```

**Use in Registration** (`app/api/register/route.js`):

```javascript
import { onboardDealer } from '../../../lib/communications'

// After dealer created
await onboardDealer({
  email: newUser.email,
  phone: body.phone,
  name: body.name
})
```

---

## ⏱️ **Automated Messaging Schedule**

**Create Cron Jobs** (`lib/cron-jobs.js`):

```javascript
// Send trial expiry reminders
export async function trialExpiryReminders() {
  const sb = createClient()

  // Find dealers with 28-day trial ending tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: dealers } = await sb
    .from('evcrm_users')
    .select('id, email, phone, name, trialStartDate')
    .eq('role', 'dealer')
    .eq('first_100_dealer', true)

  for (const dealer of dealers) {
    const trialEnd = new Date(dealer.trialStartDate)
    trialEnd.setDate(trialEnd.getDate() + 30)

    if (trialEnd.toDateString() === tomorrow.toDateString()) {
      await sendTrialExpiryReminder(dealer, 1)
    }
  }
}

// Schedule to run daily at 9 AM
// Use: node -e "require('./lib/cron-jobs').trialExpiryReminders()"
// Or schedule via GitHub Actions / Vercel cron
```

**Vercel Cron** (`.vercel/crons/trial-reminders.json`):

```json
{
  "cronjobs": [
    {
      "path": "/api/cron/trial-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**API Endpoint** (`app/api/cron/trial-reminders/route.js`):

```javascript
export const runtime = 'nodejs'

export async function GET(req) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trialExpiryReminders } = await import('../../../lib/cron-jobs')
  const result = await trialExpiryReminders()

  return Response.json(result)
}
```

---

## 📊 **Setup Cost & Timeline**

### **Minimum Setup (Campaign Ready)**

| Service | Setup Time | Monthly Cost | Notes |
|---------|-----------|--------------|-------|
| WhatsApp | 3-5 days | ₹0 (free for business) | Requires approval |
| SMS (Twilio) | 15 mins | ₹500 (100 SMS/month) | Can use free trial ₹500 credit |
| Email (Sendgrid) | 10 mins | ₹0 (free tier) | 100 emails/day free |
| **TOTAL** | **3-5 days** | **₹500/month** | |

### **Recommended Setup (Production Ready)**

| Service | Setup Time | Monthly Cost | Notes |
|---------|-----------|--------------|-------|
| WhatsApp | 3-5 days | ₹500 | 1000+ templates/month |
| SMS (Twilio) | 15 mins | ₹2,000 | 5000+ SMS/month |
| Email (Sendgrid) | 10 mins | ₹400 | 100,000+ emails/month |
| **TOTAL** | **3-5 days** | **₹2,900/month** | |

---

## ✅ **Setup Checklist**

### **WhatsApp** (3-5 days)
- [ ] Create Meta Business Account
- [ ] Create WhatsApp Business App
- [ ] Connect phone number
- [ ] Get access token
- [ ] Set up webhook
- [ ] Create & submit templates for approval
- [ ] Implement WhatsApp service in code
- [ ] Test sending message

### **SMS** (15 mins - Twilio)
- [ ] Create Twilio account
- [ ] Verify phone number
- [ ] Get Account SID & Token
- [ ] Install twilio SDK
- [ ] Implement SMS service
- [ ] Add to .env
- [ ] Test sending SMS

### **Email** (10 mins - Sendgrid)
- [ ] Create Sendgrid account
- [ ] Create API key
- [ ] Install @sendgrid/mail
- [ ] Implement email service
- [ ] Create email templates (HTML)
- [ ] Add to .env
- [ ] Test sending email

### **Automation** (Bonus)
- [ ] Create cron job for trial reminders
- [ ] Set up Vercel cron endpoint
- [ ] Test automated messages
- [ ] Monitor delivery rates

---

## ⚠️ **Important Notes**

1. **WhatsApp Approval**: Meta reviews templates. Approval takes 1-3 days. Don't wait—start immediately.

2. **Rate Limiting**: WhatsApp allows ~1000 messages/day. SMS/Email have higher limits.

3. **Costs**: Monitor usage. SMS at ₹0.50 per message × 5000 dealers = ₹2,500/month (plan accordingly).

4. **Fallback**: If WhatsApp fails, SMS/Email still work (implement error handling).

5. **Compliance**: Keep unsubscribe links in emails (legal requirement).

6. **Testing**: Use sandbox/test numbers before sending to real dealers.

---

## 🚀 **Next Steps**

1. **Start WhatsApp setup TODAY** (longest lead time)
2. Set up Twilio SMS (15 mins)
3. Set up Sendgrid Email (10 mins)
4. Implement all 3 services in code
5. Test end-to-end
6. **Then launch campaign**

**Don't wait for WhatsApp approval—start it now while setting up SMS/Email.**
