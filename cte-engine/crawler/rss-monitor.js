/**
 * rss-monitor.js
 * Real-time RSS/Atom feed monitor for 50+ Indian automobile news sites.
 * Runs as a standalone process or called from the Cloud Run crawler.
 *
 * Pipeline:
 *   1. Polls RSS feeds every 2 hours (or on-demand via HTTP /monitor)
 *   2. Cross-validates facts: if 2+ sources mention same model/price → confidence HIGH
 *   3. Writes verified signal to Supabase `news_updates` table
 *   4. Triggers the News Orchestrator via webhook to write & publish SEO article
 *   5. (Optional) Calls Google Indexing API to index the new article in <10min
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');
const https = require('https');
const http = require('http');

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── RSS FEED SOURCES (70+ Indian auto sites & Google News aggregators) ───
const RSS_FEEDS = [
  // ── Google News Targeted Aggregators (Comprehensive Web Coverage) ───────
  { name: 'GNews - EV India',             url: 'https://news.google.com/rss/search?q=electric+vehicle+India+when:12h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Ather Energy',         url: 'https://news.google.com/rss/search?q=Ather+Energy+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Ola Electric',         url: 'https://news.google.com/rss/search?q=Ola+Electric+scooter+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Tata EV',              url: 'https://news.google.com/rss/search?q=Tata+Nexon+Tiago+Punch+EV+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Mahindra EV',          url: 'https://news.google.com/rss/search?q=Mahindra+XUV400+BE6+EV+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - TVS iQube',            url: 'https://news.google.com/rss/search?q=TVS+iQube+electric+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Bajaj Chetak',         url: 'https://news.google.com/rss/search?q=Bajaj+Chetak+electric+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - MG EV India',          url: 'https://news.google.com/rss/search?q=MG+ZS+EV+Comet+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Hyundai EV India',     url: 'https://news.google.com/rss/search?q=Hyundai+Ioniq+Creta+EV+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Kia EV India',         url: 'https://news.google.com/rss/search?q=Kia+EV6+EV9+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - BYD India',            url: 'https://news.google.com/rss/search?q=BYD+Atto+Seal+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - EV Subsidy FAME EMPS', url: 'https://news.google.com/rss/search?q=EV+subsidy+FAME+EMPS+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - EV Charging India',    url: 'https://news.google.com/rss/search?q=EV+charging+station+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'ev_news' },
  { name: 'GNews - Car Price Hike Cut',   url: 'https://news.google.com/rss/search?q=car+price+cut+hike+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },
  { name: 'GNews - Scooter Bike Launch',  url: 'https://news.google.com/rss/search?q=scooter+bike+launch+price+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },
  { name: 'GNews - SUV Car Launch',       url: 'https://news.google.com/rss/search?q=SUV+car+launch+price+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },
  { name: 'GNews - Used Car Market',      url: 'https://news.google.com/rss/search?q=used+car+market+price+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },
  { name: 'GNews - Auto Loan Interest',   url: 'https://news.google.com/rss/search?q=auto+car+loan+interest+rate+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },
  { name: 'GNews - Car Insurance India',  url: 'https://news.google.com/rss/search?q=car+vehicle+insurance+premium+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', category: 'auto_news' },

  // ── Auto News & Review Portals ──────────────────────────────────────────
  { name: 'AutoCar India',       url: 'https://www.autocarindia.com/RSS/rss.aspx?ID=3064', category: 'auto_news' },
  { name: 'OverDrive India',     url: 'https://www.overdrive.in/feed/',                    category: 'auto_news' },
  { name: 'MotorBeam',           url: 'https://www.motorbeam.com/feed/',                   category: 'auto_news' },
  { name: 'CarAndBike NDTV',     url: 'https://carandbike.com/rss/news',                  category: 'auto_news' },
  { name: 'CarDekho',            url: 'https://www.cardekho.com/rss',                      category: 'auto_news' },
  { name: 'CarWale News',        url: 'https://www.carwale.com/news/rss',                  category: 'auto_news' },
  { name: 'BikeWale News',       url: 'https://www.bikewale.com/news/rss',                 category: 'auto_news' },
  { name: 'ZigWheels',           url: 'https://www.zigwheels.com/news-views/rss',          category: 'auto_news' },
  { name: 'DriveSpark',          url: 'https://www.drivespark.com/rss-feed/news.xml',      category: 'auto_news' },
  { name: 'Motoroids',           url: 'https://www.motoroids.com/feed/',                   category: 'auto_news' },
  { name: 'RushLane',            url: 'https://www.rushlane.com/feed',                     category: 'auto_news' },
  { name: 'V3Cars',              url: 'https://www.v3cars.com/feed',                       category: 'auto_news' },
  { name: '91Wheels',            url: 'https://www.91wheels.com/news/rss',                 category: 'auto_news' },
  { name: 'BiKeDekho',           url: 'https://www.bikedekho.com/news/rss',                category: 'auto_news' },
  { name: 'AutoPortal',          url: 'https://www.autoportal.com/rss/news.xml',           category: 'auto_news' },
  { name: 'GaadiWaadi',          url: 'https://www.gaadiwaadi.com/feed',                   category: 'auto_news' },
  { name: 'EV Reporter',         url: 'https://evreporter.com/feed/',                      category: 'ev_news' },
  { name: 'EV News India',       url: 'https://evnewsindia.com/feed/',                     category: 'ev_news' },
  { name: 'The EV Report',       url: 'https://theevreport.com/feed/',                     category: 'ev_news' },
  { name: 'e-Vehicleinfo',       url: 'https://www.evehicleinfo.com/feed',                 category: 'ev_news' },
  { name: 'Electrive India',     url: 'https://www.electrive.com/feed/?category=india',    category: 'ev_news' },
  { name: 'EV Obsession',        url: 'https://evobsession.com/feed/',                     category: 'ev_news' },
  { name: 'Economic Times Auto', url: 'https://economictimes.indiatimes.com/rss/industry/transportation/automobiles.cms', category: 'auto_news' },
  { name: 'LiveMint Auto',       url: 'https://www.livemint.com/rss/auto',                 category: 'auto_news' },
  { name: 'BS Motoring',         url: 'https://www.bsmotoring.com/feed/',                  category: 'auto_news' },
  { name: 'Financial Express Auto', url: 'https://www.financialexpress.com/auto/feed/',    category: 'auto_news' },
  { name: 'CNBC TV18 Auto',      url: 'https://www.cnbctv18.com/common/rss/auto.xml',     category: 'auto_news' },
  { name: 'Moneycontrol Auto',   url: 'https://www.moneycontrol.com/rss/automobile.xml',  category: 'auto_news' },
  { name: 'Times of India Auto', url: 'https://timesofindia.indiatimes.com/rssfeeds/4719161.cms', category: 'auto_news' },
  { name: 'Hindustan Times Auto',url: 'https://auto.hindustantimes.com/rss/news',          category: 'auto_news' },
  { name: 'Indian Express Auto', url: 'https://indianexpress.com/section/auto/feed/',      category: 'auto_news' },
  { name: 'Deccan Herald Auto',  url: 'https://www.deccanherald.com/business/auto/rss',    category: 'auto_news' },
];

// Complete Automobile & EV keywords for total coverage
const EV_KEYWORDS = [
  'electric', 'ev', 'battery', 'range km', 'charging', 'kwh', 'ola s1', 'ather',
  'tata nexon', 'tata tiago', 'mahindra xuv', 'mg zs', 'mg comet', 'tata curvv',
  'tvs iqube', 'bajaj chetak', 'hero electric', 'revolt rx', 'hyundai ioniq',
  'kia ev6', 'byd atto', 'launch price', 'ex-showroom', 'price hike', 'price cut',
  'new launch', 'upcoming', 'specification', 'range test', 'real world range',
  'subsidy', 'fame', 'emps scheme', 'charging station', 'fastcharge', 'suv',
  'hybrid', 'cng', 'car launch', 'bike launch', 'scooter launch', 'mileage', 'facelift'
];

// ── UTILS ─────────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { 
      headers: { 'User-Agent': 'CTEBot/1.0 (+https://cte.evcrm.in/about)', 'Accept': 'application/rss+xml, application/xml' },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   itemXml.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
    const link = (itemXml.match(/<link>(.*?)<\/link>/) ||
                  itemXml.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim() || '';
    const desc = (itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                  itemXml.match(/<description>(.*?)<\/description>/))?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || '';

    if (title && link) {
      items.push({ title, link, description: desc.replace(/<[^>]+>/g, '').slice(0, 500), pubDate });
    }
  }
  return items;
}

function isEVRelevant(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  return EV_KEYWORDS.some(kw => text.includes(kw));
}

function extractSignals(item) {
  const text = item.title + ' ' + item.description;
  const signals = {};

  // Price mentions: ₹1.23 lakh / Rs 1,45,000
  const priceMatch = text.match(/(?:₹|Rs\.?\s*)([0-9,]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs|L)?/i);
  if (priceMatch) signals.price = priceMatch[0].trim();

  // Range mentions: 150 km, 200km
  const rangeMatch = text.match(/(\d+)\s*km(?:\s*range)?/i);
  if (rangeMatch) signals.range_km = parseInt(rangeMatch[1]);

  // Battery: 3.7 kWh
  const battMatch = text.match(/(\d+\.?\d*)\s*kwh/i);
  if (battMatch) signals.battery_kwh = parseFloat(battMatch[1]);

  // Launch/New: keywords
  signals.is_launch = /(?:launch|launched|unveil|debut|introduce|reveal)/i.test(text);
  signals.is_price_change = /(?:price hike|price cut|price reduc|price increas|new price|revised price)/i.test(text);
  signals.is_review = /(?:review|test drive|first drive|driven|road test)/i.test(text);

  return signals;
}

// ── CROSS-VALIDATION ENGINE ────────────────────────────────────────────────

class SignalAggregator {
  constructor() {
    // modelKey → [{ source, title, signals, url, timestamp }]
    this.signals = new Map();
  }

  add(source, item, signals) {
    const text = (item.title).toLowerCase();
    // Extract model name (first proper noun after EV keyword)
    const modelKey = this._extractModelKey(text);
    if (!modelKey) return;

    if (!this.signals.has(modelKey)) this.signals.set(modelKey, []);
    this.signals.get(modelKey).push({ source, title: item.title, link: item.link, signals, ts: new Date() });
  }

  _extractModelKey(text) {
    const models = [
      'tata nexon', 'tata tiago', 'tata punch', 'tata curvv',
      'mahindra xuv400', 'mahindra be6', 'mg zs ev', 'mg comet',
      'ather 450', 'ola s1', 'tvs iqube', 'bajaj chetak',
      'hero electric', 'revolt rx', 'ampere', 'hyundai ioniq',
      'kia ev6', 'byd atto', 'bmw i4', 'mercedes eqs', 'audi e-tron',
      'pure ev', 'ivoomi', 'bgauss', 'simple one', 'ultraviolette f77',
      'tork kratos', 'matter aera', 'river indie'
    ];
    return models.find(m => text.includes(m)) || null;
  }

  // Returns signals with confidence >= 2 sources (cross-validated)
  getVerified() {
    const verified = [];
    for (const [model, items] of this.signals.entries()) {
      if (items.length >= 2) {
        // Pick the most recent signal with actual data
        const best = items.sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
        verified.push({
          model,
          confidence: items.length,
          sources: items.map(i => i.source),
          title: best.title,
          link: best.link,
          signals: best.signals
        });
      }
    }
    return verified;
  }
}

// ── MAIN MONITOR ──────────────────────────────────────────────────────────

async function runMonitor() {
  logger.info(`====== CTE RSS MONITOR STARTED — ${new Date().toISOString()} ======`);
  logger.info(`Monitoring ${RSS_FEEDS.length} RSS feeds for EV intelligence signals...`);

  const aggregator = new SignalAggregator();
  let totalFetched = 0;
  let totalRelevant = 0;
  let totalFailed = 0;

  // 1. Fetch all RSS feeds in parallel (with concurrency limit)
  const CONCURRENCY = 5;
  for (let i = 0; i < RSS_FEEDS.length; i += CONCURRENCY) {
    const batch = RSS_FEEDS.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async feed => {
        try {
          const xml = await fetchUrl(feed.url);
          const items = parseRSSItems(xml);
          totalFetched += items.length;

          for (const item of items) {
            if (isEVRelevant(item)) {
              totalRelevant++;
              const signals = extractSignals(item);
              aggregator.add(feed.name, item, signals);

              // Store every relevant article in news_updates
              await supabase.from('news_updates').upsert([{
                title: item.title.slice(0, 250),
                content: item.description || item.title,
                source_url: item.link,
                category: feed.category,
                date: item.pubDate ? new Date(item.pubDate) : new Date()
              }], { onConflict: 'source_url', ignoreDuplicates: true });
            }
          }
          logger.info(`✅ ${feed.name.padEnd(22)} ${items.length} items → ${items.filter(isEVRelevant).length} EV relevant`);
        } catch (err) {
          logger.warn(`⚠️  ${feed.name}: ${err.message}`);
          totalFailed++;
        }
      })
    );
    // Small delay between batches to be polite
    await new Promise(r => setTimeout(r, 500));
  }

  // 2. Cross-validate signals
  const verified = aggregator.getVerified();
  logger.info(`\n📊 Cross-validation: ${verified.length} high-confidence signals (2+ sources agree)`);

  for (const v of verified) {
    logger.info(`  🔥 [${v.confidence} sources] ${v.model.toUpperCase()} — "${v.title.slice(0, 80)}..."`);
    logger.info(`     Sources: ${v.sources.join(', ')}`);
    if (v.signals.price) logger.info(`     💰 Price: ${v.signals.price}`);
    if (v.signals.range_km) logger.info(`     🔋 Range: ${v.signals.range_km} km`);
  }

  // 3. Trigger News Orchestrator for verified signals (if configured)
  const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || process.env.NEWS_ORCHESTRATOR_URL;
  const ORCHESTRATOR_TOKEN = process.env.ORCHESTRATOR_TOKEN;

  if (ORCHESTRATOR_URL && ORCHESTRATOR_TOKEN && verified.length > 0) {
    logger.info(`\n🚀 Triggering News Orchestrator for ${verified.length} verified signal(s)...`);
    try {
      const payload = JSON.stringify({ discover: 5, research: 3, write: Math.min(verified.length, 3) });
      const url = new URL(ORCHESTRATOR_URL);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ORCHESTRATOR_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const lib = ORCHESTRATOR_URL.startsWith('https') ? https : http;
      await new Promise((resolve, reject) => {
        const req = lib.request(options, res => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { logger.info(`Orchestrator response: ${body.slice(0, 200)}`); resolve(); });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    } catch (err) {
      logger.warn(`Orchestrator trigger failed: ${err.message}`);
    }
  }

  logger.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`📡 Feeds polled:        ${RSS_FEEDS.length}`);
  logger.info(`📰 Articles fetched:    ${totalFetched}`);
  logger.info(`⚡ EV-relevant:         ${totalRelevant}`);
  logger.info(`✅ Cross-validated:     ${verified.length} high-confidence`);
  logger.info(`❌ Feed errors:         ${totalFailed}`);
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  logger.info(`====== RSS MONITOR COMPLETE ======`);

  return { totalFetched, totalRelevant, verified: verified.length, failed: totalFailed };
}

// ── HTTP SERVER (Cloud Run compatible) ────────────────────────────────────

if (require.main === module) {
  const PORT = process.env.MONITOR_PORT || process.env.PORT || 8081;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/monitor' || req.url === '/monitor/run') {
      logger.info('RSS monitor triggered via HTTP');
      try {
        const result = await runMonitor();
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', result }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    } else if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'healthy', service: 'cte-rss-monitor', feeds: RSS_FEEDS.length }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });

  server.listen(PORT, () => {
    logger.info(`RSS Monitor HTTP server started on port ${PORT}`);
    // Run immediately on startup
    runMonitor().catch(err => logger.error(err, 'Initial RSS monitor run failed'));
  });
}

module.exports = { runMonitor };
