const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const fetch = require('node-fetch');

async function run() {
  const privateKey = fs.readFileSync(path.join(__dirname, 'private_key.txt'), 'utf8').trim();
  const clientEmail = 'news-agen@mythic-dynamo-382203.iam.gserviceaccount.com';
  
  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive']
  );
  
  // Get access token
  const credentials = await auth.authorize();
  const token = credentials.access_token;
  
  const url = "https://script.google.com/macros/s/AKfycbz_9l-fXW8G5e-K-1fH_Z0pX9q4_R8_G-1eX8z-5/exec?action=GET_RACK_FILE&fileName=master-registry.json";
  console.log('Fetching registry with token...');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  console.log('Registry status:', res.status);
  console.log('Registry response (truncated):', text.substring(0, 2000));
}

run().catch(console.error);
