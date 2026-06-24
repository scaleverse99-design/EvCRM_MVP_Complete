
import 'dotenv/config';

async function findWorkingModel() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const models = [
    { v: 'v1beta', m: 'gemini-1.5-flash-latest' },
    { v: 'v1beta', m: 'gemini-1.5-flash' },
    { v: 'v1', m: 'gemini-1.5-flash' },
    { v: 'v1beta', m: 'gemini-pro' }
  ];

  for (const item of models) {
    console.log(`Testing ${item.v}/${item.m}...`);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${item.v}/models/${item.m}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✅ SUCCESS: ${item.v}/${item.m} is ACTIVE.`);
        return item;
      } else {
        console.warn(`❌ FAIL: ${item.v}/${item.m} error: ${data.error?.message || 'Invalid structure'}`);
      }
    } catch (e) {
      console.warn(`❌ ERROR: ${item.v}/${item.m} failed completely.`);
    }
  }
}

findWorkingModel().then(() => process.exit(0));
