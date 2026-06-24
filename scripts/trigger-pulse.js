const { runPulseUpdate } = require('./lib/ai-pulse');
require('dotenv').config();

async function init() {
  console.log('--- MANUALLY TRIGGERING EV PULSE ---');
  try {
    const updates = await runPulseUpdate();
    console.log('SUCCESS: Generated', updates.length, 'posts.');
  } catch (err) {
    console.error('FAILED:', err);
  }
}

init();
