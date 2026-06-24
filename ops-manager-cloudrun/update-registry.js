const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function run() {
  const privateKey = fs.readFileSync(path.join(__dirname, 'private_key.txt'), 'utf8').trim();
  const clientEmail = 'news-agen@mythic-dynamo-382203.iam.gserviceaccount.com';
  
  const auth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive']
  );
  
  const drive = google.drive({ version: 'v3', auth });
  const fileId = '1vfgusk1wz24Qf-hU_DWKBiDtvVkhDzSe';
  
  console.log('Fetching registry from Google Drive...');
  const res = await drive.files.get({
    fileId,
    alt: 'media'
  });
  
  const registry = res.data;
  console.log('Current clients:', Object.keys(registry.clients));
  
  const targetClients = ['socialcomstore', 'socialcom'];
  let updated = false;
  
  for (const target of targetClients) {
    // Find the current key that starts with target (e.g. socialcomstore or socialcomstore_v2)
    const currentKey = Object.keys(registry.clients).find(k => k === target || k.startsWith(target + '_v'));
    
    if (currentKey) {
      const clientConfig = registry.clients[currentKey];
      let newVersionNum = 2;
      
      const match = currentKey.match(/_v(\d+)$/);
      if (match) {
        newVersionNum = parseInt(match[1], 10) + 1;
      }
      
      const newKey = `${target}_v${newVersionNum}`;
      console.log(`Renaming client entry: ${currentKey} -> ${newKey}`);
      
      // Update values
      clientConfig.clientId = newKey;
      
      // Swap key in object
      delete registry.clients[currentKey];
      registry.clients[newKey] = clientConfig;
      updated = true;
    } else {
      console.log(`Target client ${target} not found in registry.`);
    }
  }
  
  if (updated) {
    registry.version = (registry.version || 2) + 1;
    console.log('Writing updated registry back to Google Drive...');
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(registry, null, 2)
      }
    });
    console.log('Registry updated successfully!');
  } else {
    console.log('No updates were necessary.');
  }
}

run().catch(console.error);
