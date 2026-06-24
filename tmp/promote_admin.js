const { db } = require('./lib/firebase-admin');

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
