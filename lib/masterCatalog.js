/**
 * 🚗 Master Catalog for Programmatic SEO (Models, Cities, RTO Tariffs, Subsidies)
 * Powers Programmatic Comparison Matrix & City On-Road Price Engine for EvCRM & CTE.
 */

export const POPULAR_MODELS = [
  {
    id: "tata-nexon-ev",
    name: "Tata Nexon EV",
    brand: "Tata",
    type: "SUV",
    category: "4W",
    exShowroom: 1449000,
    rangeKm: 465,
    batteryKwh: 40.5,
    topSpeedKmh: 140,
    chargingTimeHr: 6,
    fastChargingMin: 56,
    powerBhp: 143,
    torqueNm: 215,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🚗"
  },
  {
    id: "tata-punch-ev",
    name: "Tata Punch EV",
    brand: "Tata",
    type: "Compact SUV",
    category: "4W",
    exShowroom: 1099000,
    rangeKm: 421,
    batteryKwh: 35,
    topSpeedKmh: 120,
    chargingTimeHr: 5,
    fastChargingMin: 50,
    powerBhp: 122,
    torqueNm: 190,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🚗"
  },
  {
    id: "mg-comet-ev",
    name: "MG Comet EV",
    brand: "MG",
    type: "Hatchback",
    category: "4W",
    exShowroom: 699000,
    rangeKm: 230,
    batteryKwh: 17.3,
    topSpeedKmh: 100,
    chargingTimeHr: 7,
    fastChargingMin: 180,
    powerBhp: 42,
    torqueNm: 110,
    seating: 4,
    warrantyYears: 3,
    imageEmoji: "🚗"
  },
  {
    id: "mg-zs-ev",
    name: "MG ZS EV",
    brand: "MG",
    type: "SUV",
    category: "4W",
    exShowroom: 1898000,
    rangeKm: 461,
    batteryKwh: 50.3,
    topSpeedKmh: 140,
    chargingTimeHr: 8.5,
    fastChargingMin: 42,
    powerBhp: 177,
    torqueNm: 280,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🚗"
  },
  {
    id: "mahindra-xuv400",
    name: "Mahindra XUV400 EV",
    brand: "Mahindra",
    type: "SUV",
    category: "4W",
    exShowroom: 1549000,
    rangeKm: 456,
    batteryKwh: 39.4,
    topSpeedKmh: 150,
    chargingTimeHr: 6.5,
    fastChargingMin: 50,
    powerBhp: 150,
    torqueNm: 310,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🚗"
  },
  {
    id: "ather-450x",
    name: "Ather 450X",
    brand: "Ather",
    type: "Scooter",
    category: "2W",
    exShowroom: 144999,
    rangeKm: 150,
    batteryKwh: 3.7,
    topSpeedKmh: 90,
    chargingTimeHr: 5.7,
    fastChargingMin: 45,
    powerBhp: 8.5,
    torqueNm: 26,
    seating: 2,
    warrantyYears: 3,
    imageEmoji: "🛵"
  },
  {
    id: "ather-rizta",
    name: "Ather Rizta",
    brand: "Ather",
    type: "Scooter",
    category: "2W",
    exShowroom: 109999,
    rangeKm: 160,
    batteryKwh: 3.7,
    topSpeedKmh: 80,
    chargingTimeHr: 6.1,
    fastChargingMin: 50,
    powerBhp: 5.7,
    torqueNm: 22,
    seating: 2,
    warrantyYears: 3,
    imageEmoji: "🛵"
  },
  {
    id: "ola-s1-pro",
    name: "Ola S1 Pro Gen 2",
    brand: "Ola",
    type: "Scooter",
    category: "2W",
    exShowroom: 134999,
    rangeKm: 195,
    batteryKwh: 4.0,
    topSpeedKmh: 120,
    chargingTimeHr: 6.5,
    fastChargingMin: 40,
    powerBhp: 14.7,
    torqueNm: 58,
    seating: 2,
    warrantyYears: 8,
    imageEmoji: "🛵"
  },
  {
    id: "tvs-iqube",
    name: "TVS iQube Electric",
    brand: "TVS",
    type: "Scooter",
    category: "2W",
    exShowroom: 119628,
    rangeKm: 145,
    batteryKwh: 3.4,
    topSpeedKmh: 78,
    chargingTimeHr: 4.5,
    fastChargingMin: 120,
    powerBhp: 5.9,
    torqueNm: 33,
    seating: 2,
    warrantyYears: 3,
    imageEmoji: "🛵"
  },
  {
    id: "bajaj-chetak",
    name: "Bajaj Chetak Premium",
    brand: "Bajaj",
    type: "Scooter",
    category: "2W",
    exShowroom: 135463,
    rangeKm: 126,
    batteryKwh: 3.2,
    topSpeedKmh: 73,
    chargingTimeHr: 4.5,
    fastChargingMin: 180,
    powerBhp: 5.6,
    torqueNm: 20,
    seating: 2,
    warrantyYears: 3,
    imageEmoji: "🛵"
  },
  {
    id: "hero-vida-v1",
    name: "Hero Vida V1 Pro",
    brand: "Hero",
    type: "Scooter",
    category: "2W",
    exShowroom: 126200,
    rangeKm: 165,
    batteryKwh: 3.94,
    topSpeedKmh: 80,
    chargingTimeHr: 5.9,
    fastChargingMin: 65,
    powerBhp: 8.0,
    torqueNm: 25,
    seating: 2,
    warrantyYears: 3,
    imageEmoji: "🛵"
  },
  {
    id: "hyundai-ioniq-5",
    name: "Hyundai Ioniq 5",
    brand: "Hyundai",
    type: "SUV",
    category: "4W",
    exShowroom: 4605000,
    rangeKm: 631,
    batteryKwh: 72.6,
    topSpeedKmh: 185,
    chargingTimeHr: 7,
    fastChargingMin: 18,
    powerBhp: 214,
    torqueNm: 350,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🏎️"
  },
  {
    id: "kia-ev6",
    name: "Kia EV6 GT-Line",
    brand: "Kia",
    type: "Crossover",
    category: "4W",
    exShowroom: 6095000,
    rangeKm: 708,
    batteryKwh: 77.4,
    topSpeedKmh: 192,
    chargingTimeHr: 7.3,
    fastChargingMin: 18,
    powerBhp: 320,
    torqueNm: 605,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🏎️"
  },
  {
    id: "byd-atto-3",
    name: "BYD Atto 3",
    brand: "BYD",
    type: "SUV",
    category: "4W",
    exShowroom: 3399000,
    rangeKm: 521,
    batteryKwh: 60.48,
    topSpeedKmh: 160,
    chargingTimeHr: 9.5,
    fastChargingMin: 50,
    powerBhp: 201,
    torqueNm: 310,
    seating: 5,
    warrantyYears: 8,
    imageEmoji: "🚗"
  }
]

