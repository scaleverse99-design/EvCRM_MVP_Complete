
import 'dotenv/config';

async function listSupportedModels() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  console.log('Listing models for key:', GEMINI_API_KEY ? 'Present' : 'Missing');

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('✅ Supported Models Found:');
      data.models.forEach(m => {
        console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.error('❌ No models found in response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Request Failed:', err.message);
  }
}

listSupportedModels().then(() => process.exit(0));
