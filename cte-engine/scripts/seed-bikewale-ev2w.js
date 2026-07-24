/**
 * Seed real Indian EV two-wheeler market data into the shared `products` table.
 *
 * Source: BikeWale's electric-bikes listing (server-rendered aggregator page —
 * the reliable kind of source, vs. manufacturer JS SPAs). Only FACTUAL data
 * points are stored (model, specs, ex-showroom price) — no copied prose. This
 * is the pre-launch data-library seed; the scheduled crawler will refresh it.
 *
 * Rule-based scoring only (no AI key). Idempotent: upserts on url.
 *
 * Usage:  node scripts/seed-bikewale-ev2w.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_KEY required in .env');
  process.exit(1);
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// [name, brand, top_speed_kmh, range_km, weight_kg, battery_kwh, price, rating]
const ROWS = [
  ['TVS iQube', 'TVS', 82, 212, 129.7, 5.3, 113753, 3.7],
  ['Bajaj Chetak', 'Bajaj', 80, 153, null, 3.5, 119038, 3.7],
  ['Ather Rizta', 'Ather', 80, 160, 119, 3.5, 131603, 4.4],
  ['VIDA VX2', 'VIDA', 90, 187, null, 4.4, 99490, 4.4],
  ['TVS Orbiter', 'TVS', 68, 158, 112, 3.1, 98191, 4.4],
  ['Honda Activa e', 'Honda', 80, 102, 119, 3, 120130, 4.5],
  ['OLA S1 X', 'OLA', 125, 320, 113, 5.2, 89957, 4.0],
  ['Ather 450X', 'Ather', 90, 161, 111.6, 3.5, 162926, 3.9],
  ['River Indie', 'River', 90, 161, 143, 4, 155081, 4.4],
  ['OLA S1 Pro', 'OLA', 141, 320, 118, 5.2, 129863, 3.1],
  ['Bajaj Chetak C25', 'Bajaj', 55, 113, 108, 2.5, 104599, 4.5],
  ['OLA Roadster', 'OLA', 126, 248, null, 6, 104999, 4.6],
  ['Ather 450S', 'Ather', 90, 161, 111.6, 3.5, 144926, 4.6],
  ['Suzuki E Access', 'Suzuki', 71, 95, 122, 3.07, 190762, 3.9],
  ['OLA Roadster Pro', 'OLA', 194, 579, null, 16, 199999, 4.8],
  ['Ultraviolette X47 Crossover', 'Ultraviolette', 145, 323, 208, 10.3, 249000, 4.2],
  ['Ultraviolette Tesseract', 'Ultraviolette', 125, 162, null, 3.5, 145000, 4.8],
  ['Ather 450 Apex', 'Ather', 100, 165, 111.6, 3.5, 196281, 4.6],
  ['Ampere Reo', 'Ampere', 25, 80, 74, 1.44, 71999, 4.3],
  ['OLA Roadster X Plus', 'OLA', 125, 501, 148.3, 9.1, 134480, 4.2],
  ['Oben Rorr', 'Oben', 100, 187, 147, 4.4, 149999, 3.8],
  ['Ampere Magnus Neo', 'Ampere', 65, 125, 104, 2.3, 90999, 3.4],
  ['OLA Roadster X', 'OLA', 118, 252, 127, 4.5, 104480, 4.4],
  ['Honda QC1', 'Honda', 50, 80, 89.5, 1.5, 90707, 4.4],
  ['VIDA V2', 'VIDA', 90, 165, 125, 3.94, 139062, 4.3],
  ['Oben Rorr EZ Sigma', 'Oben', 95, 175, 148, 4.4, 110004, 4.7],
  ['Royal Enfield Flying Flea C6', 'Royal Enfield', 115, 154, 124, 3.91, 279000, 3.4],
  ['Ampere Nexus', 'Ampere', 93, 136, 126.4, 3, 129999, 4.3],
  ['Ampere Magnus G Max', 'Ampere', 65, 142, 108, 3, 102999, 3.3],
  ['Yamaha Aerox E', 'Yamaha', 95.5, 117, 139, 3, 281602, null],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Rule-based transparency score from the specs we actually have.
function score(range_km, price, speed) {
  let s = 50;
  if (range_km >= 180) s += 25; else if (range_km >= 120) s += 18; else if (range_km >= 90) s += 10; else s += 3;
  if (price < 100000) s += 15; else if (price <= 140000) s += 10; else if (price <= 180000) s += 5;
  if (speed >= 100) s += 10; else if (speed >= 80) s += 6; else s += 2;
  const overall = Math.min(Math.max(Math.round(s), 10), 100);
  return { overall, quality: Math.min(overall + 5, 100), value: Math.max(overall - 3, 30), satisfaction: Math.min(overall - 2, 95) };
}

async function run() {
  const now = new Date();
  const records = ROWS.map(([name, brand, speed, range_km, weight_kg, battery_kwh, price, rating]) => {
    const sc = score(range_km, price, speed);
    return {
      category: 'ev_two_wheeler',
      name,
      brand,
      // Source attribution = the real BikeWale electric-bikes listing (unique per model via fragment).
      url: `https://www.bikewale.com/electric-bikes/#${slug(name)}`,
      source: 'bikewale',
      current_price: price,
      specs: { price, range_km, top_speed_kmh: speed, battery_kwh, weight_kg, user_rating: rating },
      overall_score: sc.overall,
      quality_score: sc.quality,
      value_score: sc.value,
      satisfaction_score: sc.satisfaction,
      crawled_at: now,
    };
  });

  const { error } = await sb.from('products').upsert(records, { onConflict: 'url' });
  if (error) { console.error('❌ upsert failed:', error.message); process.exit(1); }

  console.log(`✅ Seeded ${records.length} real EV two-wheelers into products.`);
  const { count } = await sb.from('products').select('*', { count: 'exact', head: true });
  console.log(`   products table now has ${count} rows.`);
}

run();
