import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const projectId = process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
}

if (!privateKey || !clientEmail || !projectId) {
  console.error('❌ Missing Firebase credentials in .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = admin.firestore();

async function promoteToSuperAdmin(email) {
  try {
    const usersRef = db.collection('evcrm_users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).get();

    if (snapshot.empty) {
      console.log(`❌ User with email ${email} not found.`);
      process.exit(1);
    }

    const docId = snapshot.docs[0].id;
    await usersRef.doc(docId).update({
      role: 'superadmin',
      is_active: true,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ User ${email} successfully promoted to SuperAdmin!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    process.exit(1);
  }
}

const targetEmail = 'scaleverse99@gmail.com';
promoteToSuperAdmin(targetEmail);
