/**
 * seed-auto-targets.js
 * Seeds 50+ Indian automobile sites into the crawler_targets table.
 * Run once: node scripts/seed-auto-targets.js
 *
 * Covers:
 *  - EV 2-wheeler OEMs (17 brands)
 *  - EV 4-wheeler OEMs (10 brands)
 *  - Auto news/review portals (18 sites)
 *  - Used car platforms (5 sites)
 *  - Financial (5 sites)
 *  - Government data (2 portals)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Standard selectors for product listing pages
const EV2W_SEL = JSON.stringify({
  products: '.product-card, .scooter-model, [data-model], .vehicle-card, article',
  name: '.model-name, h1, h2, h3',
  price: '.price-tag, [data-price], .ex-showroom-price, .starting-price',
  specs: '.range-km, .battery-capacity, .top-speed, .charge-time, [data-specs]'
});

const EV4W_SEL = JSON.stringify({
  products: '.car-model, .vehicle-card, [data-variant], article',
  name: '.car-name, h1, h2, h3',
  price: '.ex-showroom-price, .price-tag, [data-price]',
  specs: '.range, .battery, .acceleration, .charging, [data-specs]'
});

const NEWS_SEL = JSON.stringify({
  products: 'article, .article-card, .post-card, .story-card, .news-item',
  name: 'h2, h3, .headline, .article-title',
  price: '.price-mention, .ex-showroom',
  specs: '.article-excerpt, .summary, p'
});

const USED_CAR_SEL = JSON.stringify({
  products: '.car-listing, .car-card, [data-car], .vehicle-card',
  name: '.car-name, .car-title, h2',
  price: '.car-price, .asking-price, [data-price]',
  specs: '.mileage, .year, .fuel-type, .transmission, [data-specs]'
});

const INSURANCE_SEL = JSON.stringify({
  products: '.insurance-plan, .plan-card, .policy-card',
  name: '.plan-name, h2, h3',
  price: '.premium-price, .annual-price, [data-premium]',
  specs: '.coverage-type, .idv, .claim-settlement, [data-specs]'
});

const LOAN_SEL = JSON.stringify({
  products: '.loan-offer, .bank-offer, .emi-card',
  name: '.bank-name, .lender-name, h2',
  price: '.interest-rate, .roi, [data-rate]',
  specs: '.tenure, .processing-fee, .emi-amount, [data-specs]'
});

const TARGETS = [
  // ── EV 2-Wheeler OEMs ────────────────────────────────────────────────
  { name: 'ather-energy',       url: 'https://www.atherenergy.com/bikes',           category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'ola-electric',       url: 'https://www.olaelectric.com/scooters',        category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'tvs-iqube',          url: 'https://www.tvsmotor.com/electric/tvs-iqube', category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'bajaj-chetak',       url: 'https://www.chetak.com/electric-scooter',     category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'hero-electric',      url: 'https://www.heroelectric.in/bikes',           category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'revolt-motors',      url: 'https://www.revoltmotors.com/bikes',          category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'ampere-ev',          url: 'https://ampere.greaves.in/electric-scooters', category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'okinawa-ev',         url: 'https://www.okinawa.in/product-list',         category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'pure-ev',            url: 'https://www.pure-ev.com/bikes',               category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'ivoomi-ev',          url: 'https://www.ivoomi.com/bikes',                category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'bgauss-ev',          url: 'https://www.bgauss.com/vehicles',             category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'simple-energy',      url: 'https://www.simpleenergy.in/bikes',           category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'ultraviolette-ev',   url: 'https://www.ultraviolette.co/bikes',          category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'tork-motors',        url: 'https://www.torkmotors.com/bikes',            category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'matter-ev',          url: 'https://www.matter.in/genz-bikes',            category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'river-ev',           url: 'https://www.rideriverev.com/bikes',           category: 'ev_two_wheeler', selectors_json: EV2W_SEL },
  { name: 'lectrix-ev',         url: 'https://www.lectrixev.com/e-scooters',        category: 'ev_two_wheeler', selectors_json: EV2W_SEL },

  // ── EV 4-Wheeler OEMs ────────────────────────────────────────────────
  { name: 'tata-ev',            url: 'https://www.tatamotors.com/cars/electric-cars/', category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'mahindra-electric',  url: 'https://ev.mahindra.com/electric-cars',           category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'mg-motor-ev',        url: 'https://www.mgmotor.co.in/electric-cars',         category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'hyundai-ev',         url: 'https://www.hyundaiindia.com/electric-cars',      category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'kia-ev',             url: 'https://www.kia.com/in/electric-cars',            category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'byd-india',          url: 'https://www.byd.com/en-in/ev',                    category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'volvo-ev',           url: 'https://www.volvocars.com/en-in/electric',        category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'bmw-ev',             url: 'https://www.bmwindia.com/bmw-electric-vehicles',  category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'mercedes-ev',        url: 'https://www.mercedes-benz.co.in/eqmodels',        category: 'ev_four_wheeler', selectors_json: EV4W_SEL },
  { name: 'audi-ev',            url: 'https://www.audiindia.com/electric-vehicles',     category: 'ev_four_wheeler', selectors_json: EV4W_SEL },

  // ── Auto News & Review Portals ────────────────────────────────────────
  { name: 'autocar-india',      url: 'https://www.autocarindia.com/electric-vehicles',  category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'overdrive-india',    url: 'https://www.overdrive.in/electric-vehicles',      category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'motorbeam',          url: 'https://www.motorbeam.com/electric-vehicles',     category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'team-bhp',           url: 'https://www.team-bhp.com/news/electric-cars',     category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'carandbike-ndtv',    url: 'https://carandbike.com/ev',                       category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'cardekho-ev',        url: 'https://www.cardekho.com/electric-cars',          category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'carwale-ev',         url: 'https://www.carwale.com/electric-cars',           category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'bikewale-ev',        url: 'https://www.bikewale.com/electric-bikes',         category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'zigwheels-ev',       url: 'https://www.zigwheels.com/electric-scooters',     category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'drivespark-ev',      url: 'https://www.drivespark.com/electric-vehicles',    category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'motoroids-ev',       url: 'https://www.motoroids.com/category/electric',     category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'v3cars-ev',          url: 'https://www.v3cars.com/electric-cars',            category: 'auto_news', selectors_json: NEWS_SEL },
  { name: '91wheels-ev',        url: 'https://www.91wheels.com/electric',               category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'autoportal-ev',      url: 'https://www.autoportal.com/electric-cars',        category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'bikedekho-ev',       url: 'https://www.bikedekho.com/electric-bikes',        category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'gaadi-ev',           url: 'https://www.gaadi.com/electric-cars',             category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'cartrade-ev',        url: 'https://www.cartrade.com/electric-cars',          category: 'auto_news', selectors_json: NEWS_SEL },
  { name: 'rushlane-ev',        url: 'https://www.rushlane.com/tag/electric-vehicles',  category: 'auto_news', selectors_json: NEWS_SEL },

  // ── Used Car Platforms ────────────────────────────────────────────────
  { name: 'cars24-used',        url: 'https://www.cars24.com/buy-used-electric-cars',   category: 'used_car', selectors_json: USED_CAR_SEL },
  { name: 'spinny-used',        url: 'https://www.spinny.com/used-electric-cars',       category: 'used_car', selectors_json: USED_CAR_SEL },
  { name: 'olx-autos',          url: 'https://www.olx.in/items/q-electric-car',         category: 'used_car', selectors_json: USED_CAR_SEL },
  { name: 'droom-ev',           url: 'https://droom.in/cars/electric',                  category: 'used_car', selectors_json: USED_CAR_SEL },
  { name: 'carsome-india',      url: 'https://www.carsome.in/electric-cars',            category: 'used_car', selectors_json: USED_CAR_SEL },

  // ── Financial: Insurance & Loans ─────────────────────────────────────
  { name: 'policybazaar-ev',    url: 'https://www.policybazaar.com/motor-insurance/electric-car-insurance', category: 'auto_insurance', selectors_json: INSURANCE_SEL },
  { name: 'acko-ev',            url: 'https://www.acko.com/car-insurance/electric-car-insurance',           category: 'auto_insurance', selectors_json: INSURANCE_SEL },
  { name: 'coverfox-ev',        url: 'https://www.coverfox.com/car-insurance/electric-car-insurance',       category: 'auto_insurance', selectors_json: INSURANCE_SEL },
  { name: 'bankbazaar-ev-loan', url: 'https://www.bankbazaar.com/car-loan/electric-car-loan.html',          category: 'auto_loan', selectors_json: LOAN_SEL },
  { name: 'paisabazaar-ev',     url: 'https://www.paisabazaar.com/car-loan/electric-car-loan',              category: 'auto_loan', selectors_json: LOAN_SEL },
];

async function seed() {
  console.log(`\n🌱 Seeding ${TARGETS.length} automobile crawler targets into Supabase...\n`);
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of TARGETS) {
    const record = {
      name: target.name,
      url: target.url,
      category: target.category,
      selectors_json: JSON.parse(target.selectors_json),
      active: true
    };

    const { error } = await supabase
      .from('crawler_targets')
      .upsert([record], { onConflict: 'name' });

    if (error) {
      console.error(`  ❌ Failed: ${target.name} — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ ${target.category.padEnd(18)} ${target.name}`);
      inserted++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Seeded:   ${inserted} targets`);
  console.log(`⏭️  Skipped:  ${skipped} (already exist)`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Total active targets in DB: ${inserted + skipped}`);
}

seed().catch(console.error);
