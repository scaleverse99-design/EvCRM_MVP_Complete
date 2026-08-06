# Dummy Inventory Setup for Demo Dealers

**Purpose**: Show new dealers how their vehicles will look on the platform with realistic examples.

---

## Sample Dealer: "Green Motors Hyderabad"

### 🚗 **Vehicle 1: Tata Nexon EV Max**

```json
{
  "id": "nexon-ev-max-001",
  "brand": "Tata Motors",
  "model": "Nexon EV Max",
  "type": "4W SUV",
  "year": 2024,
  "color": "Pearl White",
  "status": "in_stock",
  "specs": {
    "range": "465 km",
    "chargeTime": "60 min (DC fast)",
    "topSpeed": "150 km/h",
    "battery": "40.5 kWh",
    "seating": 5,
    "warranty": "3 years / 1.2L km"
  },
  "pricing": {
    "exShowroom": 1980000,
    "onRoad": {
      "hyderabad": 2180000,
      "delhi": 2195000,
      "mumbai": 2220000
    },
    "discount": 50000,
    "subsidy": {
      "fame": 150000,
      "telangana": 75000,
      "total": 225000
    }
  },
  "images": [
    "/vehicles/nexon-ev-max-pearl-white-1.jpg",
    "/vehicles/nexon-ev-max-pearl-white-2.jpg",
    "/vehicles/nexon-ev-max-interior.jpg"
  ],
  "availability": "In stock - 2 units",
  "testDriveBookings": 12,
  "inquiries": 47
}
```

**Display on Platform:**
```
🏷️ Tata Nexon EV Max (2024)
Pearl White • 465 km range • In Stock

₹19,80,000 ex-showroom
↓ Subsidy: -₹2,25,000
= Net: ₹17,55,000 (after FAME + Telangana)

EMI: ₹58,500/month (36 months @ 8.5%)

[View Full Specs] [Book Test Drive] [Get Quote]

⭐ 47 inquiries • 12 test drive bookings this month
```

---

### 🏍️ **Vehicle 2: Ather 450X Gen 3**

```json
{
  "id": "ather-450x-gen3-001",
  "brand": "Ather Energy",
  "model": "450X Gen 3",
  "type": "Premium Scooter",
  "year": 2024,
  "color": "Mystic Black",
  "status": "in_stock",
  "specs": {
    "range": "150 km",
    "chargeTime": "75 min",
    "topSpeed": "90 km/h",
    "battery": "3.7 kWh",
    "seating": 1,
    "warranty": "3 years"
  },
  "pricing": {
    "exShowroom": 155000,
    "onRoad": {
      "hyderabad": 170000,
      "delhi": 172000,
      "mumbai": 175000
    },
    "discount": 8000,
    "subsidy": {
      "fame": 10000,
      "telangana": 5000,
      "total": 15000
    }
  },
  "images": [
    "/vehicles/ather-450x-gen3-black-1.jpg",
    "/vehicles/ather-450x-gen3-black-2.jpg"
  ],
  "availability": "In stock - 5 units",
  "testDriveBookings": 34,
  "inquiries": 89
}
```

**Display:**
```
🏷️ Ather 450X Gen 3 (2024)
Mystic Black • 150 km range • In Stock

₹1,55,000 ex-showroom
↓ Subsidy: -₹15,000
= Net: ₹1,40,000 (after FAME + Telangana)

No EMI (can pay in installments via dealer)

[View Full Specs] [Book Test Drive] [Get Quote]

⭐ 89 inquiries • 34 test drive bookings this month
```

---

### 🚙 **Vehicle 3: Mahindra XUV400**

```json
{
  "id": "mahindra-xuv400-001",
  "brand": "Mahindra",
  "model": "XUV400",
  "type": "Compact SUV",
  "year": 2024,
  "color": "Midnight Black",
  "status": "on_order",
  "specs": {
    "range": "456 km",
    "chargeTime": "50 min (DC fast)",
    "topSpeed": "160 km/h",
    "battery": "39.4 kWh",
    "seating": 5,
    "warranty": "5 years / 1.6L km"
  },
  "pricing": {
    "exShowroom": 1699000,
    "onRoad": {
      "hyderabad": 1880000,
      "delhi": 1895000,
      "mumbai": 1920000
    },
    "discount": 75000,
    "subsidy": {
      "fame": 135000,
      "telangana": 50000,
      "total": 185000
    }
  },
  "images": [
    "/vehicles/mahindra-xuv400-black-1.jpg",
    "/vehicles/mahindra-xuv400-black-2.jpg"
  ],
  "availability": "Can order - delivery in 30 days",
  "testDriveBookings": 28,
  "inquiries": 156
}
```

---

## 📊 **Display Dashboard Stats for Demo**

```
Dashboard Overview - Green Motors Hyderabad

📊 INVENTORY SNAPSHOT
Total Vehicles: 3
In Stock: 2
On Order: 1

📈 THIS MONTH
Total Inquiries: 292
Test Drives Booked: 74
Quotations Sent: 23
Vehicles Sold: 5

💰 REVENUE
Estimated Value: ₹58,75,000
Pipeline: ₹125,50,000 (next 60 days)

🏆 TOP PERFORMING
Model: Ather 450X (89 inquiries)
City: Hyderabad (highest traffic)
Source: Website search (65% of leads)
```

---

## 🎯 **How Dummy Inventory Helps Dealers**

