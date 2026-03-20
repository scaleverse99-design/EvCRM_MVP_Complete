// ── lib/data.js ──────────────────────────────────────────────────────
// All mock data lives here.
// In production: replace each export with an API call or SWR hook.
// Each function is named after what it fetches so swapping is trivial.

export const getDealerInfo = () => ({
  id: "dealer_001",
  name: "Sharma EV Motors",
  city: "Bangalore",
  state: "Karnataka",
  phone: "+91 98765 43210",
  email: "sharma.ev@gmail.com",
  brands: ["Tata", "Ather", "Ola", "TVS"],
  plan: "basic",
  monthlyTarget: 2200000,
  monthlyRevenue: 1840000,
})

export const getReps = () => [
  { id:1, name:"Rahul Sharma",  role:"Senior Rep",  status:"available", leads:24, closed:5,  rate:21, capacity:30, color:"#3B82F6", active:true,  speciality:["Tata","Ather"]  },
  { id:2, name:"Priya Menon",   role:"Senior Rep",  status:"available", leads:31, closed:8,  rate:26, capacity:35, color:"#8B5CF6", active:true,  speciality:["Ola","TVS"]     },
  { id:3, name:"Aakash Jain",   role:"Junior Rep",  status:"busy",      leads:18, closed:3,  rate:17, capacity:20, color:"#F97316", active:true,  speciality:["Hero","Okaya"]  },
  { id:4, name:"Divya Nair",    role:"Rep",         status:"offline",   leads:12, closed:2,  rate:16, capacity:25, color:"#0D9488", active:false, speciality:["Bajaj","TVS"]   },
]

export const getLeads = () => [
  { id:1,  name:"Amit Verma",    vehicle:"Tata Nexon EV Max",   source:"walkin",    status:"HOT",  score:9.2, time:"2h ago",  repId:1, phone:"+91 98765 43210", comment:"Very interested, price thoda zyada lag raha hai" },
  { id:2,  name:"Sneha Patel",   vehicle:"Ather 450X Gen 3",    source:"instagram", status:"HOT",  score:8.7, time:"4h ago",  repId:2, phone:"+91 87654 32109", comment:"Test drive book karni hai aaj" },
  { id:3,  name:"Rajesh Kumar",  vehicle:"Ola S1 Pro",          source:"showroom",  status:"WARM", score:7.1, time:"1d ago",  repId:1, phone:"+91 76543 21098", comment:"EMI options poochha tha, follow up pending" },
  { id:4,  name:"Divya Sharma",  vehicle:"TVS iQube ST",        source:"facebook",  status:"WARM", score:6.4, time:"2d ago",  repId:3, phone:"+91 65432 10987", comment:"Husband ko dikhana hai pehle" },
  { id:5,  name:"Karan Mehta",   vehicle:"Okaya Faast F4",      source:"instagram", status:"NEW",  score:8.9, time:"30m ago", repId:null, phone:"+91 54321 09876", comment:"Fresh enquiry from Instagram campaign" },
  { id:6,  name:"Pooja Nair",    vehicle:"Bajaj Chetak Premium",source:"referral",  status:"HOT",  score:8.4, time:"3h ago",  repId:2, phone:"+91 43210 98765", comment:"Ready to book, needs final price confirmation" },
  { id:7,  name:"Suresh Reddy",  vehicle:"Hero Optima CX",      source:"walkin",    status:"COLD", score:3.2, time:"5d ago",  repId:3, phone:"+91 32109 87654", comment:"No response to 3 follow-up attempts" },
  { id:8,  name:"Meera Iyer",    vehicle:"Ather 450X Gen 3",    source:"showroom",  status:"WARM", score:6.8, time:"3d ago",  repId:2, phone:"+91 21098 76543", comment:"Portal opened twice this week, still deciding" },
  { id:9,  name:"Arjun Patel",   vehicle:"Tata Nexon EV Max",   source:"oem",       status:"HOT",  score:9.0, time:"1d ago",  repId:null, phone:"+91 10987 65432", comment:"OEM campaign lead, very serious buyer" },
  { id:10, name:"Neha Gupta",    vehicle:"TVS iQube ST",        source:"whatsapp",  status:"NEW",  score:7.5, time:"6h ago",  repId:null, phone:"+91 09876 54321", comment:"First message on WhatsApp, wants brochure" },
]