export const TOP_CITIES = [
  { name: "Hyderabad", state: "Telangana", rtoEvPct: 0, rtoIcePct: 14, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Bengaluru", state: "Karnataka", rtoEvPct: 0, rtoIcePct: 18, insurancePct: 3.8, stateSubsidyINR: 15000, fameEligible: true },
  { name: "Mumbai", state: "Maharashtra", rtoEvPct: 0, rtoIcePct: 13, insurancePct: 3.6, stateSubsidyINR: 20000, fameEligible: true },
  { name: "Delhi", state: "Delhi", rtoEvPct: 0, rtoIcePct: 10, insurancePct: 3.2, stateSubsidyINR: 30000, fameEligible: true },
  { name: "Chennai", state: "Tamil Nadu", rtoEvPct: 0, rtoIcePct: 15, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Pune", state: "Maharashtra", rtoEvPct: 0, rtoIcePct: 13, insurancePct: 3.6, stateSubsidyINR: 20000, fameEligible: true },
  { name: "Ahmedabad", state: "Gujarat", rtoEvPct: 0, rtoIcePct: 6, insurancePct: 3.4, stateSubsidyINR: 20000, fameEligible: true },
  { name: "Kolkata", state: "West Bengal", rtoEvPct: 0, rtoIcePct: 10, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Lucknow", state: "Uttar Pradesh", rtoEvPct: 0, rtoIcePct: 10, insurancePct: 3.3, stateSubsidyINR: 50000, fameEligible: true },
  { name: "Jaipur", state: "Rajasthan", rtoEvPct: 0, rtoIcePct: 11, insurancePct: 3.4, stateSubsidyINR: 15000, fameEligible: true },
  { name: "Kochi", state: "Kerala", rtoEvPct: 5, rtoIcePct: 15, insurancePct: 3.5, stateSubsidyINR: 0, fameEligible: true },
  { name: "Visakhapatnam", state: "Andhra Pradesh", rtoEvPct: 0, rtoIcePct: 14, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Vijayawada", state: "Andhra Pradesh", rtoEvPct: 0, rtoIcePct: 14, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Surat", state: "Gujarat", rtoEvPct: 0, rtoIcePct: 6, insurancePct: 3.4, stateSubsidyINR: 20000, fameEligible: true },
  { name: "Chandigarh", state: "Chandigarh", rtoEvPct: 0, rtoIcePct: 8, insurancePct: 3.2, stateSubsidyINR: 15000, fameEligible: true },
  { name: "Indore", state: "Madhya Pradesh", rtoEvPct: 0, rtoIcePct: 12, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Nagpur", state: "Maharashtra", rtoEvPct: 0, rtoIcePct: 13, insurancePct: 3.6, stateSubsidyINR: 20000, fameEligible: true },
  { name: "Coimbatore", state: "Tamil Nadu", rtoEvPct: 0, rtoIcePct: 15, insurancePct: 3.5, stateSubsidyINR: 10000, fameEligible: true },
  { name: "Gurugram", state: "Haryana", rtoEvPct: 0, rtoIcePct: 10, insurancePct: 3.3, stateSubsidyINR: 25000, fameEligible: true },
  { name: "Noida", state: "Uttar Pradesh", rtoEvPct: 0, rtoIcePct: 10, insurancePct: 3.3, stateSubsidyINR: 50000, fameEligible: true }
]

/** Calculates complete On-Road Price breakdown for any model in any city */
export function calculateOnRoadPrice(model, city) {
  if (!model || !city) return null

  const exShowroom = model.exShowroom || 0
  const rtoTax = Math.round(exShowroom * (city.rtoEvPct / 100))
  const insurance = Math.round(exShowroom * (city.insurancePct / 100))
  const fastTagTCS = exShowroom > 1000000 ? Math.round(exShowroom * 0.01) + 2000 : 1500
  const subsidy = (city.stateSubsidyINR || 0)

  const grossTotal = exShowroom + rtoTax + insurance + fastTagTCS
  const netOnRoadPrice = Math.max(0, grossTotal - subsidy)

  return {
    exShowroom,
    rtoTax,
    insurance,
    fastTagTCS,
    stateSubsidy: subsidy,
    grossTotal,
    netOnRoadPrice,
    rtoExemptionSaved: Math.round(exShowroom * (city.rtoIcePct / 100))
  }
}

/** Generates model vs model comparison matrix combinations */
export function getComparisonPairs() {
  const pairs = []
  for (let i = 0; i < POPULAR_MODELS.length; i++) {
    for (let j = i + 1; j < POPULAR_MODELS.length; j++) {
      const a = POPULAR_MODELS[i]
      const b = POPULAR_MODELS[j]
      // Compare vehicles of same category (2W vs 2W, 4W vs 4W)
      if (a.category === b.category) {
        const slug = `${a.id}-vs-${b.id}`
        pairs.push({ slug, modelA: a, modelB: b })
      }
    }
  }
  return pairs
}

/** Generates city price combination matrix */
export function getCityPricePairs() {
  const pairs = []
  for (const model of POPULAR_MODELS) {
    for (const city of TOP_CITIES) {
      const citySlug = city.name.toLowerCase().replace(/\s+/g, "-")
      const slug = `${model.id}-price-in-${citySlug}`
      pairs.push({ slug, model, city, citySlug })
    }
  }
  return pairs
}
