
import 'dotenv/config';

async function testGemini() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  console.log('Testing Gemini with key:', GEMINI_API_KEY ? 'Present' : 'Missing');

  const prompt = "Briefly summarize the benefit of EVs in 20 words.";
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    const data = await response.json();
    console.log('Gemini Full JSON:', JSON.stringify(data, null, 2));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Extracted Text:', text);
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

testGemini().then(() => process.exit(0));
