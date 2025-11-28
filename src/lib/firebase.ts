import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const fallbackConfig = {
  apiKey: "AIzaSyASYfrRYTFb8kJ6IavGlG4_U-D9PTnvCCQ",
  authDomain: "aplicacion-de-costos-70bb2.firebaseapp.com",
  projectId: "aplicacion-de-costos-70bb2",
  storageBucket: "aplicacion-de-costos-70bb2.appspot.com",
  messagingSenderId: "54926856493",
  appId: "1:54926856493:web:cfc78a98e57a9af77343a4",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    fallbackConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackConfig.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
