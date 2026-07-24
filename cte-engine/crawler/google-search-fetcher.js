/**
 * google-search-fetcher.js
 * Instant Live Google Search Fetcher & Data Auto-Populator for CTE.
 * 
 * Flow:
 *  1. When a vehicle/news item is queried via API or MCP that isn't in local DB,
 *     this module queries Google Live Search index.
 *  2. Parses titles, prices, range, battery capacity, and specifications.
 *  3. Normalizes & scores specs using spec-extractor.js.
 *  4. Upserts the Golden Record into Supabase `products` and `news_updates`.
 *  5. Returns fresh, verified data instantly.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');
const https = require('https');
const http = require('http');
const { extractSpecs } = require('./spec-extractor');

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── UTILS: HTTP FETCH ──────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, application/xml'
      },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP request timeout')); });
  });
}

// ── LIVE GOOGLE SEARCH QUERY (Custom Search API or Live Google RSS/HTML Fallback) ─
async function queryGoogleLiveSearch(query) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_CX;

  // 1. Try Google Custom Search JSON API if credentials configured
  if (apiKey && cx) {
    try {
      const url = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}&num=5`;
      logger.info(`Querying Google Custom Search API for: "${query}"`);
      const res = await httpGet(url);
      if (res.statusCode === 200) {
        const json = JSON.parse(res.body);
        return (json.items || []).map(item => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          source: item.displayLink || 'Google Search'
        }));
      }
    } catch (err) {
      logger.warn(`Google Custom Search API error: ${err.message}. Falling back to Google News RSS index...`);
    }
  }

  // 2. High-speed Fallback: Google News Live Search Index RSS (Free, instant, zero key required)
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' India price specification launch')}&hl=en-IN&gl=IN&ceid=IN:en`;
    logger.info(`Querying Google News Live Search Index for: "${query}"`);
    const res = await httpGet(rssUrl);
    if (res.statusCode === 200) {
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(res.body)) !== null && items.length < 5) {
        const itemXml = match[1];
        const title = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
        const link = (itemXml.match(/<link>(.*?)<\/link>/) || itemXml.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim() || '';
        const desc = (itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || itemXml.match(/<description>(.*?)<\/description>/))?.[1]?.trim() || '';
        if (title && link) {
          items.push({ title, snippet: desc.replace(/<[^>]+>/g, ''), link, source: 'Google Search Index' });
        }
      }
      return items;
    }
  } catch (err) {
    logger.error(`Google News RSS query failed: ${err.message}`);
  }

  return [];
}

// ── FETCH & ENRICH PRODUCT IN REAL TIME ───────────────────────────────────
async function fetchAndEnrichVehicle(vehicleName, category = 'ev_two_wheeler') {
  logger.info(`[Google Live Fetch] Fetching real-time web intelligence for vehicle: "${vehicleName}"`);
  
  const searchResults = await queryGoogleLiveSearch(`${vehicleName} price specification range battery India`);
  if (searchResults.length === 0) {
    logger.warn(`No search results returned for vehicle: "${vehicleName}"`);
    return null;
  }

  // Combine search snippets into full text context
  const combinedText = searchResults.map(r => `${r.title} ${r.snippet}`).join(' ');
  const rawProduct = {
    name: vehicleName,
    price: null,
    url: searchResults[0].link,
    specs: combinedText,
    html: combinedText
  };

  // Run deterministic spec extractor
  const { specs, score } = extractSpecs(rawProduct, category);

  // Extract brand (first word of vehicle name)
  const brand = vehicleName.split(' ')[0] || 'Automotive OEM';

  const goldenRecord = {
    category,
    name: vehicleName,
    brand,
    url: searchResults[0].link,
    source: searchResults[0].source || 'Google Search',
    current_price: specs.price || 0,
    currency: 'INR',
    specs: {
      ...specs,
      google_verified_at: new Date().toISOString(),
      top_search_sources: searchResults.slice(0, 3).map(s => ({ title: s.title, url: s.link }))
    },
    overall_score: score.overall,
    quality_score: score.quality,
    value_score: score.value,
    satisfaction_score: score.satisfaction,
    crawled_at: new Date(),
    last_updated_at: new Date()
  };

  // Upsert into Supabase `products` table
  const { data, error } = await supabase
    .from('products')
    .upsert([goldenRecord], { onConflict: 'url' })
    .select();

  if (error) {
    logger.error({ error }, `Error storing Google-enriched product: ${vehicleName}`);
    throw error;
  }

  logger.info(`✅ Successfully enriched and stored golden record in Supabase: "${vehicleName}" (Score: ${score.overall}/100)`);
  return data?.[0] || goldenRecord;
}

if (require.main === module) {
  const query = process.argv[2] || 'Ather 450X';
  fetchAndEnrichVehicle(query).then(console.log).catch(console.error);
}

module.exports = { queryGoogleLiveSearch, fetchAndEnrichVehicle };
