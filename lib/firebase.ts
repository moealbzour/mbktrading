import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgNCyANwJ9CJmTJX0HKH-ssGHlfktF0L8",
  authDomain: "mbktrading-8dc98.firebaseapp.com",
  projectId: "mbktrading-8dc98",
  storageBucket: "mbktrading-8dc98.firebasestorage.app",
  messagingSenderId: "517824449905",
  appId: "1:517824449905:web:b23974879c5ef0b78f7ad0",
  measurementId: "G-1SENWMMH31"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
