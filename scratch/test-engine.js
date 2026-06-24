
const dotenv = require('dotenv');
dotenv.config();

const { runPulseUpdate } = require('./lib/ai-pulse');

async function testEngine() {
  console.log('🚀 Starting Omni-Scope Engine Test...');
  try {
    const updates = await runPulseUpdate(true); // Force run
    console.log(`✅ Success! Generated ${updates ? updates.length : 0} articles.`);
    if (updates && updates.length > 0) {
      console.log('Sample Article Scope:', updates[0].scope);
      console.log('Sample Article Area:', updates[0].state);
    }
  } catch (err) {
    console.error('❌ Engine Test Failed:', err.message);
  }
}

testEngine().then(() => process.exit(0));
