const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local or cte-engine/.env
let envFile = '';
try {
  envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
} catch (e) {
  envFile = fs.readFileSync(path.join(__dirname, '../../cte-engine/.env'), 'utf8');
}

const envVars = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\[\s*(?:HT Auto|CarDekho|CarWale|Autocar India|Team-BHP|Kia India|Tata Motors|Mahindra|Hyundai|Kia|FoneArena|MotorBeam|Overdrive|ZigWheels|RushLane|NDTV Auto|Moneycontrol|LiveMint|Economic Times|CNBC TV18|BS Motoring)[^\]]*\]/gi, "")
    .replace(/(?:FoneArena\.com|CarDekho\.com|CarWale\.com|AutocarIndia\.com)[,\s]*/gi, "")
    .replace(/\[\s*\]/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function cleanAllArticles() {
  console.log('Fetching all articles from Supabase...');
  const { data: articles, error } = await supabase.from('articles').select('id, title, content');
  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  console.log(`Found ${articles.length} articles to clean...`);
  let cleanedCount = 0;

  for (const art of articles) {
    const cleanedContent = cleanText(art.content);
    if (cleanedContent !== art.content) {
      const { error: updateErr } = await supabase
        .from('articles')
        .update({ content: cleanedContent })
        .eq('id', art.id);

      if (updateErr) {
        console.error(`Error updating article ${art.id}:`, updateErr);
      } else {
        cleanedCount++;
        console.log(`✅ Cleaned bracket citations from article: "${art.title}"`);
      }
    }
  }

  console.log(`🎉 Finished! Successfully cleaned ${cleanedCount} articles in Supabase.`);
}

cleanAllArticles().catch(console.error);
