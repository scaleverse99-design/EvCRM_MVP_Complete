/**
 * Helper script to create the Master Registry file in Google Drive.
 * Run this with: node scripts/create-registry.js <ACCESS_TOKEN>
 */

const { google } = require('googleapis');
const fs = require('fs');

async function run() {
  const token = process.argv[2];
  if (!token) {
    console.error('Please provide a Google Access Token');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  console.log('🚀 Creating master-registry.json in Drive...');

  const res = await drive.files.create({
    requestBody: {
      name: 'master-registry.json',
      mimeType: 'application/json'
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify({ version: 1, clients: {} }, null, 2)
    },
    fields: 'id'
  });

  console.log('✅ Success!');
  console.log('--------------------------------------------------');
  console.log('FILE ID:', res.data.id);
  console.log('--------------------------------------------------');
  console.log('Now set this ID as MASTER_REGISTRY_FILE_ID in your Cloud Run env.');
}

run().catch(console.error);
