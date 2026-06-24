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
  
  const folderId = '1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn'; // ev-crm folder
  const htmlPath = path.join(__dirname, 'src', 'public', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  console.log('Searching for cache folder...');
  const folderRes = await drive.files.list({
    q: `name = 'cache' and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)'
  });
  
  let cacheFolderId = folderRes.data.files?.[0]?.id;
  if (!cacheFolderId) {
    console.log('Cache folder not found, creating it...');
    const createFolderRes = await drive.files.create({
      requestBody: {
        name: 'cache',
        parents: [folderId],
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    cacheFolderId = createFolderRes.data.id;
  }
  
  console.log('Cache folder ID:', cacheFolderId);
  
  console.log('Searching for index.html in cache...');
  const fileRes = await drive.files.list({
    q: `name = 'index.html' and '${cacheFolderId}' in parents and trashed = false`,
    fields: 'files(id)'
  });
  
  const fileId = fileRes.data.files?.[0]?.id;
  if (fileId) {
    console.log('File index.html found. Updating...');
    const res = await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'text/html',
        body: htmlContent
      }
    });
    console.log('Update complete!', res.status);
  } else {
    console.log('File index.html not found. Creating...');
    const res = await drive.files.create({
      requestBody: {
        name: 'index.html',
        parents: [cacheFolderId]
      },
      media: {
        mimeType: 'text/html',
        body: htmlContent
      }
    });
    console.log('Creation complete!', res.status);
  }
}

run().catch(console.error);
