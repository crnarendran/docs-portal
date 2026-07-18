import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "gen-lang-client-0059629431.firebaseapp.com",
  projectId: "gen-lang-client-0059629431",
  storageBucket: "gen-lang-client-0059629431.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use local emulators in development
if (process.env.NODE_ENV === 'development') {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
}

export { app, auth };
