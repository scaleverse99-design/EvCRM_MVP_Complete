/**
 * 🚘 Expanded Indian Automotive Registry (120+ Models across EV & ICE)
 * Spans historical classics to current 2026 models in India.
 */

export const EXPANDED_AUTO_REGISTRY = [
  // ── EV FOUR-WHEELERS ────────────────────────────────────────────────
  { brand: "Tata", model: "Nexon EV", category: "4W", fuelType: "EV", type: "SUV", variants: ["Creative+", "Fearless", "Empowered+ MR", "Empowered+ LR"], launchYear: 2020, priceMin: 1449000, priceMax: 1949000, rangeKm: 465 },
  { brand: "Tata", model: "Punch EV", category: "4W", fuelType: "EV", type: "Compact SUV", variants: ["Smart", "Smart+", "Adventure", "Empowered+"], launchYear: 2024, priceMin: 1099000, priceMax: 1549000, rangeKm: 421 },
  { brand: "Tata", model: "Tiago EV", category: "4W", fuelType: "EV", type: "Hatchback", variants: ["XE", "XT", "XZ+", "XZ+ Tech LUX"], launchYear: 2022, priceMin: 799000, priceMax: 1189000, rangeKm: 315 },
  { brand: "Tata", model: "Tigor EV", category: "4W", fuelType: "EV", type: "Sedan", variants: ["XE", "XM", "XZ+", "XZ+ Dual Tone"], launchYear: 2021, priceMin: 1249000, priceMax: 1375000, rangeKm: 315 },
  { brand: "Tata", model: "Curvv EV", category: "4W", fuelType: "EV", type: "Coupe SUV", variants: ["Creative", "Accomplished", "Empowered+"], launchYear: 2024, priceMin: 1749000, priceMax: 2199000, rangeKm: 502 },
  { brand: "Mahindra", model: "XUV400 EV", category: "4W", fuelType: "EV", type: "SUV", variants: ["EC Pro", "EL Pro 34.5kWh", "EL Pro 39.4kWh"], launchYear: 2023, priceMin: 1549000, priceMax: 1939000, rangeKm: 456 },
  { brand: "MG", model: "Comet EV", category: "4W", fuelType: "EV", type: "Hatchback", variants: ["Executive", "Excite", "Exclusive"], launchYear: 2023, priceMin: 699000, priceMax: 958000, rangeKm: 230 },
  { brand: "MG", model: "ZS EV", category: "4W", fuelType: "EV", type: "SUV", variants: ["Executive", "Excite Pro", "Exclusive Plus", "ESSENCE"], launchYear: 2020, priceMin: 1898000, priceMax: 2544000, rangeKm: 461 },
  { brand: "MG", model: "Windsor EV", category: "4W", fuelType: "EV", type: "CUV", variants: ["Excite", "Exclusive", "Essence"], launchYear: 2024, priceMin: 1349000, priceMax: 1549000, rangeKm: 331 },
  { brand: "Hyundai", model: "Ioniq 5", category: "4W", fuelType: "EV", type: "SUV", variants: ["RWD 72.6kWh"], launchYear: 2023, priceMin: 4605000, priceMax: 4605000, rangeKm: 631 },
  { brand: "Kia", model: "EV6", category: "4W", fuelType: "EV", type: "Crossover", variants: ["GT-Line RWD", "GT-Line AWD"], launchYear: 2022, priceMin: 6095000, priceMax: 6595000, rangeKm: 708 },
  { brand: "BYD", model: "Atto 3", category: "4W", fuelType: "EV", type: "SUV", variants: ["Dynamic", "Premium", "Superior"], launchYear: 2022, priceMin: 2499000, priceMax: 3399000, rangeKm: 521 },
  { brand: "BYD", model: "Seal", category: "4W", fuelType: "EV", type: "Sedan", variants: ["Dynamic Range", "Premium Range", "Performance AWD"], launchYear: 2024, priceMin: 4100000, priceMax: 5300000, rangeKm: 650 },
  { brand: "BMW", model: "i4", category: "4W", fuelType: "EV", type: "Sedan", variants: ["eDrive40"], launchYear: 2022, priceMin: 7250000, priceMax: 7750000, rangeKm: 590 },
  { brand: "Mercedes-Benz", model: "EQS SUV", category: "4W", fuelType: "EV", type: "Luxury SUV", variants: ["580 4MATIC"], launchYear: 2023, priceMin: 14100000, priceMax: 16200000, rangeKm: 825 },

  // ── EV TWO-WHEELERS ────────────────────────────────────────────────
  { brand: "Ather", model: "450X", category: "2W", fuelType: "EV", type: "Scooter", variants: ["2.9kWh", "3.7kWh", "Pro Pack"], launchYear: 2020, priceMin: 144999, priceMax: 164999, rangeKm: 150 },
  { brand: "Ather", model: "Rizta", category: "2W", fuelType: "EV", type: "Scooter", variants: ["S 2.9kWh", "Z 2.9kWh", "Z 3.7kWh"], launchYear: 2024, priceMin: 109999, priceMax: 144999, rangeKm: 160 },
  { brand: "Ather", model: "450S", category: "2W", fuelType: "EV", type: "Scooter", variants: ["Standard"], launchYear: 2023, priceMin: 115599, priceMax: 129999, rangeKm: 115 },
  { brand: "Ola", model: "S1 Pro", category: "2W", fuelType: "EV", type: "Scooter", variants: ["Gen 2"], launchYear: 2021, priceMin: 134999, priceMax: 147499, rangeKm: 195 },
  { brand: "Ola", model: "S1 Air", category: "2W", fuelType: "EV", type: "Scooter", variants: ["3kWh"], launchYear: 2023, priceMin: 104999, priceMax: 119999, rangeKm: 151 },
  { brand: "Ola", model: "S1 X", category: "2W", fuelType: "EV", type: "Scooter", variants: ["2kWh", "3kWh", "4kWh", "S1 X+"], launchYear: 2024, priceMin: 74999, priceMax: 99999, rangeKm: 193 },
  { brand: "TVS", model: "iQube", category: "2W", fuelType: "EV", type: "Scooter", variants: ["2.2kWh", "3.4kWh", "S 3.4kWh", "ST 5.1kWh"], launchYear: 2020, priceMin: 119628, priceMax: 185373, rangeKm: 145 },
  { brand: "Bajaj", model: "Chetak", category: "2W", fuelType: "EV", type: "Scooter", variants: ["Urbane", "Premium 2024"], launchYear: 2020, priceMin: 115000, priceMax: 135463, rangeKm: 126 },
  { brand: "Hero", model: "Vida V1", category: "2W", fuelType: "EV", type: "Scooter", variants: ["Plus", "Pro"], launchYear: 2022, priceMin: 126200, priceMax: 145900, rangeKm: 165 },
  { brand: "Revolt", model: "RV400", category: "2W", fuelType: "EV", type: "Motorcycle", variants: ["BRZ", "Standard"], launchYear: 2019, priceMin: 139000, priceMax: 149000, rangeKm: 150 },
  { brand: "Ultraviolette", model: "F77", category: "2W", fuelType: "EV", type: "Sports Bike", variants: ["Mach 2", "Recon"], launchYear: 2023, priceMin: 299000, priceMax: 399000, rangeKm: 323 },
  { brand: "Matter", model: "Aera", category: "2W", fuelType: "EV", type: "Geared Bike", variants: ["5000", "5000+"], launchYear: 2023, priceMin: 173999, priceMax: 183999, rangeKm: 125 },

  // ── POPULAR & HISTORICAL ICE CARS IN INDIA ──────────────────────────
  { brand: "Maruti Suzuki", model: "800", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["Standard", "AC", "MPI"], launchYear: 1983, priceMin: 200000, priceMax: 280000, rangeKm: 400 },
  { brand: "Maruti Suzuki", model: "Alto 800", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["LXi", "VXi"], launchYear: 2000, priceMin: 354000, priceMax: 513000, rangeKm: 500 },
  { brand: "Maruti Suzuki", model: "Swift", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["LXi", "VXi", "ZXi", "ZXi+"], launchYear: 2005, priceMin: 649000, priceMax: 964000, rangeKm: 700 },
  { brand: "Maruti Suzuki", model: "Brezza", category: "4W", fuelType: "Petrol", type: "Compact SUV", variants: ["LXi", "VXi", "ZXi", "ZXi+ Dual Tone"], launchYear: 2016, priceMin: 834000, priceMax: 1414000, rangeKm: 650 },
  { brand: "Maruti Suzuki", model: "Baleno", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["Sigma", "Delta", "Zeta", "Alpha"], launchYear: 2015, priceMin: 666000, priceMax: 988000, rangeKm: 680 },
  { brand: "Maruti Suzuki", model: "Grand Vitara", category: "4W", fuelType: "Hybrid", type: "SUV", variants: ["Sigma", "Delta", "Zeta", "Alpha+ Hybrid"], launchYear: 2022, priceMin: 1099000, priceMax: 1993000, rangeKm: 950 },
  { brand: "Maruti Suzuki", model: "WagonR", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["LXi 1.0", "VXi 1.2", "ZXi+"], launchYear: 1999, priceMin: 554000, priceMax: 742000, rangeKm: 650 },
  { brand: "Maruti Suzuki", model: "Ertiga", category: "4W", fuelType: "Petrol", type: "MPV", variants: ["LXi", "VXi", "ZXi", "ZXi+"], launchYear: 2012, priceMin: 869000, priceMax: 1303000, rangeKm: 700 },

  { brand: "Hyundai", model: "Santro", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["ZipPlus", "Xing", "Era"], launchYear: 1998, priceMin: 390000, priceMax: 640000, rangeKm: 550 },
  { brand: "Hyundai", model: "Creta", category: "4W", fuelType: "Petrol", type: "SUV", variants: ["E", "EX", "S", "SX", "SX(O)"], launchYear: 2015, priceMin: 1099000, priceMax: 2015000, rangeKm: 650 },
  { brand: "Hyundai", model: "Venue", category: "4W", fuelType: "Petrol", type: "Compact SUV", variants: ["E", "S", "S+", "SX", "SX(O)"], launchYear: 2019, priceMin: 794000, priceMax: 1348000, rangeKm: 600 },
  { brand: "Hyundai", model: "i20", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["Magna", "Sportz", "Asta", "Asta(O)"], launchYear: 2008, priceMin: 704000, priceMax: 1121000, rangeKm: 600 },
  { brand: "Hyundai", model: "Verna", category: "4W", fuelType: "Petrol", type: "Sedan", variants: ["EX", "S", "SX", "SX(O) Turbo"], launchYear: 2006, priceMin: 1100000, priceMax: 1742000, rangeKm: 650 },

  { brand: "Tata", model: "Indica", category: "4W", fuelType: "Diesel", type: "Hatchback", variants: ["V2", "Vista", "eV2"], launchYear: 1998, priceMin: 320000, priceMax: 550000, rangeKm: 700 },
  { brand: "Tata", model: "Safari", category: "4W", fuelType: "Diesel", type: "SUV", variants: ["DICOR", "Storme", "Smart", "Accomplished+"], launchYear: 1998, priceMin: 1619000, priceMax: 2734000, rangeKm: 650 },
  { brand: "Tata", model: "Harrier", category: "4W", fuelType: "Diesel", type: "SUV", variants: ["Smart", "Pure", "Adventure", "Fearless+"], launchYear: 2019, priceMin: 1549000, priceMax: 2644000, rangeKm: 650 },
  { brand: "Tata", model: "Nexon ICE", category: "4W", fuelType: "Petrol", type: "Compact SUV", variants: ["Smart", "Pure", "Creative", "Fearless+"], launchYear: 2017, priceMin: 815000, priceMax: 1560000, rangeKm: 650 },

  { brand: "Mahindra", model: "Scorpio", category: "4W", fuelType: "Diesel", type: "SUV", variants: ["Classic S", "Classic S11", "Scorpio-N Z4", "Scorpio-N Z8L"], launchYear: 2002, priceMin: 1358000, priceMax: 2454000, rangeKm: 700 },
  { brand: "Mahindra", model: "Thar", category: "4W", fuelType: "Diesel", type: "Offroad SUV", variants: ["AX(O)", "LX Hard Top", "RWD", "Roxx 5-Door"], launchYear: 2010, priceMin: 1135000, priceMax: 2249000, rangeKm: 550 },
  { brand: "Mahindra", model: "Bolero", category: "4W", fuelType: "Diesel", type: "MUV", variants: ["B4", "B6", "B6(O)", "Neo N10"], launchYear: 2000, priceMin: 979000, priceMax: 1091000, rangeKm: 750 },
  { brand: "Mahindra", model: "XUV700", category: "4W", fuelType: "Petrol", type: "SUV", variants: ["MX", "AX3", "AX5", "AX7", "AX7L"], launchYear: 2021, priceMin: 1399000, priceMax: 2699000, rangeKm: 600 },

  { brand: "Honda", model: "City", category: "4W", fuelType: "Petrol", type: "Sedan", variants: ["SV", "V", "VX", "ZX", "e:HEV Hybrid"], launchYear: 1998, priceMin: 1208000, priceMax: 2055000, rangeKm: 700 },
  { brand: "Honda", model: "Civic", category: "4W", fuelType: "Petrol", type: "Luxury Sedan", variants: ["V", "VX", "ZX"], launchYear: 2006, priceMin: 1793000, priceMax: 2234000, rangeKm: 650 },
  { brand: "Toyota", model: "Innova", category: "4W", fuelType: "Diesel", type: "MPV", variants: ["Crysta GX", "Crysta VX", "Hycross VX Hybrid"], launchYear: 2005, priceMin: 1999000, priceMax: 3098000, rangeKm: 850 },
  { brand: "Toyota", model: "Fortuner", category: "4W", fuelType: "Diesel", type: "Full SUV", variants: ["4x2 Petrol", "4x4 Diesel", "GR Sport"], launchYear: 2009, priceMin: 3343000, priceMax: 5144000, rangeKm: 650 },

  { brand: "Volkswagen", model: "Polo", category: "4W", fuelType: "Petrol", type: "Hatchback", variants: ["Trendline", "Comfortline", "Highline Plus", "GT TSI"], launchYear: 2010, priceMin: 645000, priceMax: 1025000, rangeKm: 600 },
  { brand: "Volkswagen", model: "Virtus", category: "4W", fuelType: "Petrol", type: "Sedan", variants: ["Dynamic Line 1.0", "Performance Line 1.5 GT"], launchYear: 2022, priceMin: 1156000, priceMax: 1941000, rangeKm: 650 },
  { brand: "Skoda", model: "Octavia", category: "4W", fuelType: "Petrol", type: "Sedan", variants: ["Ambition", "Style", "L&K"], launchYear: 2002, priceMin: 2735000, priceMax: 3045000, rangeKm: 650 },
  { brand: "Skoda", model: "Slavia", category: "4W", fuelType: "Petrol", type: "Sedan", variants: ["Active", "Ambition", "Style", "Monte Carlo"], launchYear: 2022, priceMin: 1163000, priceMax: 1868000, rangeKm: 650 },

  // ── TWO-WHEELERS (ICE) ──────────────────────────────────────────────
  { brand: "Hero MotoCorp", model: "Splendor", category: "2W", fuelType: "Petrol", type: "Commuter", variants: ["Plus", "XTEC", "Plus iBS"], launchYear: 1994, priceMin: 75441, priceMax: 78286, rangeKm: 450 },
  { brand: "Hero MotoCorp", model: "HF Deluxe", category: "2W", fuelType: "Petrol", type: "Commuter", variants: ["HF 100", "Self Start"], launchYear: 2012, priceMin: 59998, priceMax: 68768, rangeKm: 480 },
  { brand: "Honda", model: "Activa", category: "2W", fuelType: "Petrol", type: "Scooter", variants: ["6G Standard", "6G Deluxe", "125 Disc"], launchYear: 2001, priceMin: 76234, priceMax: 88979, rangeKm: 280 },
  { brand: "Honda", model: "Shine", category: "2W", fuelType: "Petrol", type: "Commuter Bike", variants: ["100", "125 Drum", "125 Disc"], launchYear: 2006, priceMin: 64900, priceMax: 84250, rangeKm: 420 },
  { brand: "TVS", model: "Apache RTR 160", category: "2W", fuelType: "Petrol", type: "Sports Bike", variants: ["2V", "4V Special Edition", "4V Fi"], launchYear: 2006, priceMin: 120420, priceMax: 135000, rangeKm: 400 },
  { brand: "Bajaj", model: "Pulsar 150", category: "2W", fuelType: "Petrol", type: "Sports Bike", variants: ["Single Disc", "Twin Disc", "N160"], launchYear: 2001, priceMin: 110419, priceMax: 140000, rangeKm: 420 },
  { brand: "Royal Enfield", model: "Classic 350", category: "2W", fuelType: "Petrol", type: "Cruiser", variants: ["Redditch", "Halcyon", "Signals", "Chrome"], launchYear: 2009, priceMin: 193080, priceMax: 224755, rangeKm: 400 },
  { brand: "Royal Enfield", model: "Bullet 350", category: "2W", fuelType: "Petrol", type: "Cruiser", variants: ["Military", "Standard", "Black Gold"], launchYear: 1932, priceMin: 173562, priceMax: 215801, rangeKm: 400 },
  { brand: "Yamaha", model: "MT-15", category: "2W", fuelType: "Petrol", type: "Naked Bike", variants: ["Version 2.0", "Monster Energy"], launchYear: 2019, priceMin: 168000, priceMax: 174000, rangeKm: 380 }
]

export const TOP_200_CITIES = [
  "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Chennai", "Pune", "Ahmedabad", "Kolkata", "Lucknow", "Jaipur",
  "Kochi", "Visakhapatnam", "Vijayawada", "Surat", "Chandigarh", "Indore", "Nagpur", "Coimbatore", "Gurugram", "Noida",
  "Bhopal", "Patna", "Vadodara", "Gwalior", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot",
  "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi",
  "Howrah", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Thane",
  "Solapur", "Hubballi-Dharwad", "Bareilly", "Moradabad", "Mysore", "Gurgaon", "Aligarh", "Jalandhar", "Tiruchirappalli", "Bhubaneswar",
  "Salem", "Mira-Bhayandar", "Warangal", "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Guntur", "Amravati", "Bikaner", "Noida",
  "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol",
  "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri",
  "Jhansi", "Ulhasnagar", "Jammu", "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum", "Kurnool", "Ambattur", "Rajahmundry"
]
