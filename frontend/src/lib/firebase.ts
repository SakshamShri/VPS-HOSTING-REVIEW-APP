
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, initializeRecaptchaConfig, useDeviceLanguage } from 'firebase/auth';

// Your web app's Firebase configuration (review-e6f76)
const firebaseConfig = {
  apiKey: "AIzaSyAqSq0c5dFgvYGXNXMcEc6zy-_0l0JR-jU",
  authDomain: "review-e6f76.firebaseapp.com",
  projectId: "review-e6f76",
  storageBucket: "review-e6f76.firebasestorage.app",
  messagingSenderId: "972354508858",
  appId: "1:972354508858:web:88ee9f53714765715a7d03",
  measurementId: "G-5N211GJRR6",
};

// Initialize Firebase (HMR-safe)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Improve UX: localize and pre-load reCAPTCHA config so first OTP click is snappy
try {
  useDeviceLanguage(auth);
  // Preload reCAPTCHA config (no-op on unsupported envs)
  void initializeRecaptchaConfig(auth);
} catch {}

// Optional: enable only if you explicitly want to bypass reCAPTCHA (e.g. Firebase test phone numbers).
// WARNING: This will break real SMS OTP flows.
if ((import.meta as any).env?.VITE_FIREBASE_DISABLE_APP_VERIFICATION === "true") {
  (auth as any).settings.appVerificationDisabledForTesting = true;
}

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
export default app;