export const getAIQueue = () => [
  { id:1,  name:"Amit Verma",   vehicle:"Tata Nexon EV Max",   score:9.2, status:"HOT",  reason:"Opened quote #EV-2847 three times today. Price is the only objection.", action:"Send revised offer with 36-month EMI breakdown highlighting ₹55K/month." },
  { id:2,  name:"Sneha Patel",  vehicle:"Ather 450X Gen 3",    score:8.7, status:"HOT",  reason:"Requested test drive, no confirmation received yet.", action:"Call to confirm test drive slot for this evening." },
  { id:9,  name:"Arjun Patel",  vehicle:"Tata Nexon EV Max",   score:9.0, status:"HOT",  reason:"OEM campaign lead arrived today. Same-day response increases conversion 3×.", action:"Call immediately. OEM leads have 40% higher close rate." },
  { id:3,  name:"Rajesh Kumar", vehicle:"Ola S1 Pro",          score:7.1, status:"WARM", reason:"EMI query 1 day ago, zero follow-up done.", action:"Send EMI comparison: Ola vs petrol 2W over 3 years." },
  { id:8,  name:"Meera Iyer",   vehicle:"Ather 450X Gen 3",    score:6.8, status:"WARM", reason:"MyGarage portal opened twice this week.", action:"Follow up — she is actively checking status. Good re-engage." },
  { id:10, name:"Neha Gupta",   vehicle:"TVS iQube ST",        score:7.5, status:"NEW",  reason:"First WhatsApp enquiry 6 hours ago, no rep reply.", action:"Reply immediately. New leads convert 3× better within 1 hour." },
  { id:4,  name:"Divya Sharma", vehicle:"TVS iQube ST",        score:6.4, status:"WARM", reason:"No contact 2 days after first enquiry.", action:"Re-engage with limited-period offer ending this week." },
]

export const getVehicles = () => [
  { id:1, brand:"Okaya",  model:"Faast F4",    type:"Scooter", spec:"120km · 75km/h · Fast charge 4hr",    stock:0,  demand:6,  trend:"+340%", price:105000, status:"NO_STOCK", suggestOrder:10, deadStockValue:null,  daysNoEnquiry:0,
    waitlist:[
      { name:"Priya Sharma",  phone:"98765 43210", note:"Wants white colour"              },
      { name:"Ravi Iyer",     phone:"87654 32109", note:"Budget under ₹1.1L"              },
      { name:"Sunita Devi",   phone:"76543 21098", note:"Needs delivery < 2 weeks"        },
      { name:"Arjun Patel",   phone:"65432 10987", note:"Comparing with Ather"            },
      { name:"Deepa Nair",    phone:"54321 09876", note:"Ready to book today"             },
      { name:"Mohan Reddy",   phone:"43210 98765", note:"Corporate purchase enquiry"      },
    ]},
  { id:2, brand:"Tata",   model:"Nexon EV Max", type:"SUV",    spec:"465km · Fast DC · ADAS · Sunroof",   stock:3,  demand:14, trend:"+22%",  price:1705000,status:"LOW",  suggestOrder:5, deadStockValue:null, daysNoEnquiry:0, waitlist:[] },
  { id:3, brand:"Ather",  model:"450X Gen 3",   type:"Scooter",spec:"150km · OTA updates · ProTube App",  stock:8,  demand:9,  trend:"+12%",  price:145000, status:"OK",   suggestOrder:0, deadStockValue:null, daysNoEnquiry:0, waitlist:[] },
  { id:4, brand:"Hero",   model:"Optima CX",    type:"Scooter",spec:"82km · Economy segment",             stock:8,  demand:0,  trend:"-100%", price:72000,  status:"DEAD", suggestOrder:0, deadStockValue:576000, daysNoEnquiry:21, waitlist:[] },
  { id:5, brand:"Ola",    model:"S1 Pro",       type:"Scooter",spec:"195km · Hyperdrive · 5yr warranty",  stock:5,  demand:7,  trend:"+8%",   price:139999, status:"OK",   suggestOrder:0, deadStockValue:null, daysNoEnquiry:0, waitlist:[] },
  { id:6, brand:"TVS",    model:"iQube ST",     type:"Scooter",spec:"100km · SmartConnect · Navigation",  stock:2,  demand:5,  trend:"+45%",  price:135000, status:"LOW",  suggestOrder:6, deadStockValue:null, daysNoEnquiry:0, waitlist:[] },
]

