/**
 * 🚘 Complete Indian Automotive Registry (EV + ICE)
 * Spans all major brands & models launched in India (Cars, Two-Wheelers, Three-Wheelers).
 */

export const INDIAN_AUTO_REGISTRY = [
  // ── EV FOUR-WHEELERS (SUVs, Cars) ──────────────────────────────────
  { brand: "Tata", model: "Nexon EV", category: "4W", fuelType: "EV", type: "SUV", launchYear: 2020, priceMin: 1449000, priceMax: 1949000, rangeKm: 465, buyNewUrl: "https://ev.tatamotors.com/nexon/ev.html", buyUsedUrl: "https://www.spinny.com/used-tata-nexon-ev-cars/", popular: true },
  { brand: "Tata", model: "Punch EV", category: "4W", fuelType: "EV", type: "Compact SUV", launchYear: 2024, priceMin: 1099000, priceMax: 1549000, rangeKm: 421, buyNewUrl: "https://ev.tatamotors.com/punch/ev.html", buyUsedUrl: "https://www.spinny.com/used-tata-cars/", popular: true },
  { brand: "Tata", model: "Tiago EV", category: "4W", fuelType: "EV", type: "Hatchback", launchYear: 2022, priceMin: 799000, priceMax: 1189000, rangeKm: 315, buyNewUrl: "https://ev.tatamotors.com/tiago/ev.html", buyUsedUrl: "https://www.spinny.com/used-tata-cars/", popular: true },
  { brand: "Tata", model: "Tigor EV", category: "4W", fuelType: "EV", type: "Sedan", launchYear: 2021, priceMin: 1249000, priceMax: 1375000, rangeKm: 315, buyNewUrl: "https://ev.tatamotors.com/tigor/ev.html", buyUsedUrl: "https://www.spinny.com/used-tata-cars/", popular: false },
  { brand: "Tata", model: "Curvv EV", category: "4W", fuelType: "EV", type: "Coupe SUV", launchYear: 2024, priceMin: 1749000, priceMax: 2199000, rangeKm: 502, buyNewUrl: "https://ev.tatamotors.com/", buyUsedUrl: "https://www.spinny.com/used-tata-cars/", popular: true },

  { brand: "Mahindra", model: "XUV400 EV", category: "4W", fuelType: "EV", type: "SUV", launchYear: 2023, priceMin: 1549000, priceMax: 1939000, rangeKm: 456, buyNewUrl: "https://mahindra-xuv400.com/", buyUsedUrl: "https://www.spinny.com/used-mahindra-cars/", popular: true },
  { brand: "MG", model: "Comet EV", category: "4W", fuelType: "EV", type: "Hatchback", launchYear: 2023, priceMin: 699000, priceMax: 958000, rangeKm: 230, buyNewUrl: "https://www.mgmotor.co.in/vehicles/comet-ev", buyUsedUrl: "https://www.spinny.com/used-mg-cars/", popular: true },
  { brand: "MG", model: "ZS EV", category: "4W", fuelType: "EV", type: "SUV", launchYear: 2020, priceMin: 1898000, priceMax: 2544000, rangeKm: 461, buyNewUrl: "https://www.mgmotor.co.in/vehicles/zsev", buyUsedUrl: "https://www.spinny.com/used-mg-cars/", popular: true },
  { brand: "MG", model: "Windsor EV", category: "4W", fuelType: "EV", type: "CUV", launchYear: 2024, priceMin: 1349000, priceMax: 1549000, rangeKm: 331, buyNewUrl: "https://www.mgmotor.co.in/", buyUsedUrl: "https://www.spinny.com/used-mg-cars/", popular: true },
  
  { brand: "Hyundai", model: "Ioniq 5", category: "4W", fuelType: "EV", type: "SUV", launchYear: 2023, priceMin: 4605000, priceMax: 4605000, rangeKm: 631, buyNewUrl: "https://www.hyundai.com/in/en/find-a-car/ioniq5/", buyUsedUrl: "https://www.spinny.com/used-hyundai-cars/", popular: true },
  { brand: "Kia", model: "EV6", category: "4W", fuelType: "EV", type: "Crossover", launchYear: 2022, priceMin: 6095000, priceMax: 6595000, rangeKm: 708, buyNewUrl: "https://www.kia.com/in/our-vehicles/ev6.html", buyUsedUrl: "https://www.spinny.com/used-kia-cars/", popular: true },
  { brand: "BYD", model: "Atto 3", category: "4W", fuelType: "EV", type: "SUV", launchYear: 2022, priceMin: 2499000, priceMax: 3399000, rangeKm: 521, buyNewUrl: "https://bydauto.in/byd-atto3", buyUsedUrl: "https://www.spinny.com/used-cars/", popular: true },
  { brand: "BYD", model: "Seal", category: "4W", fuelType: "EV", type: "Sedan", launchYear: 2024, priceMin: 4100000, priceMax: 5300000, rangeKm: 650, buyNewUrl: "https://bydauto.in/", buyUsedUrl: "https://www.spinny.com/used-cars/", popular: true },
  
  // ── EV TWO-WHEELERS (Scooters & Motorcycles) ──────────────────────
  { brand: "Ather", model: "450X", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2020, priceMin: 144999, priceMax: 164999, rangeKm: 150, buyNewUrl: "https://www.atherenergy.com/450x", buyUsedUrl: "https://www.carwale.com/used/ather-cars/", popular: true },
  { brand: "Ather", model: "Rizta", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2024, priceMin: 109999, priceMax: 144999, rangeKm: 160, buyNewUrl: "https://www.atherenergy.com/rizta", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Ather", model: "450S", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2023, priceMin: 115599, priceMax: 129999, rangeKm: 115, buyNewUrl: "https://www.atherenergy.com/", buyUsedUrl: "https://www.carwale.com/used/", popular: false },
  
  { brand: "Ola", model: "S1 Pro", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2021, priceMin: 134999, priceMax: 147499, rangeKm: 195, buyNewUrl: "https://olaelectric.com/s1-pro", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Ola", model: "S1 Air", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2023, priceMin: 104999, priceMax: 119999, rangeKm: 151, buyNewUrl: "https://olaelectric.com/s1-air", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Ola", model: "S1 X", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2024, priceMin: 74999, priceMax: 99999, rangeKm: 193, buyNewUrl: "https://olaelectric.com/s1-x", buyUsedUrl: "https://www.carwale.com/used/", popular: true },

  { brand: "TVS", model: "iQube", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2020, priceMin: 119628, priceMax: 185373, rangeKm: 145, buyNewUrl: "https://www.tvsmotor.com/iqube", buyUsedUrl: "https://www.carwale.com/used/tvs-cars/", popular: true },
  { brand: "Bajaj", model: "Chetak Premium", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2020, priceMin: 115000, priceMax: 135463, rangeKm: 126, buyNewUrl: "https://www.chetak.com/", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Hero", model: "Vida V1 Pro", category: "2W", fuelType: "EV", type: "Scooter", launchYear: 2022, priceMin: 126200, priceMax: 145900, rangeKm: 165, buyNewUrl: "https://www.vidaworld.com/", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Revolt", model: "RV400", category: "2W", fuelType: "EV", type: "Motorcycle", launchYear: 2019, priceMin: 139000, priceMax: 149000, rangeKm: 150, buyNewUrl: "https://www.revoltmotors.com/", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Ultraviolette", model: "F77 Mach 2", category: "2W", fuelType: "EV", type: "Sports Bike", launchYear: 2023, priceMin: 299000, priceMax: 399000, rangeKm: 323, buyNewUrl: "https://www.ultraviolette.com/", buyUsedUrl: "https://www.carwale.com/used/", popular: true },

  // ── POPULAR ICE VEHICLES (Cars & Two-Wheelers in India) ─────────────
  { brand: "Maruti Suzuki", model: "Brezza", category: "4W", fuelType: "Petrol", type: "Compact SUV", launchYear: 2016, priceMin: 834000, priceMax: 1414000, rangeKm: 650, buyNewUrl: "https://www.marutisuzuki.com/brezza", buyUsedUrl: "https://www.spinny.com/used-maruti-suzuki-vitara-brezza-cars/", popular: true },
  { brand: "Maruti Suzuki", model: "Swift", category: "4W", fuelType: "Petrol", type: "Hatchback", launchYear: 2005, priceMin: 649000, priceMax: 964000, rangeKm: 700, buyNewUrl: "https://www.marutisuzuki.com/swift", buyUsedUrl: "https://www.spinny.com/used-maruti-suzuki-swift-cars/", popular: true },
  { brand: "Maruti Suzuki", model: "Baleno", category: "4W", fuelType: "Petrol", type: "Hatchback", launchYear: 2015, priceMin: 666000, priceMax: 988000, rangeKm: 680, buyNewUrl: "https://www.nexaexperience.com/baleno", buyUsedUrl: "https://www.spinny.com/used-maruti-suzuki-baleno-cars/", popular: true },
  { brand: "Maruti Suzuki", model: "Grand Vitara", category: "4W", fuelType: "Hybrid", type: "SUV", launchYear: 2022, priceMin: 1099000, priceMax: 1993000, rangeKm: 950, buyNewUrl: "https://www.nexaexperience.com/grand-vitara", buyUsedUrl: "https://www.spinny.com/used-maruti-suzuki-cars/", popular: true },

  { brand: "Hyundai", model: "Creta", category: "4W", fuelType: "Petrol", type: "SUV", launchYear: 2015, priceMin: 1099000, priceMax: 2015000, rangeKm: 650, buyNewUrl: "https://www.hyundai.com/in/en/find-a-car/creta/", buyUsedUrl: "https://www.spinny.com/used-hyundai-creta-cars/", popular: true },
  { brand: "Hyundai", model: "Venue", category: "4W", fuelType: "Petrol", type: "Compact SUV", launchYear: 2019, priceMin: 794000, priceMax: 1348000, rangeKm: 600, buyNewUrl: "https://www.hyundai.com/in/en/find-a-car/venue/", buyUsedUrl: "https://www.spinny.com/used-hyundai-venue-cars/", popular: true },
  { brand: "Hyundai", model: "i20", category: "4W", fuelType: "Petrol", type: "Hatchback", launchYear: 2008, priceMin: 704000, priceMax: 1121000, rangeKm: 600, buyNewUrl: "https://www.hyundai.com/in/en/find-a-car/i20/", buyUsedUrl: "https://www.spinny.com/used-hyundai-i20-cars/", popular: true },

  { brand: "Mahindra", model: "Thar", category: "4W", fuelType: "Diesel", type: "Offroad SUV", launchYear: 2010, priceMin: 1135000, priceMax: 1760000, rangeKm: 550, buyNewUrl: "https://auto.mahindra.com/suv/thar", buyUsedUrl: "https://www.spinny.com/used-mahindra-thar-cars/", popular: true },
  { brand: "Mahindra", model: "Scorpio-N", category: "4W", fuelType: "Diesel", type: "SUV", launchYear: 2022, priceMin: 1385000, priceMax: 2454000, rangeKm: 650, buyNewUrl: "https://auto.mahindra.com/suv/scorpio-n", buyUsedUrl: "https://www.spinny.com/used-mahindra-scorpio-cars/", popular: true },
  { brand: "Mahindra", model: "XUV700", category: "4W", fuelType: "Petrol", type: "SUV", launchYear: 2021, priceMin: 1399000, priceMax: 2699000, rangeKm: 600, buyNewUrl: "https://auto.mahindra.com/suv/xuv700", buyUsedUrl: "https://www.spinny.com/used-mahindra-xuv700-cars/", popular: true },

  { brand: "Kia", model: "Seltos", category: "4W", fuelType: "Petrol", type: "SUV", launchYear: 2019, priceMin: 1090000, priceMax: 2035000, rangeKm: 620, buyNewUrl: "https://www.kia.com/in/our-vehicles/seltos.html", buyUsedUrl: "https://www.spinny.com/used-kia-seltos-cars/", popular: true },
  { brand: "Kia", model: "Sonet", category: "4W", fuelType: "Petrol", type: "Compact SUV", launchYear: 2020, priceMin: 799000, priceMax: 1575000, rangeKm: 600, buyNewUrl: "https://www.kia.com/in/our-vehicles/sonet.html", buyUsedUrl: "https://www.spinny.com/used-kia-sonet-cars/", popular: true },

  { brand: "Honda", model: "City", category: "4W", fuelType: "Petrol", type: "Sedan", launchYear: 1998, priceMin: 1208000, priceMax: 1635000, rangeKm: 650, buyNewUrl: "https://www.hondacarindia.com/honda-city", buyUsedUrl: "https://www.spinny.com/used-honda-city-cars/", popular: true },
  { brand: "Toyota", model: "Innova Hycross", category: "4W", fuelType: "Hybrid", type: "MPV", launchYear: 2022, priceMin: 1977000, priceMax: 3098000, rangeKm: 900, buyNewUrl: "https://www.toyotabharat.com/news-events/innova-hycross.html", buyUsedUrl: "https://www.spinny.com/used-toyota-innova-cars/", popular: true },

  // ICE 2-WHEELERS
  { brand: "Hero", model: "Splendor Plus", category: "2W", fuelType: "Petrol", type: "Commuter Bike", launchYear: 1994, priceMin: 75441, priceMax: 78286, rangeKm: 450, buyNewUrl: "https://www.heromotocorp.com/en-in/motorcycles/splendor-plus.html", buyUsedUrl: "https://www.carwale.com/used/hero-cars/", popular: true },
  { brand: "Honda", model: "Activa 6G", category: "2W", fuelType: "Petrol", type: "Scooter", launchYear: 2001, priceMin: 76234, priceMax: 82234, rangeKm: 280, buyNewUrl: "https://www.honda2wheelersindia.com/activa6g", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "TVS", model: "Jupiter 125", category: "2W", fuelType: "Petrol", type: "Scooter", launchYear: 2013, priceMin: 86405, priceMax: 96855, rangeKm: 270, buyNewUrl: "https://www.tvsmotor.com/tvs-jupiter-125", buyUsedUrl: "https://www.carwale.com/used/", popular: true },
  { brand: "Royal Enfield", model: "Classic 350", category: "2W", fuelType: "Petrol", type: "Cruiser Bike", launchYear: 2009, priceMin: 193080, priceMax: 224755, rangeKm: 400, buyNewUrl: "https://www.royalenfield.com/in/en/motorcycles/classic-350/", buyUsedUrl: "https://www.carwale.com/used/", popular: true }
]
