
import 'dotenv/config';

async function testAdvancedModel() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-2.0-flash";
  console.log(`Testing Highly Advanced Model: ${MODEL}...`);

  const prompt = "Briefly summarize the benefit of EVs in 20 words.";
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log(`✅ SUCCESS! ${MODEL} responded: ${text}`);
    } else {
      console.error(`❌ FAIL! ${MODEL} error:`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
}

testAdvancedModel().then(() => process.exit(0));
