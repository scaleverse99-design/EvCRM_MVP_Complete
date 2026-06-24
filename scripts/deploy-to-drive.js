/**
 * SOVEREIGN DEPLOY TO DRIVE
 * Compiles the Next.js application to a static site and uploads it to Google Drive.
 * 
 * Run: node scripts/deploy-to-drive.js [GDRIvE_FOLDER_ID]
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Service Account Config
const CLIENT_EMAIL = "news-agen@mythic-dynamo-382203.iam.gserviceaccount.com";
const PRIVATE_KEY_PATH = path.resolve(__dirname, '../ops-manager-cloudrun/private_key.txt');
const MASTER_FOLDER_ID = "1E7cNaR7CY_O2AxvKyDEnSkCtXfzFPjMn"; // Default ev-crm GDrive folder

async function run() {
  const folderId = process.argv[2] || MASTER_FOLDER_ID;
  console.log(`🚀 Starting deployment of Next.js static site to GDrive Folder: ${folderId}`);
  
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(`❌ Private key file not found at ${PRIVATE_KEY_PATH}`);
    process.exit(1);
  }
  
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8').trim();
  
  // 1. Setup Google Auth
  const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive']
  );
  
  const drive = google.drive({ version: 'v3', auth });
  
  // 2. Build Next.js App
  console.log('📦 Running npm run build...');
  execSync('npm run build', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  console.log('✅ Build completed successfully.');
  
  const outDir = path.resolve(__dirname, '../out');
  if (!fs.existsSync(outDir)) {
    console.error(`❌ Output folder not found: ${outDir}`);
    process.exit(1);
  }
  
  // 3. Resolve the "cache" sub-folder ID under GDrive root folder
  console.log('📂 Finding or creating "cache" sub-folder in Drive...');
  const cacheFolderId = await findOrCreateFolder(drive, 'cache', folderId);
  console.log(`✅ "cache" folder ID: ${cacheFolderId}`);
  
  // 4. Recursively upload the files in out/
  console.log('📤 Uploading static assets to Google Drive...');
  const fileIndex = {};
  await uploadFolderRecursive(drive, outDir, cacheFolderId, 'cache', fileIndex);
  
  console.log('\n✨ DEPLOYMENT COMPLETED!');
  console.log(`Uploaded ${Object.keys(fileIndex).length} files.`);
  console.log('Your EvCRM is now live and running on the Ops Manager Gateway!');
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

async function uploadFolderRecursive(drive, localPath, driveParentId, drivePath, fileIndex) {
  const items = fs.readdirSync(localPath);
  
  for (const item of items) {
    const fullLocalPath = path.join(localPath, item);
    const relativeDrivePath = `${drivePath}/${item}`;
    const stats = fs.statSync(fullLocalPath);
    
    if (stats.isDirectory()) {
      // Find or create subfolder in Drive
      const subFolderId = await findOrCreateFolder(drive, item, driveParentId);
      // Recurse
      await uploadFolderRecursive(drive, fullLocalPath, subFolderId, relativeDrivePath, fileIndex);
    } else {
      // Upload file
      const mimeType = getMimeType(item);
      const fileId = await uploadOrUpdateFile(drive, driveParentId, item, fullLocalPath, mimeType);
      fileIndex[relativeDrivePath] = fileId;
      console.log(`   Uploaded: ${relativeDrivePath} -> ${fileId}`);
    }
  }
}

async function uploadOrUpdateFile(drive, parentId, name, filePath, mimeType) {
  const q = `name = '${name}' and '${parentId}' in parents and trashed = false`;
  const res = await drive.files.list({ q, fields: 'files(id)' });
  
  const media = { mimeType, body: fs.createReadStream(filePath) };
  
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
  
  // Make file publicly readable for cache indexing
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: { role: 'reader', type: 'anyone' }
  });
  
  return file.data.id;
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

run().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
