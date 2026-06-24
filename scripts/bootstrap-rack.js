/**
 * SOVEREIGN RACK BOOTSTRAPPER
 * Builds the Sheet-like architecture inside a GDrive Folder.
 * 
 * Run: node scripts/bootstrap-rack.js <FOLDER_ID> <CLIENT_ID> <BUSINESS_NAME>
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  const token = process.argv[2];
  const folderId = process.argv[3];
  const clientId = process.argv[4] || 'ev-crm';
  const businessName = process.argv[5] || 'Ev.CRM';

  if (!token || !folderId) {
    console.error('Usage: node scripts/bootstrap-rack.js <ACCESS_TOKEN> <FOLDER_ID> [CLIENT_ID] [BUSINESS_NAME]');
    process.exit(1);
  }

  // 1. Setup Auth (Using Access Token)
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  console.log(`🚀 Bootstrapping Sovereign Rack for ${businessName} (${clientId})...`);
  console.log(`📂 Target Folder: ${folderId}`);

  // 2. Create Folders
  const folders = {
    cache: await findOrCreateFolder(drive, 'cache', folderId),
    queue: await findOrCreateFolder(drive, 'queue', folderId),
    data: await findOrCreateFolder(drive, 'data', folderId),
    config: await findOrCreateFolder(drive, 'config', folderId)
  };

  console.log('✅ Folders ready:', folders);

  // 3. Define Architecture (Sheet-like JSON files)
  const now = new Date().toISOString();
  const architecture = {
    [`${folders.cache}/pulse.json`]: { version: 1, lastUpdated: now, articles: [] },
    [`${folders.cache}/pending_reviews.json`]: { version: 1, lastUpdated: now, articles: [] },
    [`${folders.cache}/homepage.json`]: { version: 1, businessId: clientId, hero: { headline: `Welcome to ${businessName}` }, lastUpdated: now },
    [`${folders.data}/leads.json`]: { version: 1, leads: [], lastUpdated: now },
    [`${folders.data}/quotes.json`]: { version: 1, quotes: [], lastUpdated: now },
    [`${folders.config}/settings.json`]: { version: 1, clientId, businessName, storageAdapter: 'google-drive', provisionedAt: now }
  };

  // 4. Upload / Reset Files
  for (const [key, content] of Object.entries(architecture)) {
    const [parentId, fileName] = [key.split('/')[0], key.split('/')[1]];
    console.log(`📤 Provisioning ${fileName}...`);
    await uploadOrUpdateFile(drive, parentId, fileName, content);
  }

  console.log('\n✨ SOVEREIGN RACK ARCHITECTURE INITIALIZED!');
  console.log('--------------------------------------------------');
  console.log('Your Rack is now ready to receive data via the Gateway.');
  console.log('--------------------------------------------------');
}

async function findOrCreateFolder(drive, name, parentId) {
  const q = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({ q, fields: 'files(id)' });
  
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id'
  });
  return folder.data.id;
}

async function uploadOrUpdateFile(drive, parentId, name, content) {
  const q = `name = '${name}' and '${parentId}' in parents and trashed = false`;
  const res = await drive.files.list({ q, fields: 'files(id)' });
  
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  const media = { mimeType: 'application/json', body };

  if (res.data.files && res.data.files.length > 0) {
    const fileId = res.data.files[0].id;
    await drive.files.update({ fileId, media });
    return fileId;
  }

  const file = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media,
    fields: 'id'
  });

  // Make public for fast-read if in cache
  if (name.includes('.json') && parentId) {
     await drive.permissions.create({
       fileId: file.data.id,
       requestBody: { role: 'reader', type: 'anyone' }
     });
  }

  return file.data.id;
}

run().catch(err => {
  console.error('❌ Bootstrap failed:', err.message);
  process.exit(1);
});
