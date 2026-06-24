/**
 * Helper script to share the Master Registry file with the service account.
 * Run this with: node scripts/share-registry.js <ACCESS_TOKEN> <FILE_ID> <EMAIL>
 */

const { google } = require('googleapis');

async function run() {
  const token = process.argv[2];
  const fileId = process.argv[3];
  const email = process.argv[4];

  if (!token || !fileId || !email) {
    console.error('Usage: node scripts/share-registry.js <TOKEN> <FILE_ID> <EMAIL>');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  console.log(`🚀 Sharing file ${fileId} with ${email}...`);

  const requestBody = {
    role: email === 'anyone' ? 'reader' : 'writer',
    type: email === 'anyone' ? 'anyone' : 'user'
  };
  if (email !== 'anyone') {
    requestBody.emailAddress = email;
  }

  await drive.permissions.create({
    fileId,
    requestBody
  });

  console.log('✅ Success! The service account can now update the registry.');
}

run().catch(console.error);
