import { db } from './firebase-admin';

/**
 * Script to onboard the "socialcom.store" business
 * into the Sovereign Cloud ecosystem.
 */
export async function onboardSocialComStore(ownerEmail, opsUrl, opsToken) {
  try {
    const userRef = db.collection('evcrm_users');
    const snapshot = await userRef.where('email', '==', ownerEmail).limit(1).get();
    
    if (snapshot.empty) {
      throw new Error("User not found. Please register the owner first.");
    }

    const userId = snapshot.docs[0].id;

    await userRef.doc(userId).update({
      business_name: "SocialCom Store",
      business_slug: "socialcom",
      custom_domain: "socialcom.store",
      opsmanager_url: opsUrl,
      opsmanager_token: opsToken,
      shadow_cache_base_url: "", // Initialized after first sync
      updated_at: new Date().toISOString()
    });

    console.log("✅ SocialCom Store onboarded successfully!");
    return { success: true };
  } catch (err) {
    console.error("❌ Onboarding failed:", err.message);
    return { success: false, error: err.message };
  }
}
