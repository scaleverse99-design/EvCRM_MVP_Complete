/**
 * CTE News Tracker — RSS → JSON (100% free, no API, unlimited).
 *
 * Pulls Indian automobile publications' RSS feeds and normalizes them into a
 * unified JSON stream (title, link, published, source, summary). This feeds the
 * EvCRM news orchestrator (breaking launches / price hikes) — the "be first on
 * Google" pipeline — and can also populate a news table.
 *
 * No dependency needed (uses global fetch + a minimal parser). For production,
 * swap the parser for `rss-parser` if you want full spec coverage; the feed
 * list + normalization stay identical.
 *
 * Usage:  node news/rss-tracker.js            (prints unified JSON stream)
 */

// Add/remove sources here — each = one adapter row. WebSub push can be layered
// on later for feeds that support it (near-instant vs. polling).
const FEEDS = [
  { source: 'RushLane', url: 'https://www.rushlane.com/feed' },
  { source: 'ET Auto', url: 'https://auto.economictimes.indiatimes.com/rss/topstories' },
  { source: 'Autocar India', url: 'https://www.autocarindia.com/rss/all' },
  // Add more validated feeds here (OEM press rooms, more publications).
];

const strip = (s = '') =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&#8217;|&#8216;/g, "'")
   .replace(/&#8211;|&#8212;/g, '-').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#\d+;/g, '').trim();

function parseItems(xml, source) {
  const items = [];
  for (const block of xml.match(/<item[\s\S]*?<\/item>/g) || []) {
    const pick = (tag) => (block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)) || [])[1];
    const title = strip(pick('title'));
    if (!title) continue;
    items.push({
      title,
      link: strip(pick('link')),
      published: strip(pick('pubDate')) || strip(pick('dc:date')) || null,
      summary: strip(pick('description')).slice(0, 240),
      source,
    });
  }
  return items;
}

async function fetchFeed({ source, url }) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (CTE news tracker)' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { source, ok: false, status: res.status, items: [] };
    const items = parseItems(await res.text(), source);
    return { source, ok: true, count: items.length, items };
  } catch (e) {
    return { source, ok: false, error: e.message, items: [] };
  }
}

export async function pullNews() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flatMap(r => r.items);
  // newest first, de-dupe by title
  const seen = new Set();
  const stream = all
    .filter(i => (seen.has(i.title) ? false : seen.add(i.title)))
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  return { sources: results.map(({ source, ok, count, status, error }) => ({ source, ok, count, status, error })), items: stream };
}

// Run directly → print the unified stream + per-source status.
if (import.meta.url === `file://${process.argv[1]}`) {
  pullNews().then(({ sources, items }) => {
    console.log('=== Feed status ===');
    sources.forEach(s => console.log(` ${s.ok ? '✅' : '❌'} ${s.source.padEnd(16)} ${s.ok ? s.count + ' items' : (s.status || s.error)}`));
    console.log(`\n=== Unified stream: ${items.length} items (newest first) ===`);
    items.slice(0, 8).forEach(i => console.log(` • [${i.source}] ${i.title}`));
  });
}
