const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function checkUsers() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  const db = admin.firestore();
  console.log("--- SCANNING FOR SUPERADMINS ---");
  
  const snap = await db.collection('evcrm_users').where('role', '==', 'superadmin').get();
  
  if (snap.empty) {
    console.log("❌ No SuperAdmin found!");
  } else {
    snap.forEach(doc => {
      console.log(`✅ Found: ${doc.data().email} (ID: ${doc.id})`);
    });
  }
  process.exit(0);
}

checkUsers().catch(console.error);
