/**
 * 🚗 EvCRM JIT Inventory Seeding & Import Tool
 * Reads existing inventory and imports 5 high-fidelity redirect vehicles (both EV and ICE).
 * Can be scaled to generate 1,000+ live vehicles linking to external aggregator pages.
 */

import { readTable, writeTable } from "../lib/store.js"

const HIGH_FIDELITY_VEHICLES = [
  {
    id: "inv_wagon_r_2015_jit",
    dealership: "used-car-demo-owner",
    dealerName: "Used Car Demo Owner",
    brand: "Maruti Suzuki",
    model: "Wagon R VXI AMT",
    variant: "VXI",
    type: "4W",
    bodyType: "Hatchback",
    year: 2015,
    km: 73000,
    condition: "used",
    fuelType: "Petrol",
    color: "Sky Blue",
    exShowroom: 215000,
    onRoadPrice: 250000,
    tokenAmount: 1000,
    status: "IN_STOCK",
    vin: "MA3FDE2015XYZ8888",
    isDemo: false,
    features: ["Power Windows", "Central Locking", "AMT Automatic Gearbox"],
    state: "Telangana",
    district: "Hyderabad",
    tags: ["JIT_REDIRECT"],
    images: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800"
    ],
    inspectionReport: {
      overallGrade: "A",
      approvalStatus: "APPROVED",
      approvedAt: "2026-08-01T10:00:00Z"
    },
    // The Buy redirection link
    redirectUrl: "https://www.cars24.com/buy-used-maruti-wagon-r-1.0-2015-cars-hyderabad-100293847/",
    transmission: "Automatic",
    engineDetails: "998 cc, 3 Cylinders, 67 bhp",
    seatingCapacity: "5",
    bootSpace: "180 L",
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z"
  },
  {
    id: "inv_nexon_ev_2022_jit",
    dealership: "greendrive-premium-cars",
    dealerName: "GreenDrive Premium Cars",
    brand: "Tata",
    model: "Nexon EV Max",
    variant: "XZ+ Lux",
    type: "4W",
    bodyType: "SUV",
    year: 2022,
    km: 28000,
    condition: "used",
    fuelType: "Electric",
    color: "Intense Teal",
    range: 437,
    batteryCapacity: "40.5 kWh",
    topSpeed: 140,
    chargingTime: "6.5 hrs",
    seatingCapacity: "5",
    bootSpace: "350 L",
    exShowroom: 1350000,
    onRoadPrice: 1420000,
    tokenAmount: 1000,
    status: "IN_STOCK",
    vin: "MATATAEV2022NEXON",
    isDemo: false,
    features: ["Fast Charging Support", "Sunroof", "Regenerative Braking"],
    state: "Karnataka",
    district: "Bangalore",
    tags: ["JIT_REDIRECT"],
    images: [
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1525609004556-c46c7d6cf0a3?auto=format&fit=crop&q=80&w=800"
    ],
    inspectionReport: {
      overallGrade: "A+",
      approvalStatus: "APPROVED",
      approvedAt: "2026-08-01T10:00:00Z"
    },
    redirectUrl: "https://www.spinny.com/buy-used-cars/bangalore/tata/nexon-ev-max/xz-plus-lux-2022/",
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z"
  },
  {
    id: "inv_comet_ev_2023_jit",
    dealership: "electra-hub-delhi",
    dealerName: "Electra Hub Delhi",
    brand: "MG",
    model: "Comet EV",
    variant: "Play",
    type: "4W",
    bodyType: "Hatchback",
    year: 2023,
    km: 8500,
    condition: "used",
    fuelType: "Electric",
    color: "Apple Green",
    range: 230,
    batteryCapacity: "17.3 kWh",
    topSpeed: 100,
    chargingTime: "7 hrs",
    seatingCapacity: "4",
    bootSpace: "0 L",
    exShowroom: 720000,
    onRoadPrice: 755000,
    tokenAmount: 1000,
    status: "IN_STOCK",
    vin: "MAMGCOMET2023PLAY",
    isDemo: false,
    features: ["Smart Connect", "Dual Screens", "Compact Parking Assist"],
    state: "Delhi",
    district: "Delhi",
    tags: ["JIT_REDIRECT"],
    images: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800"
    ],
    inspectionReport: {
      overallGrade: "A",
      approvalStatus: "APPROVED",
      approvedAt: "2026-08-01T10:00:00Z"
    },
    redirectUrl: "https://www.carwale.com/used/mg-comet-ev-cars-in-delhi-ncr/",
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z"
  },
  {
    id: "inv_ioniq5_2023_jit",
    dealership: "apex-luxury-motors",
    dealerName: "Apex Luxury Motors",
    brand: "Hyundai",
    model: "IONIQ 5",
    variant: "RWD",
    type: "4W",
    bodyType: "SUV",
    year: 2023,
    km: 12000,
    condition: "used",
    fuelType: "Electric",
    color: "Gravity Gold",
    range: 631,
    batteryCapacity: "72.6 kWh",
    topSpeed: 185,
    chargingTime: "18 mins (Fast Charge)",
    seatingCapacity: "5",
    bootSpace: "527 L",
    exShowroom: 4595000,
    onRoadPrice: 4750000,
    tokenAmount: 1000,
    status: "IN_STOCK",
    vin: "MAHYUNDAI2023IONIQ5",
    isDemo: false,
    features: ["V2L Charging Out", "Panoramic Sunroof", "ADSD Level 2"],
    state: "Maharashtra",
    district: "Mumbai",
    tags: ["JIT_REDIRECT"],
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800"
    ],
    inspectionReport: {
      overallGrade: "A++",
      approvalStatus: "APPROVED",
      approvedAt: "2026-08-01T10:00:00Z"
    },
    redirectUrl: "https://www.cars24.com/buy-used-hyundai-ioniq-5-mumbai/",
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z"
  },
  {
    id: "inv_xuv400_2023_jit",
    dealership: "nippon-mahindra",
    dealerName: "Nippon Mahindra",
    brand: "Mahindra",
    model: "XUV400",
    variant: "EC",
    type: "4W",
    bodyType: "SUV",
    year: 2023,
    km: 19500,
    condition: "used",
    fuelType: "Electric",
    color: "Infinity Blue",
    range: 375,
    batteryCapacity: "34.5 kWh",
    topSpeed: 150,
    chargingTime: "50 mins",
    seatingCapacity: "5",
    bootSpace: "378 L",
    exShowroom: 1599000,
    onRoadPrice: 1680000,
    tokenAmount: 1000,
    status: "IN_STOCK",
    vin: "MAMAHINDRA2023XUV4",
    isDemo: false,
    features: ["Smart Watch Connectivity", "Regen Braking", "Dual Airbags"],
    state: "Tamil Nadu",
    district: "Chennai",
    tags: ["JIT_REDIRECT"],
    images: [
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800"
    ],
    inspectionReport: {
      overallGrade: "A",
      approvalStatus: "APPROVED",
      approvedAt: "2026-08-01T10:00:00Z"
    },
    redirectUrl: "https://www.spinny.com/buy-used-cars/chennai/mahindra/xuv400/",
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z"
  }
]