1. **See Real Layout**: How vehicles appear in listings/search
2. **Understand Specs Entry**: What fields they need to fill
3. **Learn Pricing Logic**: How subsidies & taxes apply
4. **Track Inquiries**: See how leads come in
5. **Test Features**: Book test drive, get quote, contact dealer
6. **Build Confidence**: "I can do this" feeling when signing up

---

## 🛠️ **How to Load Dummy Inventory**

### **Option 1: Database Seed (Recommended)**

Create file: `scripts/seed-demo-inventory.js`

```javascript
const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

const DEMO_VEHICLES = [
  // Nexon EV Max
  {
    id: "nexon-ev-max-001",
    dealership: "green-motors-hyderabad",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    type: "4W SUV",
    year: 2024,
    color: "Pearl White",
    status: "in_stock",
    range: 465,
    chargeTime: 60,
    topSpeed: 150,
    exShowroom: 1980000,
    currentPrice: 1755000,
    discount: 50000,
    subsidy: 225000,
    views: 342,
    inquiries: 47,
    testDrives: 12,
    sold: false,
    createdAt: new Date().toISOString(),
  },
  // Ather 450X Gen 3
  {
    id: "ather-450x-gen3-001",
    dealership: "green-motors-hyderabad",
    brand: "Ather Energy",
    model: "450X Gen 3",
    type: "Scooter",
    year: 2024,
    color: "Mystic Black",
    status: "in_stock",
    range: 150,
    chargeTime: 75,
    topSpeed: 90,
    exShowroom: 155000,
    currentPrice: 140000,
    discount: 8000,
    subsidy: 15000,
    views: 512,
    inquiries: 89,
    testDrives: 34,
    sold: false,
    createdAt: new Date().toISOString(),
  },
  // Mahindra XUV400
  {
    id: "mahindra-xuv400-001",
    dealership: "green-motors-hyderabad",
    brand: "Mahindra",
    model: "XUV400",
    type: "SUV",
    year: 2024,
    color: "Midnight Black",
    status: "on_order",
    range: 456,
    chargeTime: 50,
    topSpeed: 160,
    exShowroom: 1699000,
    currentPrice: 1514000,
    discount: 75000,
    subsidy: 185000,
    views: 680,
    inquiries: 156,
    testDrives: 28,
    sold: false,
    createdAt: new Date().toISOString(),
  }
]

async function seedDemoInventory() {
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log("Seeding demo inventory for Green Motors...")

  const { error } = await sb
    .from("dealer_inventory")
    .insert(DEMO_VEHICLES)

  if (error) {
    console.error("Error seeding inventory:", error)
    process.exit(1)
  }

  console.log(`✅ Seeded ${DEMO_VEHICLES.length} demo vehicles`)
  console.log("Dealer can now see these on their dashboard")
}

seedDemoInventory()
```

**Run with:**
```bash
node scripts/seed-demo-inventory.js
```

---

### **Option 2: Admin Upload Interface**

Create: `app/admin/seed-demo/page.js`

```javascript
"use client"
import { Btn } from "../../components/ui"

export default function AdminSeedDemo() {
  const handleSeedDealerInventory = async () => {
    const res = await fetch("/api/admin/seed-demo-inventory", { method: "POST" })
    const data = await res.json()
    alert(`Seeded ${data.count} vehicles for demo dealer`)
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Seed Demo Data</h1>
      <Btn onClick={handleSeedDealerInventory}>
        Create Demo Dealer + Inventory
      </Btn>
    </div>
  )
}
```

---

## 📝 **First 100 Dealers - Special Demo**

When a dealer signs up with code `FIRST100`:

1. ✅ Automatically add 3-5 demo vehicles
2. ✅ Pre-fill sample inquiries/leads
3. ✅ Show metrics (47 inquiries, 12 test drives)
4. ✅ Explain "You can add your own vehicles now"
5. ✅ Offer demo removal after 7 days or on first real upload

**SQL to mark first 100:**
```sql
UPDATE evcrm_users 
SET trial_tier = 'first_100_promotion'
WHERE role = 'dealer' 
AND created_at > NOW() - INTERVAL '30 days'
LIMIT 100;
```

---

## 🎁 **Free for First 100 Dealers - What's Included**

| Feature | Duration | Details |
|---------|----------|---------|
| Trial Access | 30 days | Full dashboard access |
| Dashboard | Free | All 12 tabs unlocked |
| Leads | Free | 100 leads/month included |
| Team Members | 3 free | Can add sales reps |
| API Access | Free | MCP server access |
| Support | Free | Email + WhatsApp support |
| Demo Inventory | Free | 5 sample vehicles pre-loaded |
| Export Reports | Free | Monthly performance reports |

**After 30 days**: Options to upgrade ($99/month) or downgrade to free tier

---

## ✅ **Promotion Checklist**

- [ ] WhatsApp templates prepared ([WHATSAPP_TEMPLATES.md](WHATSAPP_TEMPLATES.md))
- [ ] Dummy inventory loaded to Supabase
- [ ] "FIRST100" promo code active in `/register`
- [ ] Demo dealer account created with sample vehicles
- [ ] Admin dashboard tracking first 100 signups
- [ ] Email welcome sequence ready (include inventory showcase)
- [ ] UTM tracking live on all links
- [ ] Analytics dashboard set up for metrics
- [ ] Support team briefed on new dealers
- [ ] Landing page updated with "Free for First 100" banner