export const getShowroomProducts = () => [
  { id:1, brand:"Tata",  model:"Nexon EV Max",   type:"4W SUV",  range:465, chargeTime:60,  topSpeed:150, exShowroom:1980000, fame2:150000, stateSubsidy:125000, colors:["Intensi-Teal","Flame Red","Daytona Grey","Pure Silver"], rating:4.7, reviews:284, available:true,  deliveryWeeks:3 },
  { id:2, brand:"Ather", model:"450X Gen 3",     type:"Scooter", range:150, chargeTime:75,  topSpeed:90,  exShowroom:155000,  fame2:0,      stateSubsidy:10000,  colors:["Space Grey","White"],                                   rating:4.6, reviews:412, available:true,  deliveryWeeks:2 },
  { id:3, brand:"Ola",   model:"S1 Pro Gen 2",   type:"Scooter", range:195, chargeTime:90,  topSpeed:116, exShowroom:149999,  fame2:0,      stateSubsidy:10000,  colors:["Neo Mint","White","Midnight Blue","Jet Black"],          rating:4.3, reviews:893, available:true,  deliveryWeeks:4 },
  { id:4, brand:"Okaya", model:"Faast F4",       type:"Scooter", range:120, chargeTime:240, topSpeed:75,  exShowroom:105000,  fame2:0,      stateSubsidy:0,      colors:["White","Black","Red"],                                   rating:4.1, reviews:67,  available:false, deliveryWeeks:0 },
  { id:5, brand:"TVS",   model:"iQube ST",       type:"Scooter", range:100, chargeTime:350, topSpeed:82,  exShowroom:135000,  fame2:0,      stateSubsidy:0,      colors:["Sunlit Ivory","Starlight Blue"],                         rating:4.4, reviews:156, available:true,  deliveryWeeks:2 },
  { id:6, brand:"Bajaj", model:"Chetak Premium", type:"Scooter", range:108, chargeTime:300, topSpeed:63,  exShowroom:135000,  fame2:0,      stateSubsidy:10000,  colors:["Hazel Brown","Fireside Black","Cyber White"],            rating:4.5, reviews:203, available:true,  deliveryWeeks:1 },
]

export const getQuotes = () => [
  { id:"EV-2847", leadId:1, leadName:"Amit Verma",  vehicle:"Tata Nexon EV Max",    exShowroom:1980000, fame2:150000, state:125000, netPrice:1705000, emi36:55420, offer:"Free home charger installation (worth ₹8,000) + 2 years free service", status:"VIEWED",   sentAt:"Mar 19 2:30 PM",  openedAt:"Mar 19 4:15 PM" },
  { id:"EV-2841", leadId:2, leadName:"Sneha Patel",  vehicle:"Ather 450X Gen 3",     exShowroom:155000,  fame2:0,      state:10000,  netPrice:145000,  emi36:4720,  offer:"3 free services + helmet worth ₹2,500",                                status:"SENT",    sentAt:"Mar 18 11:00 AM", openedAt:null             },
  { id:"EV-2835", leadId:6, leadName:"Pooja Nair",   vehicle:"Bajaj Chetak Premium", exShowroom:135000,  fame2:0,      state:10000,  netPrice:125000,  emi36:4060,  offer:"Extended warranty 3 years + free first service",                       status:"ACCEPTED",sentAt:"Mar 17 3:00 PM",  openedAt:"Mar 17 5:20 PM" },
]

