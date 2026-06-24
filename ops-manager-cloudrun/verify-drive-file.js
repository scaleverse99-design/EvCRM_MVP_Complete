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
  
  console.log(`Fetching file ${fileId} content from Drive...`);
  const res = await drive.files.get({
    fileId,
    alt: 'media'
  });
  
  console.log('Drive File Content Preview (First 500 chars):');
  console.log(res.data.substring(0, 500));
}

run().catch(console.error);
