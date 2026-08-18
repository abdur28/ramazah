import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

// Validate required environment variables
if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    'Missing Firebase Admin credentials. Please check your .env.local file.'
  );
}

// Initialize Firebase Admin (singleton)
let firebaseAdminApp: App;

function getFirebaseAdmin() {
  const apps = getApps();
  
  if (!apps.length) {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  } else {
    firebaseAdminApp = apps[0];
  }
  
  return firebaseAdminApp;
}

// Initialize app
const app = getFirebaseAdmin();

// Export services
export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = getFirestore(app);
export const adminStorage: Storage = getStorage(app);

export default app;