export const getMessages = () => ({
  1: [
    { from:"rep",      text:"Hello Amit ji! Nexon EV Max ke liye quote bhej raha hoon aapko.",   time:"2:25 PM", read:true  },
    { from:"customer", text:"Quote dekh liya. Bahut accha hai. EMI thoda zyada lag raha hai.",  time:"2:28 PM", read:true  },
    { from:"customer", text:"₹55,000/month tight hai. Kuch reduce ho sakta hai?",               time:"2:29 PM", read:false },
  ],
  2: [
    { from:"rep",      text:"Hi Sneha! Ather 450X test drive ke liye aaj slot available hai.",  time:"1:10 PM", read:true  },
    { from:"customer", text:"Aaj evening possible hai test drive?",                             time:"1:45 PM", read:false },
  ],
  6: [
    { from:"customer", text:"Bhai final price kya hogi Chetak ki?",                             time:"Yesterday 3:00 PM", read:true },
    { from:"rep",      text:"₹1,25,000 net after subsidy. Quote bhej raha hoon abhi.",          time:"Yesterday 3:10 PM", read:true },
    { from:"customer", text:"Book kar lete hain. Kal aaenge showroom.",                         time:"Yesterday 3:15 PM", read:true },
  ],
})

export const getLiveFeed = () => [
  { id:1, type:"new_lead",       icon:"✦", color:"#3B82F6", label:"NEW LEAD",         time:"2m ago",    msg:"Priya Sharma enquired about Okaya Faast F4",          sub:"Instagram · Auto-assigned to Rahul",      actionLabel:"View Lead"    },
  { id:2, type:"missed_followup",icon:"⚠", color:"#EF4444", label:"MISSED FOLLOW-UP", time:"12m ago",   msg:"Karan Mehta — HOT lead, 2 days without contact",      sub:"Assigned to Aakash · Quote sent Mar 17",  actionLabel:"Call Now"     },
  { id:3, type:"quote_opened",   icon:"👁", color:"#059669", label:"HOT SIGNAL",       time:"28m ago",   msg:"Amit Verma opened quote #EV-2847 for the 3rd time",   sub:"High purchase intent",                    actionLabel:"Call Now"     },
  { id:4, type:"stock_alert",    icon:"📦", color:"#F97316", label:"STOCK ALERT",      time:"1h ago",    msg:"Okaya Faast F4 demand +340%, zero units available",   sub:"6 customers on waitlist",                 actionLabel:"Order Stock"  },
  { id:5, type:"low_walkins",    icon:"📉", color:"#EAB308", label:"LOW TRAFFIC",      time:"9:00 AM",   msg:"Only 2 walk-ins today vs 6.4 daily average",          sub:"Tuesday pattern — consider a campaign",   actionLabel:"Send Campaign"},
]

export const getCustomerOrder = () => ({
  id:"TN-8847",
  vehicle:"Tata Nexon EV Max",
  variant:"Empowered Plus · Intensi-Teal",
  price:1705000,
  dealer:"Sharma EV Motors",
  rep:"Rahul Sharma",
  repPhone:"+91 98765 43210",
  timeline:[
    { label:"Booked",             date:"Mar 15, 2026", done:true,  active:false },
    { label:"Payment Confirmed",  date:"Mar 16, 2026", done:true,  active:false },
    { label:"In Production",      date:"Mar 20 (est)", done:false, active:true  },
    { label:"In Transit",         date:"Apr 2 (est)",  done:false, active:false },
    { label:"Delivery Ready",     date:"Apr 8 (est)",  done:false, active:false },
  ],
})

export const getAssignmentHistory = () => [
  { name:"Amit Verma",   vehicle:"Nexon EV Max",  rep:"Rahul Sharma",  method:"Manual",     source:"walkin",    time:"2h ago"  },
  { name:"Sneha Patel",  vehicle:"Ather 450X",    rep:"Priya Menon",   method:"Auto",       source:"instagram", time:"3h ago"  },
  { name:"Rajesh Kumar", vehicle:"Ola S1 Pro",    rep:"Rahul Sharma",  method:"Auto",       source:"showroom",  time:"5h ago"  },
  { name:"Divya Sharma", vehicle:"TVS iQube",     rep:"Priya Menon",   method:"Auto",       source:"oem",       time:"6h ago"  },
  { name:"Karan Mehta",  vehicle:"Bajaj Chetak",  rep:"Aakash Jain",   method:"Round Robin",source:"facebook",  time:"8h ago"  },
]
