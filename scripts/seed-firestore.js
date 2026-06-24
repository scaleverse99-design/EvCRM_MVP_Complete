// scripts/seed-firestore.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Mock data from lib/data.js (Hand-copied here since the script is common JS)
const vehicles = [
  { id: "v1", brand: "Tata",  model: "Nexon EV Max",   type: "4W SUV",  range: 465, chargeTime: 60,  topSpeed: 150, exShowroom: 1980000, fame2: 150000, stateSubsidy: 125000, colors: ["Intensi-Teal","Flame Red","Daytona Grey","Pure Silver"], rating: 4.7, reviews: 284, available: true,  deliveryWeeks: 3 },
  { id: "v2", brand: "Ather", model: "450X Gen 3",     type: "Scooter", range: 150, chargeTime: 75,  topSpeed: 90,  exShowroom: 155000,  fame2: 0,      stateSubsidy: 10000,  colors: ["Space Grey","White"],                                   rating: 4.6, reviews: 412, available: true,  deliveryWeeks: 2 },
  { id: "v3", brand: "Ola",   model: "S1 Pro Gen 2",   type: "Scooter", range: 195, chargeTime: 90,  topSpeed: 116, exShowroom: 149999,  fame2: 0,      stateSubsidy: 10000,  colors: ["Neo Mint","White","Midnight Blue","Jet Black"],          rating: 4.3, reviews: 893, available: true,  deliveryWeeks: 4 },
  { id: "v4", brand: "Okaya", model: "Faast F4",       type: "Scooter", range: 120, chargeTime: 240, topSpeed: 75,  exShowroom: 105000,  fame2: 0,      stateSubsidy: 0,      colors: ["White","Black","Red"],                                   rating: 4.1, reviews: 67,  available: false, deliveryWeeks: 0 },
  { id: "v5", brand: "TVS",   model: "iQube ST",       type: "Scooter", range: 100, chargeTime: 350, topSpeed: 82,  exShowroom: 135000,  fame2: 0,      stateSubsidy: 0,      colors: ["Sunlit Ivory","Starlight Blue"],                         rating: 4.4, reviews: 156, available: true,  deliveryWeeks: 2 },
  { id: "v6", brand: "Bajaj", model: "Chetak Premium", type: "Scooter", range: 108, chargeTime: 300, topSpeed: 63,  exShowroom: 135000,  fame2: 0,      stateSubsidy: 10000,  colors: ["Hazel Brown","Fireside Black","Cyber White"],            rating: 4.5, reviews: 203, available: true,  deliveryWeeks: 1 },
];

const dealer = {
  id: "dealer1",
  code: "dealer1",
  name: "Sharma EV Motors",
  email: "sharma.ev@example.com",
  phone: "+91-9876543210",
  city: "Bangalore",
  description: "Leader in premium EV sales in Bangalore.",
  createdAt: new Date().toISOString()
};

async function seed() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey || projectId.includes('xxxxx')) {
    console.error("❌ Firebase credentials missing or still have placeholders in .env.local.");
    console.log("Please update .env.local with real credentials before running this script.");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  const db = admin.firestore();

  console.log("🚀 Seeding dealers...");
  await db.collection('evcrm_dealers').doc(dealer.id).set(dealer);
  console.log("✅ Dealer seeded.");

  console.log("🚀 Seeding vehicles...");
  const batch = db.batch();
  vehicles.forEach((v) => {
    const ref = db.collection('evcrm_vehicles').doc(v.id);
    batch.set(ref, { ...v, dealerId: dealer.id, dealerName: dealer.name });
  });
  await batch.commit();
  console.log("✅ Vehicles seeded.");

  console.log("\n✨ Database seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
