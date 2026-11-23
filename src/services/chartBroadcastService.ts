import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface SerializedOverlayPoint {
  timestamp?: number;
  dataIndex?: number;
  value?: number;
}

export interface SerializedOverlay {
  name: string;
  points: SerializedOverlayPoint[];
  styles?: Record<string, any> | null;
  extendData?: any;
}

export interface ActiveChartSetupSignal {
  side: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  sweepPrice?: number;
  noteAr?: string;
  noteEn?: string;
  atr?: number;
  rrText?: string;
  updatedAt: number;
}

export interface AdminChartSetupDoc {
  symbol: string;
  timeframe: string;
  overlays: SerializedOverlay[];
  activeSetup?: ActiveChartSetupSignal | null;
  updatedBy: string;
  updatedAt: number;
}

const USER_DRAWINGS_PREFIX = 'mbk_user_drawings_v1_';
const ADMIN_SETUP_CACHE_TTL_MS = 60_000;
const adminSetupMemoryCache = new Map<string, { expiresAt: number; data: AdminChartSetupDoc | null }>();

export function normalizeChartSymbol(symbol: string): string {
  const s = String(symbol || 'XAUUSD').trim().toUpperCase();
  if (s.includes('XAU') || s.includes('GOLD')) return 'XAUUSD';
  if (s.includes('US100') || s.includes('NAS') || s.includes('NDX')) return 'US100';
  if (s.includes('BTC')) return 'BTCUSD';
  if (s.includes('EUR')) return 'EURUSD';
  if (s.includes('GBP')) return 'GBPUSD';
  if (s.includes('WTI') || s.includes('OIL')) return 'WTI';
  return s || 'XAUUSD';
}

/**
 * Personal Drawings (localStorage — 0 Firestore Reads)
 */
