/**
 * Seed real Indian EV four-wheeler market data from CarWale's electric-cars
 * listing (server-rendered aggregator). Adds a NEW category + NEW source to the
 * library, proving the multi-source pipeline.
 *
 * The 4W listing gives model + ex-showroom price RANGE (specs like range/battery
 * live on each model page). So we store real name + price here and leave scores
 * NULL (specs_pending=true) — we do NOT fabricate a transparency score without
 * real specs. A later enrichment pass fills specs + scores per model page.
 *
 * Facts only, no copied prose. Idempotent: upserts on url.
 *
 * Usage:  node scripts/seed-carwale-ev4w.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_KEY required'); process.exit(1);
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const L = (lakh) => Math.round(lakh * 100000); // Lakh → rupees

// [name, brand, price_min_lakh, price_max_lakh]
const ROWS = [
  ['Kia Syros EV', 'Kia', 10.76, 20.00],
  ['Tata Punch EV', 'Tata', 8.09, 12.79],
  ['Tata Sierra EV', 'Tata', 18.79, 26.48],
  ['Mahindra BE 6', 'Mahindra', 18.90, 28.49],
  ['Tata Tiago EV', 'Tata', 5.84, 9.99],
  ['Mahindra XEV 9S', 'Mahindra', 20.65, 30.70],
  ['MG Windsor EV', 'MG', 12.36, 16.50],
  ['Tata Nexon EV', 'Tata', 12.49, 17.69],
  ['Mahindra XEV 9e', 'Mahindra', 21.90, 31.25],
  ['Maruti Suzuki e Vitara', 'Maruti Suzuki', 13.49, 17.46],
  ['Tata Harrier EV', 'Tata', 21.69, 30.43],
  ['Tata Curvv EV', 'Tata', 16.99, 19.49],
  ['MG Comet EV', 'MG', 6.41, 8.82],
  ['Mercedes-Benz CLA EV', 'Mercedes-Benz', 55.00, 64.00],
  ['Tesla Model Y', 'Tesla', 50.90, 61.99],
  ['Kia Carens Clavis EV', 'Kia', 18.00, 25.00],
  ['MG Cyberster', 'MG', 82.49, 82.49],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function run() {
  const now = new Date();
  const records = ROWS.map(([name, brand, lo, hi]) => ({
    category: 'ev_four_wheeler',
    name, brand,
    url: `https://www.carwale.com/electric-cars/#${slug(name)}`,
    source: 'carwale',
    current_price: L(lo),
    specs: { price_min: L(lo), price_max: L(hi), specs_pending: true },
    overall_score: null, quality_score: null, value_score: null, satisfaction_score: null,
    crawled_at: now,
  }));

  const { error } = await sb.from('products').upsert(records, { onConflict: 'url' });
  if (error) { console.error('❌', error.message); process.exit(1); }
  console.log(`✅ Seeded ${records.length} real EV four-wheelers (name + price; specs pending).`);

  const { data } = await sb.from('products').select('category');
  const by = {}; data.forEach(r => by[r.category] = (by[r.category] || 0) + 1);
  console.log(`   products by category: ${JSON.stringify(by)}  (total ${data.length})`);
}
run();
