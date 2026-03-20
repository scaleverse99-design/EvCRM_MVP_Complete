// ── Design tokens ────────────────────────────────────────────────────
export const C = {
  green:    "#059669",
  greenL:   "#D1FAE5",
  greenD:   "#065F46",
  greenMid: "#34D399",
  red:      "#EF4444",
  redL:     "#FEE2E2",
  orange:   "#F97316",
  orangeL:  "#FFEDD5",
  yellow:   "#EAB308",
  yellowL:  "#FEF9C3",
  blue:     "#3B82F6",
  blueL:    "#DBEAFE",
  purple:   "#8B5CF6",
  purpleL:  "#EDE9FE",
  teal:     "#0D9488",
  tealL:    "#CCFBF1",
  ink:      "#111827",
  ink2:     "#374151",
  ink3:     "#6B7280",
  border:   "#E5E7EB",
  borderD:  "#D1D5DB",
  bg:       "#F9FAFB",
  card:     "#FFFFFF",
}

// ── Nav items ─────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { href:"/dealer",     icon:"⊞",  label:"Dashboard"   },
  { href:"/leads",      icon:"◎",  label:"Leads"        },
  { href:"/queue",      icon:"⚡", label:"AI Queue"     },
  { href:"/connect",    icon:"✉",  label:"Connect"      },
  { href:"/assign",     icon:"👤", label:"Assignment"   },
  { href:"/vehicles",   icon:"🚗", label:"Inventory"    },
  { href:"/showroom",   icon:"🏪", label:"Showroom"     },
  { href:"/buildprice", icon:"₹",  label:"BuildPrice"   },
  { href:"/quotepro",   icon:"📄", label:"QuotePro"     },
  { href:"/command",    icon:"▦",  label:"Command"          },
  { href:"/mygarage",   icon:"🔑", label:"MyGarage"         },
  { href:"/market-research", icon:"🔍", label:"Market Research" },
]

// ── Lead status config ────────────────────────────────────────────────
export const STATUS_CONFIG = {
  HOT:    { color: "#EF4444", bg: "#FEE2E2", label: "HOT"    },
  WARM:   { color: "#EAB308", bg: "#FEF9C3", label: "WARM"   },
  NEW:    { color: "#3B82F6", bg: "#DBEAFE", label: "NEW"    },
  COLD:   { color: "#6B7280", bg: "#F3F4F6", label: "COLD"   },
  CLOSED: { color: "#059669", bg: "#D1FAE5", label: "CLOSED" },
}

// ── Vehicle status config ─────────────────────────────────────────────
export const STOCK_CONFIG = {
  NO_STOCK: { color:"#EF4444", bg:"#FEE2E2", label:"NO STOCK · HIGH DEMAND" },
  LOW:      { color:"#F97316", bg:"#FFEDD5", label:"LOW STOCK"               },
  OK:       { color:"#059669", bg:"#D1FAE5", label:"HEALTHY"                 },
  DEAD:     { color:"#EF4444", bg:"#FEE2E2", label:"DEAD STOCK"              },
}

// ── Source config ─────────────────────────────────────────────────────
export const SOURCES = {
  walkin:    { label:"Walk-in",      icon:"🏪", color:"#0D9488" },
  whatsapp:  { label:"WhatsApp",     icon:"💬", color:"#059669" },
  instagram: { label:"Instagram",    icon:"📷", color:"#8B5CF6" },
  showroom:  { label:"Web Showroom", icon:"🌐", color:"#3B82F6" },
  oem:       { label:"OEM Campaign", icon:"🏭", color:"#F97316" },
  referral:  { label:"Referral",     icon:"👥", color:"#EAB308" },
  facebook:  { label:"Facebook Ad",  icon:"📘", color:"#3B82F6" },
}

// ── Utility fns ───────────────────────────────────────────────────────
export const fmt = {
  currency: (n) => {
    if (!n && n !== 0) return "—"
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
    if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
  },
  emi: (price, months, rate = 0.085) => {
    const r = rate / 12
    return Math.round(price * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1))
  },
  ini: (name = "") =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
  loadColor: (pct) =>
    pct > 85 ? "#EF4444" : pct > 60 ? "#EAB308" : "#059669",
}
