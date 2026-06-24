
import 'dotenv/config';
import RSSParser from 'rss-parser';
import { runPulseUpdate } from './lib/ai-pulse.js';

const parser = new RSSParser();

async function diagnose() {
  console.log('🔍 [DIAGNOSTIC] Starting Deep Pulse Audit...');
  
  // 1. Check Env
  console.log('Key Status:', {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasProject: !!process.env.FB_PROJECT_ID || !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });

  // 2. Test a single RSS Feed
  const testUrl = "https://electrek.co/feed/";
  console.log(`📡 [RSS] Fetching ${testUrl}...`);
  try {
    const feed = await parser.parseURL(testUrl);
    console.log(`✅ [RSS] Success! Found ${feed.items.length} items.`);
    if (feed.items.length > 0) {
      console.log('Sample Title:', feed.items[0].title);
    }
  } catch (err) {
    console.error(`❌ [RSS] Failed:`, err.message);
  }

  // 3. Test Gemini directly
  console.log('🤖 [AI] Testing Gemini Synthesis...');
  const prompt = "Briefly summarize the benefit of EVs in 20 chars.";
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await resp.json();
    console.log('✅ [AI] Success! Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err) {
    console.error('❌ [AI] Failed:', err.message);
  }

  // 4. Run the actual engine with debug logs
  console.log('⚡ [ENGINE] Running Full Omni-Scope Sync (Force Mode)...');
  const updates = await runPulseUpdate(true);
  console.log(`🏁 [ENGINE] Result: ${updates.length} articles generated.`);
}

diagnose().then(() => process.exit(0));
