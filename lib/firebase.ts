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
  return "default";
}

export function setActiveDatabaseMode(_mode: ActiveDatabaseMode): void {
  // no-op: single (default) database enforced
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    return getFirestore(app);
  }
}

const defaultFirestore = createFirestoreInstance();

export const db: Firestore = defaultFirestore;
export const legacyDb: Firestore = defaultFirestore;

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
