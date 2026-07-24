/**
 * qwen-organizer.js
 * Local LLM Data Organizer using Qwen 2.5 via Ollama (Zero API Cost).
 * 
 * Pipeline Stage C:
 *   1. Code (spec-extractor.js) cleans raw web text deterministically (prices, range, battery).
 *   2. This module sends the code-cleaned text to local Qwen 2.5 via Ollama (http://localhost:11434).
 *   3. Qwen 2.5 organizes the data into strict JSON matching our Supabase schema:
 *      - variant_trim, intent (price_drop / new_launch / review), pros_cons, target_segment.
 *   4. Zero API billing (runs 100% locally on your machine).
 */

require('dotenv').config();
const http = require('http');
const pino = require('pino');

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen2.5';

/**
 * Call local Ollama API to run Qwen 2.5 on code-cleaned text
 */
function callLocalQwen(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: QWEN_MODEL,
      prompt: prompt,
      stream: false,
      format: 'json'
    });

    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.response ? JSON.parse(json.response) : null);
        } catch (err) {
          resolve(null);
        }
      });
    });

    req.on('error', err => resolve(null)); // Graceful fallback if Ollama not running
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(payload);
    req.end();
  });
}

/**
 * Stage C Organizer: Takes Code-cleaned specs and runs Qwen 2.5 locally
 * to categorize trims, pros/cons, and market intent into JSON.
 */
async function organizeWithQwen(cleanedData, rawText) {
  const prompt = `
You are a automotive data organizer. Your task is to take the CODE-CLEANED vehicle data below and organize it into a structured JSON database payload.

Input Data:
Vehicle Name: ${cleanedData.name || 'Unknown'}
Extracted Specs: ${JSON.stringify(cleanedData.specs || {})}
Cleaned Price: ${cleanedData.price || 'Unknown'}
Raw Web Snippet: "${(rawText || '').slice(0, 800)}"

Return ONLY a valid JSON object matching this exact schema:
{
  "variant_trim": "string or null",
  "intent": "new_launch | price_change | feature_update | review",
  "target_segment": "budget | premium | performance | family",
  "key_features": ["feature 1", "feature 2"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1"],
  "verdict_summary": "1 sentence summary"
}
`;

  try {
    const qwenResult = await callLocalQwen(prompt);
    if (qwenResult) {
      logger.info(`[Qwen 2.5 Local] Successfully organized record for: "${cleanedData.name}" (Zero API cost)`);
      return {
        ...cleanedData,
        organized_by: 'qwen2.5_local',
        qwen_metadata: qwenResult
      };
    }
  } catch (err) {
    logger.warn(`[Qwen 2.5 Local] Ollama offline or model unavailable (${err.message}). Using Code-cleaned data fallback.`);
  }

  // Fallback: Code-cleaned data remains 100% functional even if Ollama is paused
  return {
    ...cleanedData,
    organized_by: 'code_regex_engine'
  };
}

if (require.main === module) {
  const sampleCleaned = { name: 'Ather 450X', price: 145000, specs: { range_km: 150, battery_kwh: 3.7 } };
  organizeWithQwen(sampleCleaned, 'Ather 450X launched at Rs 1.45 lakh with 150km certified range and fast charging').then(console.log);
}

module.exports = { organizeWithQwen, callLocalQwen };
