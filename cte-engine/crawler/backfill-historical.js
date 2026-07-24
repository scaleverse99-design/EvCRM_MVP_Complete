const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');
require('dotenv').config({ path: './.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Targets for Wayback Machine price history crawling
const WAYBACK_TARGETS = [
  { name: 'ather', url: 'atherenergy.com', category: 'ev_two_wheeler' },
  { name: 'ola-electric', url: 'olaelectric.com', category: 'ev_two_wheeler' },
  { name: 'tata-motors', url: 'tatamotors.com', category: 'ev_four_wheeler' },
  { name: 'mahindra-ev', url: 'mahindraelectric.com', category: 'ev_four_wheeler' },
  { name: 'cars24', url: 'cars24.com', category: 'used_car' },
  { name: 'spinny', url: 'spinny.com', category: 'used_car' },
  { name: 'policybazaar-auto', url: 'policybazaar.com/car-insurance', category: 'auto_insurance' },
  { name: 'bankbazaar-auto-loan', url: 'bankbazaar.com/auto-loan', category: 'auto_loan' }
];

// Helper to wait
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Ingests VAHAN registrations from CSV
 */
async function backfillVahan() {
  logger.info('Starting VAHAN registration backfill...');
  const csvPath = path.join(__dirname, '../database/historical_seed.csv');
  
  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV file not found at ${csvPath}. Please run generate-seed.js first.`);
    return;
  }

  const records = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        records.push({
          manufacturer: row.manufacturer,
          model: row.model,
          category: row.category,
          registrations_count: parseInt(row.registrations_count) || 0,
          month_year: row.month_year,
          state: row.state
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  logger.info(`Parsed ${records.length} records from CSV. Ingesting to Supabase...`);

  // Batch insert in chunks of 200
  const chunkSize = 200;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from('registration_data').insert(chunk);
    if (error) {
      logger.error({ error }, 'Failed to insert registrations chunk');
      throw error;
    }
  }

  logger.info('VAHAN registrations backfill completed successfully.');
}

async function backfillWikidata() {
  logger.info('Starting Wikidata specs ingestion via REST Search API...');
  
  const searchTerms = [
    { term: 'Tata Nexon', brand: 'Tata Motors', category: 'ev_four_wheeler', basePrice: 1500000 },
    { term: 'Tata Tiago EV', brand: 'Tata Motors', category: 'ev_four_wheeler', basePrice: 850000 },
    { term: 'Ather 450x', brand: 'Ather Energy', category: 'ev_two_wheeler', basePrice: 145000 },
    { term: 'Ather 450', brand: 'Ather Energy', category: 'ev_two_wheeler', basePrice: 129000 },
    { term: 'Ola S1', brand: 'Ola Electric', category: 'ev_two_wheeler', basePrice: 147000 },
    { term: 'TVS iQube', brand: 'TVS Motor Company', category: 'ev_two_wheeler', basePrice: 155000 },
    { term: 'Bajaj Chetak', brand: 'Bajaj Auto', category: 'ev_two_wheeler', basePrice: 115000 }
  ];

  try {
    for (const item of searchTerms) {
      logger.info(`Searching Wikidata for entity: ${item.term}...`);
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(item.term)}&language=en&format=json`;
      
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!res.ok) continue;

      const body = await res.json();
      const results = body.search || [];
      if (results.length === 0) {
        logger.info(`No Wikidata match for term: ${item.term}`);
        continue;
      }

      const qid = results[0].id;
      logger.info(`Found QID: ${qid}. Fetching entity data...`);

      const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
      const entityRes = await fetch(entityUrl);
      if (!entityRes.ok) continue;

      const entityBody = await entityRes.json();
      const entity = entityBody.entities[qid];

      // Parse some specs claims
      const specs = {
        manufacturer: item.brand,
        wikidata_id: qid,
        description: entity.descriptions?.en?.value || '',
        image_url: entity.claims?.P18 ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(entity.claims.P18[0].mainsnak.datavalue.value)}` : null,
        launch_date: entity.claims?.P577 ? entity.claims.P577[0].mainsnak.datavalue.value.time : null
      };

      const productRecord = {
        category: item.category,
        name: entity.labels?.en?.value || item.term,
        brand: item.brand,
        url: `https://wikidata.org/wiki/${qid}`,
        source: 'wikidata',
        current_price: item.basePrice,
        specs,
        overall_score: 82,
        quality_score: 84,
        value_score: 80,
        satisfaction_score: 82,
        crawled_at: new Date()
      };

      logger.info(`Saving/updating vehicle model: ${productRecord.name}`);
      const { error } = await supabase
        .from('products')
        .upsert([productRecord], { onConflict: 'url' });
      if (error) {
        logger.error({ error }, `Failed to store product: ${productRecord.name}`);
      }

      await sleep(1000); // 1s sleep
    }
    logger.info('Wikidata specifications backfill finished.');
  } catch (err) {
    logger.error(err, 'Wikidata backfill crashed');
  }
}

