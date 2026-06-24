import admin from 'firebase-admin'

// ── Hardcoded Safety Fallbacks ────────────────────────────────────
const FALLBACK_PROJECT_ID  = 'ev-crm-realtime'
const FALLBACK_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@ev-crm-realtime.iam.gserviceaccount.com'

function getFirebaseAdmin() {
  // CORRECT WAY: Check specifically if the default app exists.
  // Next.js/Firebase Frameworks sometimes initialize their own internal apps
  // which makes admin.apps.length > 0 true, but [DEFAULT] still doesn't exist!
  try {
    return admin.app()
  } catch (e) {
    // Default app doesn't exist yet, proceed with initialization
  }

  const projectId   = process.env.FB_PROJECT_ID   || process.env.FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL
  let privateKey    = process.env.FB_PRIVATE_KEY  || process.env.FIREBASE_PRIVATE_KEY

  if (privateKey) {
    // Handle literal \n, actual newlines, and quotes
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim()
    
    // Ensure it starts and ends with the standard PEM markers
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
       privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`
    }
    if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
       privateKey = `${privateKey}\n-----END PRIVATE KEY-----`
    }
  }

  console.log('[Firebase Admin] Initializing Firebase Admin...', {
    projectId,
    hasKey: !!privateKey
  })

  // SOVEREIGN BUILD-SAFE BYPASS
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  try {
    if (clientEmail && privateKey && privateKey.length > 100) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId
      })
    } else {
      console.warn('[Firebase Admin] WARNING: Missing Private Key. Using default compute engine credentials.')
      return admin.initializeApp({ projectId })
    }
  } catch (error) {
    if (/already exists/.test(error.message)) {
      return admin.app()
    }
    console.error('[Firebase Admin] Initialization Error:', error.message)
    throw error
  }
}

// ── Initialize App ────────────────────────────────────────────────
const app = getFirebaseAdmin()

// ── Export Services ───────────────────────────────────────────────
export const db = app ? admin.firestore(app) : null
export const auth = app ? admin.auth(app) : null

export default admin
