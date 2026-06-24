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
  
  // Search for master-registry.json
  const searchRes = await drive.files.list({
    q: "name = 'master-registry.json' and trashed = false",
    fields: 'files(id, name, parents, size)'
  });
  
  const files = searchRes.data.files;
  if (!files || files.length === 0) {
    console.log('No master-registry.json files found!');
    return;
  }
  
  console.log(`Found ${files.length} file(s):`);
  for (const f of files) {
    console.log(`- File ID: ${f.id}, Name: ${f.name}, Size: ${f.size}, Parents: ${f.parents}`);
    
    // Fetch content of the first match
    try {
      const contentRes = await drive.files.get({
        fileId: f.id,
        alt: 'media'
      });
      console.log('--- Content ---');
      console.log(JSON.stringify(contentRes.data, null, 2));
      console.log('---------------');
    } catch (err) {
      console.error('Failed to read file content:', err.message);
    }
  }
}

run().catch(console.error);
