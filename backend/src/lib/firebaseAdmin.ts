import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKeyRaw) {
  throw new Error(
    "Missing Firebase Admin env vars. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env"
  );
}

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
};

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount as any)
});

export const firebaseAdmin = getAuth(app);
