import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore
} from "firebase/firestore";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId || ""
};

export const SECONDARY_DATABASE_ID = "ai-studio-mbktrading-5c717851-cdb4-4a97-a0f4-f006f13d6c7b";
export const ACTIVE_DB_MODE_STORAGE_KEY = "mbk_active_db_mode";

export type ActiveDatabaseMode = "default" | "secondary";

export function getActiveDatabaseMode(): ActiveDatabaseMode {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(ACTIVE_DB_MODE_STORAGE_KEY);
      if (saved === "secondary") return "secondary";
    } catch {
      // ignore
    }
  }
  return "default";
}

export function setActiveDatabaseMode(mode: ActiveDatabaseMode): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACTIVE_DB_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function createFirestoreInstance(dbId?: string): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      },
      dbId
    );
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

const defaultFirestore = createFirestoreInstance(undefined);
const secondaryFirestore = createFirestoreInstance(SECONDARY_DATABASE_ID);

const currentMode = getActiveDatabaseMode();

export const db: Firestore = currentMode === "secondary" ? secondaryFirestore : defaultFirestore;
export const legacyDb: Firestore = currentMode === "secondary" ? defaultFirestore : secondaryFirestore;

// Optional connection check helper
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'signals', 'connection-check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
