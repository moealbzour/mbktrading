import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config
const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
const rawConfig = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(rawConfig);

// Initialize Firebase Admin SDK using Application Default Credentials (ADC)
let adminDb: AdminFirestore | null = null;

try {
  const adminApp = !getAdminApps().length
    ? initAdminApp({
        credential: applicationDefault(),
        projectId: config.projectId
      })
    : getAdminApp();

  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    adminDb = getAdminFirestore(adminApp, config.firestoreDatabaseId);
  } else {
    adminDb = getAdminFirestore(adminApp);
  }
  adminDb.settings({ ignoreUndefinedProperties: true });
  console.log('[Firebase Admin SDK] Initialized with Application Default Credentials for:', config.firestoreDatabaseId || '(default)');
} catch (err: any) {
  console.warn('[Firebase Admin SDK] Notice on init:', err.message);
}

// Client SDK fallback to guarantee operation in sandbox environments
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const clientApp = !getClientApps().length ? initClientApp(firebaseConfig) : getClientApps()[0];
const clientDb =
  config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? getClientFirestore(clientApp, config.firestoreDatabaseId)
    : getClientFirestore(clientApp);

export { adminDb, clientDb };

export interface SignalRecord {
  id: string;
  symbol: string;
  nameAr?: string;
  action: 'BUY' | 'SELL';
  orderType: string;
  type: string;
  source: 'VIP_MANUAL' | 'BOT_WEBHOOK' | 'FREE_PUBLIC';
  sourceLabelAr: string;
  sourceLabelEn: string;
  status: 'RUNNING' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED' | 'TP_HIT';
  statusLabelAr: string;
  openTime: string;
  duration: string;
  pips: number;
  entryPrice: number;
  currentPrice: number;
  tp1: number;
  tp2: number;
  tp3?: number;
  sl: number;
  riskReward: string;
  strategy: string;
  timeframe: string;
  confidence: number;
  notesAr: string;
  notesEn: string;
  textMsg?: string;
  author: string;
  authorRole: string;
  accessLevel: 'free' | 'vip' | 'all';
  access_level: 'free' | 'vip' | 'all';
  isBotSignal?: boolean;
  isBlurredForFree: boolean;
  createdAt: string;
  timestampMs: number;
}

