const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Credentials come from .env — NEVER hardcoded. This file previously
// carried a literal Supabase secret key (full database access, bypasses RLS),
// which GitHub push protection caught on 2026-08-07. The key has been
// rotated and the literal stripped from history.
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function cleanProse(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    // 1. Remove all external markdown links: [Text](https://external-domain.com...) -> ""
    .replace(/\[([^\]]+)\]\((https?:\/\/(?!evcrm\.in)[^)\s]+)\)/gi, "")
    // 2. Remove bracketed publisher citations
    .replace(/\[\s*(?:HT Auto|CarDekho|CarWale|Autocar India|Team-BHP|Kia India|Tata Motors|Mahindra|Hyundai|Kia|FoneArena\.com|FoneArena|MotorBeam|Overdrive|ZigWheels|RushLane|NDTV Auto|Moneycontrol|LiveMint|Economic Times|CNBC TV18|BS Motoring|The Times of India|Cartoq|BikeJunction|BikeDekho|BikeWale|India Today|ETAuto|Rediff|Greater Kashmir|Wikipedia)[^\]]*\]/gi, "")
    // 3. Remove bare domain mentions
    .replace(/(?:FoneArena\.com|CarDekho\.com|CarWale\.com|AutocarIndia\.com|Livemint\.com)[,\s]*/gi, "")
    // 4. Clean up empty brackets, commas, parens, double spaces
    .replace(/\[\s*\]/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function cleanAllBlogPosts() {
  console.log('Fetching all blog posts from Supabase...');
  const { data: rows, error } = await supabase.from('blog_posts').select('id, data');
  if (error) {
    console.error('Error fetching blog_posts:', error);
    return;
  }

  console.log(`Found ${rows.length} blog posts in Supabase. Cleaning bracket citations...`);
  let cleanedCount = 0;

  for (const row of rows) {
    const postData = row.data;
    if (!postData || (!postData.body && !postData.text)) continue;

    const rawText = postData.body || postData.text;
    const cleanedText = cleanProse(rawText);

    if (cleanedText !== rawText) {
      if (postData.body) postData.body = cleanedText;
      if (postData.text) postData.text = cleanedText;
      postData.updatedAt = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('blog_posts')
        .update({ data: postData })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`Error updating post ${postData.slug}:`, updateErr);
      } else {
        cleanedCount++;
        console.log(`✅ Cleaned bracket citations from post: "${postData.title}" (${postData.slug})`);
      }
    }
  }

  // Also clean local JSON file if exists
  const localPath = path.join(__dirname, '../data/blog_posts.json');
  if (fs.existsSync(localPath)) {
    try {
      const localPosts = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      let localCleaned = 0;
      localPosts.forEach(p => {
        if (p.text) {
          const c = cleanProse(p.text);
          if (c !== p.text) { p.text = c; localCleaned++; }
        }
      });
      fs.writeFileSync(localPath, JSON.stringify(localPosts, null, 2));
      console.log(`✅ Cleaned ${localCleaned} posts in local data/blog_posts.json`);
    } catch (e) {
      console.warn('Local file note:', e.message);
    }
  }

  console.log(`🎉 Finished! Cleaned ${cleanedCount} out of ${rows.length} blog posts in Supabase.`);
}

cleanAllBlogPosts().catch(console.error);