export function loadUserDrawings(symbol: string): SerializedOverlay[] {
  if (typeof window === 'undefined') return [];
  const norm = normalizeChartSymbol(symbol);
  try {
    const raw = window.localStorage.getItem(`${USER_DRAWINGS_PREFIX}${norm}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.name === 'string' &&
        Array.isArray(item.points) &&
        item.points.length > 0
    );
  } catch {
    return [];
  }
}

export function saveUserDrawings(symbol: string, overlays: SerializedOverlay[]): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeChartSymbol(symbol);
  try {
    const clean: SerializedOverlay[] = (overlays || [])
      .filter((o) => o && typeof o.name === 'string' && Array.isArray(o.points) && o.points.length > 0)
      .map((o) => ({
        name: o.name,
        points: o.points.map((pt) => ({
          ...(typeof pt.timestamp === 'number' && Number.isFinite(pt.timestamp) ? { timestamp: pt.timestamp } : {}),
          ...(typeof pt.dataIndex === 'number' && Number.isFinite(pt.dataIndex) ? { dataIndex: pt.dataIndex } : {}),
          ...(typeof pt.value === 'number' && Number.isFinite(pt.value) ? { value: pt.value } : {}),
        })),
        ...(o.styles ? { styles: o.styles } : {}),
        ...(o.extendData !== undefined ? { extendData: o.extendData } : {}),
      }));
    window.localStorage.setItem(`${USER_DRAWINGS_PREFIX}${norm}`, JSON.stringify(clean));
  } catch {
    // Ignore quota errors in private browsing
  }
}

/**
 * Fetch Admin Master Chart Setup with 60s in-memory cache
 */
export async function fetchAdminChartSetup(symbol: string, forceRefresh = false): Promise<AdminChartSetupDoc | null> {
  const norm = normalizeChartSymbol(symbol);
  const now = Date.now();
  const cached = adminSetupMemoryCache.get(norm);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const docRef = doc(db, 'chart_setups', norm);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      adminSetupMemoryCache.set(norm, { expiresAt: now + ADMIN_SETUP_CACHE_TTL_MS, data: null });
      return null;
    }
    const raw = snap.data() as AdminChartSetupDoc;
    const data: AdminChartSetupDoc = {
      symbol: raw.symbol || norm,
      timeframe: raw.timeframe || '5m',
      overlays: Array.isArray(raw.overlays) ? raw.overlays : [],
      activeSetup: raw.activeSetup || null,
      updatedBy: raw.updatedBy || 'MBK Admin',
      updatedAt: Number(raw.updatedAt || now),
    };
    adminSetupMemoryCache.set(norm, { expiresAt: now + ADMIN_SETUP_CACHE_TTL_MS, data });
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

/**
 * Subscribe to Admin Master Chart Setup (1 single doc listener ONLY while Pro Chart tab is mounted)
 */
export function subscribeAdminChartSetup(
  symbol: string,
  callback: (setup: AdminChartSetupDoc | null) => void
): () => void {
  const norm = normalizeChartSymbol(symbol);
  const docRef = doc(db, 'chart_setups', norm);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      const now = Date.now();
      if (!snap.exists()) {
        adminSetupMemoryCache.set(norm, { expiresAt: now + ADMIN_SETUP_CACHE_TTL_MS, data: null });
        callback(null);
        return;
      }
      const raw = snap.data() as AdminChartSetupDoc;
      const data: AdminChartSetupDoc = {
        symbol: raw.symbol || norm,
        timeframe: raw.timeframe || '5m',
        overlays: Array.isArray(raw.overlays) ? raw.overlays : [],
        activeSetup: raw.activeSetup || null,
        updatedBy: raw.updatedBy || 'MBK Admin',
        updatedAt: Number(raw.updatedAt || now),
      };
      adminSetupMemoryCache.set(norm, { expiresAt: now + ADMIN_SETUP_CACHE_TTL_MS, data });
      callback(data);
    },
    () => {
      // On permission/network error, fall back gracefully without crashing
      callback(adminSetupMemoryCache.get(norm)?.data ?? null);
    }
  );

  return unsubscribe;
}

/**
 * Publish Admin Master Chart Setup (Drawings and/or Active Signal) to chart_setups/{symbol}
 */
export async function publishAdminChartSetup(
  symbol: string,
  payload: {
    timeframe: string;
    overlays?: SerializedOverlay[];
    activeSetup?: ActiveChartSetupSignal | null;
    updatedBy?: string;
  }
): Promise<AdminChartSetupDoc> {
  const norm = normalizeChartSymbol(symbol);
  const existing = await fetchAdminChartSetup(norm, true);
  const now = Date.now();
  const currentUser = auth.currentUser;
  const authorName =
    payload.updatedBy ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'MBK Admin';

  const cleanOverlays = (payload.overlays !== undefined ? payload.overlays : existing?.overlays || []).map((o) => ({
    name: String(o.name || 'segment'),
    points: (o.points || []).map((pt) => ({
      ...(typeof pt.timestamp === 'number' && Number.isFinite(pt.timestamp) ? { timestamp: pt.timestamp } : {}),
      ...(typeof pt.dataIndex === 'number' && Number.isFinite(pt.dataIndex) ? { dataIndex: pt.dataIndex } : {}),
      ...(typeof pt.value === 'number' && Number.isFinite(pt.value) ? { value: pt.value } : {}),
    })),
    ...(o.styles ? { styles: JSON.parse(JSON.stringify(o.styles)) } : {}),
    ...(o.extendData !== undefined ? { extendData: o.extendData } : {}),
  }));

  const nextActiveSetup =
    payload.activeSetup !== undefined ? payload.activeSetup : existing?.activeSetup ?? null;

  const docData: AdminChartSetupDoc = {
    symbol: norm,
    timeframe: payload.timeframe || existing?.timeframe || '5m',
    overlays: cleanOverlays,
    activeSetup: nextActiveSetup
      ? {
          side: nextActiveSetup.side,
          entry: Number(nextActiveSetup.entry),
          sl: Number(nextActiveSetup.sl),
          ...(nextActiveSetup.tp1 !== undefined && Number.isFinite(Number(nextActiveSetup.tp1))
            ? { tp1: Number(nextActiveSetup.tp1) }
            : {}),
          ...(nextActiveSetup.tp2 !== undefined && Number.isFinite(Number(nextActiveSetup.tp2))
            ? { tp2: Number(nextActiveSetup.tp2) }
            : {}),
          ...(nextActiveSetup.tp3 !== undefined && Number.isFinite(Number(nextActiveSetup.tp3))
            ? { tp3: Number(nextActiveSetup.tp3) }
            : {}),
          ...(nextActiveSetup.sweepPrice !== undefined && Number.isFinite(Number(nextActiveSetup.sweepPrice))
            ? { sweepPrice: Number(nextActiveSetup.sweepPrice) }
            : {}),
          ...(nextActiveSetup.noteAr ? { noteAr: String(nextActiveSetup.noteAr).slice(0, 300) } : {}),
          ...(nextActiveSetup.noteEn ? { noteEn: String(nextActiveSetup.noteEn).slice(0, 300) } : {}),
          ...(nextActiveSetup.atr !== undefined && Number.isFinite(Number(nextActiveSetup.atr))
            ? { atr: Number(nextActiveSetup.atr) }
            : {}),
          ...(nextActiveSetup.rrText ? { rrText: String(nextActiveSetup.rrText).slice(0, 32) } : {}),
          updatedAt: now,
        }
      : null,
    updatedBy: authorName,
    updatedAt: now,
  };

  await setDoc(doc(db, 'chart_setups', norm), docData);
  adminSetupMemoryCache.set(norm, { expiresAt: now + ADMIN_SETUP_CACHE_TTL_MS, data: docData });
  return docData;
}

/**
 * Clear Admin Master Chart Setup (either active signal only, drawings only, or full doc)
 */
export async function clearAdminChartSetup(
  symbol: string,
  mode: 'all' | 'signal' | 'drawings' = 'all'
): Promise<void> {
  const norm = normalizeChartSymbol(symbol);
  if (mode === 'all') {
    await deleteDoc(doc(db, 'chart_setups', norm));
    adminSetupMemoryCache.set(norm, { expiresAt: Date.now() + ADMIN_SETUP_CACHE_TTL_MS, data: null });
    return;
  }

  const existing = await fetchAdminChartSetup(norm, true);
  if (!existing) return;

  await publishAdminChartSetup(norm, {
    timeframe: existing.timeframe,
    overlays: mode === 'drawings' ? [] : existing.overlays,
    activeSetup: mode === 'signal' ? null : existing.activeSetup,
  });
}
