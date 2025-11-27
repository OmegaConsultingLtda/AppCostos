import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASYfrRYTFb8kJ6IavGlG4_U-D9PTnvCCQ",
  authDomain: "aplicacion-de-costos-70bb2.firebaseapp.com",
  projectId: "aplicacion-de-costos-70bb2",
  storageBucket: "aplicacion-de-costos-70bb2.appspot.com",
  messagingSenderId: "54926856493",
  appId: "1:54926856493:web:cfc78a98e57a9af77343a4"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
