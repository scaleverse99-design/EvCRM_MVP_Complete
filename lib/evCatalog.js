// ── lib/evCatalog.js ──────────────────────────────────────────────────
// Internal lookup of known EV models so dealers don't have to type in
// specs by hand — when a dealer enters a brand + model in the Inventory
// form, matching fields here auto-fill (dealer can still edit/override
// before saving; only empty fields get filled, existing values are never
// clobbered). Add new models here as dealers list vehicles this catalog
// doesn't yet cover — no schema change needed, it's just a lookup table.

function key(brand, model) {
  return `${(brand || "").toLowerCase().trim()}|${(model || "").toLowerCase().trim()}`
}

export const EV_CATALOG = {
  [key("Ather", "450X")]: {
    range: 111, batteryCapacity: "3.7 kWh", topSpeed: 90,
    chargingTime: "5h 42m (0-100%)", seatingCapacity: 2, bootSpace: "22 L", groundClearance: "165 mm", warrantyYears: 3,
    features: ["7-inch touchscreen dashboard", "Reverse mode", "Auto hold", "Guide-me-home lights", "Onboard navigation", "OTA updates"],
  },
  [key("Ather Energy", "450X")]: {
    range: 111, batteryCapacity: "3.7 kWh", topSpeed: 90,
    chargingTime: "5h 42m (0-100%)", seatingCapacity: 2, bootSpace: "22 L", groundClearance: "165 mm", warrantyYears: 3,
    features: ["7-inch touchscreen dashboard", "Reverse mode", "Auto hold", "Guide-me-home lights", "Onboard navigation", "OTA updates"],
  },
  [key("Tata", "Nexon EV")]: {
    range: 325, batteryCapacity: "40.5 kWh", topSpeed: 120,
    chargingTime: "56 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "350 L", groundClearance: "190 mm", warrantyYears: 8,
    features: ["10.25-inch touchscreen", "Wireless Apple CarPlay/Android Auto", "Ventilated front seats", "6 airbags", "ESP", "Cruise control"],
  },
  [key("Tata Motors", "Nexon EV")]: {
    range: 325, batteryCapacity: "40.5 kWh", topSpeed: 120,
    chargingTime: "56 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "350 L", groundClearance: "190 mm", warrantyYears: 8,
    features: ["10.25-inch touchscreen", "Wireless Apple CarPlay/Android Auto", "Ventilated front seats", "6 airbags", "ESP", "Cruise control"],
  },
  [key("Tata Motors", "Nexon EV Max")]: {
    range: 437, batteryCapacity: "40.5 kWh", topSpeed: 120,
    chargingTime: "56 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "350 L", groundClearance: "190 mm", warrantyYears: 8,
    features: ["10.25-inch touchscreen", "Wireless Apple CarPlay/Android Auto", "Ventilated front seats", "6 airbags", "ESP", "Cruise control", "Blind spot monitor"],
  },
  [key("Tata Motors", "Tiago EV")]: {
    range: 315, batteryCapacity: "24 kWh", topSpeed: 120,
    chargingTime: "58 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "240 L", groundClearance: "172 mm", warrantyYears: 8,
    features: ["7-inch touchscreen", "Auto climate control", "Rear parking camera", "4 airbags", "iRA connected car tech"],
  },
  [key("Tata", "Tiago EV")]: {
    range: 315, batteryCapacity: "24 kWh", topSpeed: 120,
    chargingTime: "58 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "240 L", groundClearance: "172 mm", warrantyYears: 8,
    features: ["7-inch touchscreen", "Auto climate control", "Rear parking camera", "4 airbags", "iRA connected car tech"],
  },
  [key("Ola Electric", "S1 Pro")]: {
    range: 195, batteryCapacity: "4 kWh", topSpeed: 120,
    chargingTime: "6h 30m (0-100%)", seatingCapacity: 2, bootSpace: "36 L", groundClearance: "160 mm", warrantyYears: 3,
    features: ["7-inch touchscreen", "Hyper mode", "Cruise control", "Music streaming", "Reverse mode", "OTA updates"],
  },
  [key("MG", "Comet EV")]: {
    range: 230, batteryCapacity: "17.3 kWh", topSpeed: 90,
    chargingTime: "7h (0-100%, home charger)", seatingCapacity: 4, bootSpace: "140 L", groundClearance: "160 mm", warrantyYears: 8,
    features: ["10.25-inch dual screen", "Connected car tech", "Auto AC", "Rear camera", "Voice assistant"],
  },
  [key("Mahindra", "XUV400")]: {
    range: 456, batteryCapacity: "39.4 kWh", topSpeed: 150,
    chargingTime: "50 min (0-80%, fast charge)", seatingCapacity: 5, bootSpace: "378 L", groundClearance: "182 mm", warrantyYears: 8,
    features: ["Adventure Stat Display", "Wireless charging", "6 airbags", "Cruise control", "Rain-sensing wipers", "Connected car tech"],
  },
  [key("Hyundai", "IONIQ 5")]: {
    range: 631, batteryCapacity: "72.6 kWh", topSpeed: 185,
    chargingTime: "18 min (10-80%, ultra-fast charge)", seatingCapacity: 5, bootSpace: "527 L", groundClearance: "160 mm", warrantyYears: 8,
    features: ["Dual 12.3-inch displays", "V2L (vehicle-to-load)", "Over-the-air updates", "Highway Driving Assist", "Digital side mirrors option"],
  },
  [key("Kia", "EV6")]: {
    range: 528, batteryCapacity: "77.4 kWh", topSpeed: 185,
    chargingTime: "18 min (10-80%, ultra-fast charge)", seatingCapacity: 5, bootSpace: "480 L", groundClearance: "160 mm", warrantyYears: 7,
    features: ["Dual 12.3-inch curved display", "V2L (vehicle-to-load)", "Meridian sound system", "ADAS suite", "Augmented reality HUD"],
  },
  [key("Bajaj", "Chetak")]: {
    range: 108, batteryCapacity: "3 kWh", topSpeed: 63,
    chargingTime: "5h (0-100%)", seatingCapacity: 2, bootSpace: "12 L", groundClearance: "155 mm", warrantyYears: 3,
    features: ["Metal body construction", "IP67 rated battery", "Sport/Eco riding modes", "LED lighting", "Reverse assist"],
  },
}

/** Looks up known specs for a brand+model. Returns null if not in the catalog. */
export function lookupEVSpecs(brand, model) {
  return EV_CATALOG[key(brand, model)] || null
}
