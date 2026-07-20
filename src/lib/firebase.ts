import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0059629431.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0059629431",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0059629431.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:123456789"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "europe-west6");

// Use local emulators in development or when explicitly requested via env
if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  
  // Prevent double-connecting which throws an error
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  }
  
  try {
    // getFirestore() throws if connected twice, so we wrap in try-catch
    connectFirestoreEmulator(db, host, 8080);
  } catch (e) {
    // Already connected
  }

  try {
    connectFunctionsEmulator(functions, host, 5001);
  } catch (e) {
    // Already connected
  }
}

export { app, auth, db, functions };
