
import 'dotenv/config';
import { runPulseUpdate } from './lib/ai-pulse.js';

async function testEngine() {
  console.log('🚀 Starting Omni-Scope Engine Test...');
  try {
    const updates = await runPulseUpdate(true); // Force run
    console.log(`✅ Success! Generated ${updates ? updates.length : 0} articles.`);
    if (updates && updates.length > 0) {
      console.log('--- Sample Article ---');
      console.log('Title:', updates[0].title);
      console.log('Scope:', updates[0].scope);
      console.log('Area:', updates[0].state || "N/A");
    } else {
      console.log('ℹ️ No new articles were generated (Duplicate detection or Feed empty).');
    }
  } catch (err) {
    console.error('❌ Engine Test Failed:', err);
  }
}

testEngine().then(() => process.exit(0));