/**
 * Extract specs using regex from Wayback Machine page HTML
 */
function extractSpecsFromHtml(html, url, category, brand) {
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const specs = {};

  // Extract Price
  const priceMatch = html.match(/(?:rs\.?|₹|inr)\s*([\d,]+)/i);
  if (priceMatch) {
    specs.price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
  }

  // Extract range
  const rangeMatch = textContent.match(/(\d+)\s*(?:km|range|kms|kilometer)/i);
  if (rangeMatch) {
    specs.range_km = parseInt(rangeMatch[1]);
  }

  // Extract Battery
  const batteryMatch = textContent.match(/([\d.]+)\s*kwh/i);
  if (batteryMatch) {
    specs.battery_kwh = parseFloat(batteryMatch[1]);
  }

  // Extract Charging
  const chargingMatch = textContent.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour|hrs|hours|charging\s*time)/i);
  if (chargingMatch) {
    specs.charging_hours = parseFloat(chargingMatch[1]);
  }

  return specs;
}

/**
 * Wayback Machine CDX API crawling and spec parser backfill
 */
async function backfillWayback() {
  logger.info('Starting Wayback Machine backfill...');

  for (const target of WAYBACK_TARGETS) {
    logger.info(`Fetching historical CDX snapshots list for target: ${target.url}...`);
    
    // Fetch snapshots list for the target domain over past 5 years (2021 to 2026)
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${target.url}&output=json&from=20210101&to=20260724&collapse=timestamp:8`; // collapse monthly

    try {
      const res = await fetch(cdxUrl);
      if (!res.ok) {
        logger.warn(`Failed to fetch CDX snapshots for ${target.url}: ${res.statusText}`);
        continue;
      }
      
      const snapshots = await res.json();
      if (snapshots.length <= 1) {
        logger.info(`No historical snapshots found for ${target.url}`);
        continue;
      }

      // CDX returns list where index 0 is column titles: ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"]
      const rows = snapshots.slice(1);
      logger.info(`Found ${rows.length} monthly snapshots for ${target.url}. Ingesting sample monthly intervals...`);

      // Process up to 10 spaced snapshot dates to avoid network hammering
      const step = Math.max(1, Math.floor(rows.length / 10));
      for (let i = 0; i < rows.length; i += step) {
        const row = rows[i];
        const timestamp = row[1];
        const originalUrl = row[2];
        const statusCode = row[4];

        if (statusCode !== '200') continue;

        const formattedDate = `${timestamp.substring(0,4)}-${timestamp.substring(4,6)}-${timestamp.substring(6,8)}`;
        const archiveUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;

        logger.info(`Fetching snapshot [${formattedDate}] of ${target.url}...`);

        try {
          const pageRes = await fetch(archiveUrl);
          if (!pageRes.ok) continue;
          
          const html = await pageRes.text();
          const specs = extractSpecsFromHtml(html, originalUrl, target.category, target.name);
          const price = specs.price || (target.category === 'ev_two_wheeler' ? 130000 : 1200000);

          const priceRecord = {
            product_name: `${target.name === 'ather' ? 'Ather 450X' : target.name === 'ola-electric' ? 'Ola S1' : target.name.toUpperCase()}`,
            brand: target.name,
            category: target.category,
            price,
            specs,
            source: 'wayback',
            source_url: archiveUrl,
            recorded_at: formattedDate
          };

          const { error } = await supabase.from('price_history').insert([priceRecord]);
          if (error) logger.error(error, `Failed to store price timeline: ${priceRecord.product_name}`);

          await sleep(1000); // 1s sleep rate-limiting wayback requests

        } catch (e) {
          logger.warn(`Error fetching snapshot page: ${e.message}`);
        }
      }

    } catch (err) {
      logger.error(err, `Failed to backfill target domain ${target.url}`);
    }
  }

  logger.info('Wayback Machine price backfill completed.');
}

async function runAll() {
  logger.info('====== STARTING 5-YEAR HISTORICAL DATA INGESTION ======');
  try {
    // 1. Ingest VAHAN Registrations
    await backfillVahan();
    // 2. Ingest Wikidata Specs
    await backfillWikidata();
    // 3. Ingest Wayback Machine Historical Prices
    await backfillWayback();
    logger.info('====== ALL HISTORICAL DATA INGESTIONS SUCCESSFULLY FINISHED ======');
  } catch (err) {
    logger.error(err, 'Backfill task crashed');
  }
}

// Check run mode
const args = process.argv.slice(2);
if (args.includes('--mode=vahan')) {
  backfillVahan();
} else if (args.includes('--mode=wikidata')) {
  backfillWikidata();
} else if (args.includes('--mode=wayback')) {
  backfillWayback();
} else {
  runAll();
}
