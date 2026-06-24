const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function seedPulse() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const db = admin.firestore();

  const news = [
    {
      id: "seed1",
      title: "Telangana Announces Massive EV Subsidy Extension for 2026",
      summary: "The Telangana government has officially extended its flagship EV policy, offering 100% road tax and registration fee waivers for all electric two-wheelers and four-wheelers purchased in Hyderabad and regional districts through 2026.",
      slug: "telangana-ev-subsidy-extension-2026",
      seo_title: "Telangana EV Subsidy 2026: 100% Tax Waiver",
      seo_description: "Save up to ₹1.5 Lakh on your next EV purchase in Telangana. Full road tax and registration waivers extended to 2026.",
      state: "Telangana",
      district: "Hyderabad",
      is_trending: true,
      publishedAt: new Date().toISOString(),
      tags: ["Subsidy", "Telangana", "Savings"],
      whatsapp_copy: "🔥 HUGE NEWS: Telangana extends 100% EV Tax Waiver to 2026! Save BIG on your next car/scooter. Check details on evcrm.in/news"
    },
    {
      id: "seed2",
      title: "Top 5 Electric Scooters Under ₹1 Lakh in Andhra Pradesh",
      summary: "With rising petrol prices, budget electric scooters are seeing a 40% surge in searches. Here are the top picks available in Visakhapatnam and Vijayawada that offer 100km+ range at an affordable price point.",
      slug: "top-ev-scooters-under-1lakh-ap",
      seo_title: "Best Budget EV Scooters in AP 2026",
      seo_description: "Top 5 affordable electric scooters in Andhra Pradesh under ₹1 Lakh. Range, battery, and pricing compared.",
      state: "Andhra Pradesh",
      district: "Visakhapatnam",
      is_trending: true,
      publishedAt: new Date().toISOString(),
      tags: ["Budget", "2W", "Guide"],
      whatsapp_copy: "🛵 Looking for a budget EV? Here are the top 5 scooters under 1 Lakh in AP! Perfect for daily city rides. See comparison on evcrm.in/news"
    }
  ];

  console.log("🚀 Seeding initial Pulse news...");
  for (const item of news) {
    await db.collection('pulse').doc(item.id).set(item);
    await db.collection('pulse_registry').doc(item.id).set({
      publishedAt: item.publishedAt,
      title: item.title,
      slug: item.slug
    });
  }
  
  console.log("✅ Initial Pulse data seeded!");
  process.exit(0);
}

seedPulse().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