export async function saveSignalToFirestore(signal: Partial<SignalRecord>): Promise<SignalRecord> {
  const signalId = signal.id || `sig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const nowMs = signal.timestampMs || Date.now();
  const createdAt = signal.createdAt || new Date(nowMs).toISOString();

  const isGold = signal.symbol?.includes('XAU') || signal.symbol?.includes('GOLD');
  const isForex = signal.symbol?.includes('EUR') || signal.symbol?.includes('GBP');
  const nameAr = isGold
    ? 'الذهب أونصة'
    : signal.symbol === 'US100'
    ? 'ناسداك 100'
    : isForex
    ? 'اليورو دولار'
    : signal.symbol === 'BTCUSD'
    ? 'البيتكوين'
    : signal.symbol || 'US100';

  const cleanAccess = (signal.accessLevel || signal.access_level || 'free').toLowerCase() as 'free' | 'vip' | 'all';
  const isVip = cleanAccess === 'vip';
  const source = isVip
    ? 'VIP_MANUAL'
    : signal.authorRole === 'ADMIN' && signal.author?.includes('Bot')
    ? 'BOT_WEBHOOK'
    : 'FREE_PUBLIC';

  const sourceLabelAr = source === 'BOT_WEBHOOK' ? 'بوت TradingView Webhook' : isVip ? 'محلل VIP المعتمد' : 'تحليل عام';
  const sourceLabelEn = source === 'BOT_WEBHOOK' ? 'TradingView Bot' : isVip ? 'VIP Certified Analyst' : 'Public Research';

  const entry = Number(signal.entryPrice || 0);
  const tp1 = Number(signal.tp1 || 0);
  const tp2 = Number(signal.tp2 || (tp1 > 0 ? tp1 * 1.01 : 0));
  const tp3 = signal.tp3 !== undefined ? Number(signal.tp3) : undefined;
  const sl = Number(signal.sl || 0);

  const diff = signal.action === 'SELL' ? entry - tp1 : tp1 - entry;
  const pips =
    signal.pips !== undefined
      ? signal.pips
      : Math.abs(isGold ? Math.round(diff * 10) : isForex ? Math.round(diff * 10000) : Math.round(diff));

  const risk = Math.abs(entry - sl);
  const reward = Math.abs((tp3 || tp2) - entry);
  const riskReward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : '1:2.4';

  const fullSignal: SignalRecord = {
    id: signalId,
    symbol: signal.symbol || 'US100',
    nameAr,
    action: (signal.action || 'BUY').toUpperCase() as 'BUY' | 'SELL',
    orderType: (signal.orderType || signal.action || 'BUY').toUpperCase(),
    type: (signal.type || signal.action || 'BUY').toUpperCase(),
    source: (signal.source as any) || source,
    sourceLabelAr: signal.sourceLabelAr || sourceLabelAr,
    sourceLabelEn: signal.sourceLabelEn || sourceLabelEn,
    status: (signal.status || 'RUNNING') as any,
    statusLabelAr: signal.statusLabelAr || (signal.status === 'RUNNING' ? 'صفقة جارية الآن ⚡' : 'هدف محقق بالكامل 🎯'),
    openTime: signal.openTime || new Date(nowMs).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    duration: signal.duration || 'الآن',
    pips,
    entryPrice: entry,
    currentPrice: Number(signal.currentPrice || entry),
    tp1,
    tp2,
    ...(tp3 !== undefined ? { tp3 } : {}),
    sl,
    riskReward,
    strategy: signal.strategy || 'MBK Institutional Strategy',
    timeframe: signal.timeframe || '15m',
    confidence: signal.confidence || 92,
    notesAr: signal.notesAr || 'إشارة تداول مؤسسية مع تأكيد شروط الدخول وإدارة المخاطر.',
    notesEn: signal.notesEn || 'Institutional trade setup with strict risk parameters.',
    ...(signal.textMsg ? { textMsg: signal.textMsg } : {}),
    author: signal.author || 'MBK Analyst',
    authorRole: signal.authorRole || 'ANALYSER',
    accessLevel: cleanAccess,
    access_level: cleanAccess,
    isBotSignal: signal.isBotSignal !== undefined ? signal.isBotSignal : source === 'BOT_WEBHOOK',
    isBlurredForFree: isVip,
    createdAt,
    timestampMs: nowMs
  };

  // Try Firebase Admin SDK first
  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(signalId).set(fullSignal);
      console.log(`[Firebase Admin SDK] Signal saved: ${signalId}`);
      return fullSignal;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Write fallback to Client SDK:', err.message);
    }
  }

  // Fallback to Firebase Client SDK
  const docRef = doc(clientDb, 'signals', signalId);
  await setDoc(docRef, fullSignal);
  console.log(`[Firebase Client SDK] Signal saved: ${signalId}`);
  return fullSignal;
}

export async function getSignalsFromFirestore(limitCount: number = 100): Promise<SignalRecord[]> {
  // Try Firebase Admin SDK first
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection('signals').orderBy('timestampMs', 'desc').limit(limitCount).get();
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
      }
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Read fallback to Client SDK:', err.message);
    }
  }

  // Fallback to Firebase Client SDK
  const signalsRef = collection(clientDb, 'signals');
  const q = query(signalsRef, orderBy('timestampMs', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);
  const results: SignalRecord[] = [];
  querySnapshot.forEach((docSnap) => {
    results.push({ id: docSnap.id, ...(docSnap.data() as any) });
  });
  return results;
}

export async function deleteSignalFromFirestore(id: string): Promise<boolean> {
  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(id).delete();
      return true;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Delete fallback:', err.message);
    }
  }
  await deleteDoc(doc(clientDb, 'signals', id));
  return true;
}

export async function updateSignalStatusInFirestore(
  id: string,
  status: string,
  pips?: number
): Promise<boolean> {
  const updateData: any = { status };
  if (pips !== undefined) updateData.pips = pips;

  if (adminDb) {
    try {
      await adminDb.collection('signals').doc(id).update(updateData);
      return true;
    } catch (err: any) {
      console.warn('[Firebase Admin SDK] Update fallback:', err.message);
    }
  }
  await updateDoc(doc(clientDb, 'signals', id), updateData);
  return true;
}

// Seed initial signals into Firestore if collection has < 3 signals (DISABLED: No auto-seeding)
export async function seedInitialSignalsIfEmpty(): Promise<void> {
  console.log('[Firestore] Auto-seeding disabled. No initial mock signals will be pushed.');
}

// Seed initial market ideas into Firestore if collection has < 3 documents (DISABLED: No auto-seeding)
export async function seedInitialMarketIdeasIfEmpty(): Promise<void> {
  console.log('[Firestore] Auto-seeding disabled. No initial mock market ideas will be pushed.');
}
