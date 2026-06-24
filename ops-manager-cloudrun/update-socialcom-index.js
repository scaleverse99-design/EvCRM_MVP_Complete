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
  
  const fileId = '1Eej5x8kV-m2xTRuECigzVvOwBKzpiY1F';
  const htmlPath = path.join(__dirname, 'src', 'public', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  console.log(`Updating Google Drive file ${fileId} with content from ${htmlPath}...`);
  
  const res = await drive.files.update({
    fileId: fileId,
    media: {
      mimeType: 'text/html',
      body: htmlContent
    }
  });
  
  console.log('Update complete! Status:', res.status);
}

run().catch(console.error);