async function main() {
  console.log("Reading existing inventory...")
  let currentInventory = []
  try {
    currentInventory = await readTable("inventory")
  } catch (e) {
    console.log("No existing inventory table found, starting fresh.")
  }

  // Filter out any older versions of our seeded JIT vehicles or simulated stocks to prevent duplicates and clean old cities
  const jitIds = HIGH_FIDELITY_VEHICLES.map(v => v.id)
  let updatedList = currentInventory.filter(v => !jitIds.includes(v.id) && !v.tags?.includes("SIMULATED_STOCK"))

  // Append new high-fidelity vehicles
  updatedList = [...updatedList, ...HIGH_FIDELITY_VEHICLES]

  // Optional: Scale to 1,000+ simulated items
  console.log("Generating 1,000 extra simulated vehicle stocks...")
  const brands = ["Tata", "MG", "Mahindra", "Hyundai", "Maruti Suzuki"]
  const types = ["4W", "2W"]
  const fuelTypes = ["Electric", "Petrol"]
  const cities = [
    { name: "Hyderabad", state: "Telangana" },
    { name: "Bangalore", state: "Karnataka" }
  ]

  for (let i = 1; i <= 1000; i++) {
    const brand = brands[i % brands.length]
    const type = types[i % types.length]
    const fuel = fuelTypes[i % fuelTypes.length]
    const city = cities[i % cities.length]
    const id = `inv_simulated_${i}`

    // Skip if already in list
    if (updatedList.some(v => v.id === id)) continue

    const simulatedVal = {
      id,
      dealership: `dealer-simulated-${i}`,
      dealerName: `${brand} Partner Dealership #${i}`,
      brand,
      model: `${brand} Model-S${i}`,
      variant: "Standard",
      type,
      bodyType: type === "4W" ? "SUV" : "Scooter",
      year: 2024 - (i % 5),
      km: (i % 2 === 0) ? 0 : 5000 + (i * 27) % 50000,
      condition: (i % 2 === 0) ? "new" : "used",
      fuelType: fuel,
      color: "Metallic Silver",
      range: fuel === "Electric" ? 250 + (i % 10) * 20 : null,
      exShowroom: 150000 + (i * 12345) % 1500000,
      onRoadPrice: 175000 + (i * 12345) % 1500000,
      tokenAmount: 1000,
      status: "IN_STOCK",
      vin: `VINSIMULATED${i}XYZ8888`,
      isDemo: false,
      state: city.state,
      district: city.name,
      tags: ["SIMULATED_STOCK"],
      images: ["🚗"],
      redirectUrl: `https://www.carwale.com/used/${brand.toLowerCase()}-cars-in-${city.name.toLowerCase()}/`,
      createdAt: new Date().toISOString()
    }

    updatedList.push(simulatedVal)
  }

  console.log(`Writing ${updatedList.length} total inventory records back to store...`)
  await writeTable("inventory", updatedList)
  console.log("✅ Seed import complete!")
}

main().catch(console.error)
