# Ev.CRM — India's First EV Dealer Sales OS

> Production-ready MVP · Next.js 14 · Light UI · Sidebar navigation

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your values (see below)

# 3. Run development server
npm run dev

# 4. Open browser
open http://localhost:3000
```

---

## Tech Stack

| Layer         | Technology                      | Cost       |
|---------------|---------------------------------|------------|
| Frontend      | Next.js 14 (App Router)         | Free       |
| Database      | AWS DynamoDB (25GB free forever)| Free       |
| Auth / OTP    | Google OAuth + Apps Script      | Free       |
| File Storage  | Dealer's Google Drive           | Free       |
| AI Engine     | Google Gemini API               | Free tier  |
| WhatsApp      | Dealer's WhatsApp Business no.  | Free       |
| Deployment    | Vercel                          | Free       |
| Payments      | Razorpay                        | 2% per txn |

---

## Pages & Routes

| Route             | Page                  | Role          |
|-------------------|-----------------------|---------------|
| `/login`          | Login (all 3 roles)   | All           |
| `/dealer`         | Dealer Dashboard      | Dealer        |
| `/leads`          | Lead Pipeline         | Dealer/Rep    |
| `/leads/[id]`     | Lead Detail           | Dealer/Rep    |
| `/leads/new`      | New Lead Entry        | Dealer/Rep    |
| `/queue`          | AI Daily Queue        | Rep           |
| `/connect`        | Unified Inbox         | Dealer/Rep    |
| `/assign`         | Lead Assignment       | Dealer        |
| `/buildprice`     | EV Price Calculator   | Rep           |
| `/quotepro`       | Quote Builder         | Rep           |
| `/command`        | Analytics Dashboard   | Dealer        |
| `/vehicles`       | Inventory Intelligence| Dealer        |
| `/showroom`       | Public Storefront     | Customer/Web  |
| `/mygarage`       | Customer Portal       | Customer      |

---

## Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=           # Google Cloud Console
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Apps Script (OTP emails)
GOOGLE_APPS_SCRIPT_URL=     # Deploy script as Web App

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
DYNAMODB_TABLE_PREFIX=evcrm_

# WhatsApp
WHATSAPP_API_URL=           # Your BSP endpoint (Interakt/Wati)
WHATSAPP_API_KEY=

# Gemini AI
GEMINI_API_KEY=             # Google AI Studio

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# JWT
JWT_SECRET=                 # Random string, min 32 chars
```

---

## Deploy to Production (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or via CLI:
vercel env add GOOGLE_CLIENT_ID
```

---

## Connecting Real Data

All mock data is in `lib/data.js`. Each function maps 1:1 to an API call:

```js
// Replace this mock:
export const getLeads = () => [...]

// With this real API call:
export const getLeads = async (dealerId) => {
  const res = await fetch(`/api/leads?dealerId=${dealerId}`)
  return res.json()
}
```

---

## File Structure

```
evcrm/
├── app/
│   ├── layout.js          — Root layout
│   ├── page.js            — Redirects to /login
│   ├── login/page.js      — All 3 role login flows
│   ├── dealer/page.js     — Dealer dashboard
│   ├── leads/
│   │   ├── page.js        — Lead pipeline table
│   │   ├── [id]/page.js   — Lead detail + timeline
│   │   └── new/page.js    — New lead entry
│   ├── queue/page.js      — AI daily queue (10 leads)
│   ├── connect/page.js    — WhatsApp + email inbox
│   ├── assign/page.js     — Lead assignment engine
│   ├── buildprice/page.js — EV pricing calculator
│   ├── quotepro/page.js   — Quote builder + share
│   ├── command/page.js    — Analytics dashboard
│   ├── vehicles/page.js   — Inventory intelligence
│   ├── showroom/page.js   — Public storefront
│   └── mygarage/page.js   — Customer portal
├── components/
│   ├── ui/index.js        — All shared UI components
│   └── layout/Shell.js    — Sidebar + topbar layout
├── lib/
│   ├── constants.js       — Design tokens + utilities
│   └── data.js            — All data (swap for real API)
├── .env.example
├── next.config.js
├── tailwind.config.js
└── README.md
```

---

## Pricing

```
Dealer subscription:     ₹300/month per dealer
3 member seats included: Dealer + 2 reps
Self-serve onboarding:   No setup fee

Break-even:              320 dealers
Target:                  1,000 dealers (12 months)
Revenue at 1,000:        ₹3,00,000/month
```

---

## Support

Built by Ev.CRM · 2026
