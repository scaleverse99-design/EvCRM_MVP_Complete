const fetch = require('node-fetch');

async function run() {
  const url = "https://socialcom.store";
  console.log('Fetching headers and content preview from:', url);
  const res = await fetch(url);
  console.log('Status:', res.status);
  console.log('Headers:');
  for (const [key, value] of res.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  const text = await res.text();
  console.log('\nContent Preview (First 500 chars):');
  console.log(text.substring(0, 500));
}

run().catch(console.error);
