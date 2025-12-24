import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqSq0c5dFgvYGXNXMcEc6zy-_0l0JR-jU",
  authDomain: "review-e6f76.firebaseapp.com",
  projectId: "review-e6f76",
  storageBucket: "review-e6f76.firebasestorage.app",
  messagingSenderId: "972354508858",
  appId: "1:972354508858:web:88ee9f53714765715a7d03",
  measurementId: "G-5N211GJRR6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth, RecaptchaVerifier, signInWithPhoneNumber };
