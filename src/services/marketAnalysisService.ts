import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AnalysisDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface MarketAnalysisPost {
  id: string;
  titleAr: string;
  titleEn: string;
  symbol: string;
  timeframe: string;
  direction: AnalysisDirection;
  summaryAr: string;
  summaryEn: string;
  imageUrl?: string;
  targetPrice?: string;
  invalidationLevel?: string;
  authorUid: string;
  authorName: string;
  authorRole: string;
  isPublished: boolean;
  timestampMs: number;
}

const ANALYSIS_CACHE_KEY = 'mbk_market_analysis_cache_v1';
const ANALYSIS_CACHE_TTL_MS = 3 * 60 * 1000;

let memoryCachedAnalysis: MarketAnalysisPost[] | null = null;
let memoryCacheTimestampMs = 0;

function normalizeDirection(raw: unknown): AnalysisDirection {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'BEARISH' || val === 'SELL' || val === 'SHORT') return 'BEARISH';
  if (val === 'NEUTRAL' || val === 'RANGE') return 'NEUTRAL';
  return 'BULLISH';
}

export function mapDocToMarketAnalysis(docId: string, d: Record<string, any>): MarketAnalysisPost {
  const titleAr = String(d.titleAr || d.title || '').trim();
  const titleEn = String(d.titleEn || d.title || titleAr).trim();
  const summaryAr = String(d.summaryAr || d.descriptionAr || d.summary || '').trim();
  const summaryEn = String(d.summaryEn || d.descriptionEn || summaryAr).trim();

  return {
    id: docId,
    titleAr: titleAr || titleEn || 'تحليل السوق — MBK',
    titleEn: titleEn || titleAr || 'MBK Market Analysis',
    symbol: String(d.symbol || 'XAUUSD').trim().toUpperCase(),
    timeframe: String(d.timeframe || '4H').trim(),
    direction: normalizeDirection(d.direction),
    summaryAr,
    summaryEn,
    imageUrl: d.imageUrl ? String(d.imageUrl).trim() : undefined,
    targetPrice: d.targetPrice ? String(d.targetPrice).trim() : undefined,
    invalidationLevel: d.invalidationLevel ? String(d.invalidationLevel).trim() : undefined,
    authorUid: String(d.authorUid || 'mbktrading').trim(),
    authorName: String(d.authorName || 'MBK Desk').trim(),
    authorRole: String(d.authorRole || 'ADMIN').trim().toUpperCase(),
    isPublished: d.isPublished !== false,
    timestampMs: Number(d.timestampMs || Date.now())
  };
}

export function invalidateMarketAnalysisCache(): void {
  memoryCachedAnalysis = null;
  memoryCacheTimestampMs = 0;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ANALYSIS_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

export async function fetchMarketAnalysisPosts(
  forceRefresh: boolean = false
): Promise<MarketAnalysisPost[]> {
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    memoryCachedAnalysis !== null &&
    nowMs - memoryCacheTimestampMs < ANALYSIS_CACHE_TTL_MS
  ) {
    return memoryCachedAnalysis;
  }

  try {
    const q = query(
      collection(db, 'market_analysis'),
      orderBy('timestampMs', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    const list: MarketAnalysisPost[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        list.push(mapDocToMarketAnalysis(docSnap.id, data));
      }
    });
    list.sort((a, b) => b.timestampMs - a.timestampMs);
    memoryCachedAnalysis = list;
    memoryCacheTimestampMs = Date.now();
    return list;
  } catch (err) {
    console.warn('[MarketAnalysisService] Could not fetch market_analysis:', err);
    return memoryCachedAnalysis || [];
  }
}

export function subscribeToMarketAnalysisPosts(
  onUpdate: (posts: MarketAnalysisPost[]) => void
): () => void {
  const q = query(
    collection(db, 'market_analysis'),
    orderBy('timestampMs', 'desc'),
    limit(25)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: MarketAnalysisPost[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push(mapDocToMarketAnalysis(docSnap.id, data));
        }
      });
      list.sort((a, b) => b.timestampMs - a.timestampMs);
      memoryCachedAnalysis = list;
      memoryCacheTimestampMs = Date.now();
      onUpdate(list);
    },
    (err) => {
      console.warn('[MarketAnalysisService] Snapshot error:', err?.message || err);
    }
  );
}

export async function saveMarketAnalysisPost(
  input: Partial<MarketAnalysisPost> & {
    titleAr: string;
    summaryAr: string;
    authorUid: string;
    authorName: string;
    authorRole?: string;
  }
): Promise<MarketAnalysisPost> {
  const nowMs = Date.now();
  const cleanId =
    input.id && /^[a-zA-Z0-9_-]+$/.test(input.id.trim())
      ? input.id.trim()
      : `analysis-${nowMs}-${Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, '0')}`;

  const titleAr = input.titleAr.trim().slice(0, 180);
  const titleEn = (input.titleEn || titleAr).trim().slice(0, 180);
  const summaryAr = input.summaryAr.trim().slice(0, 4000);
  const summaryEn = (input.summaryEn || summaryAr).trim().slice(0, 4000);

  const post: MarketAnalysisPost = {
    id: cleanId,
    titleAr,
    titleEn,
    symbol: (input.symbol || 'XAUUSD').trim().toUpperCase().slice(0, 24),
    timeframe: (input.timeframe || '4H').trim().slice(0, 16),
    direction: normalizeDirection(input.direction),
    summaryAr,
    summaryEn,
    ...(input.imageUrl && input.imageUrl.trim() ? { imageUrl: input.imageUrl.trim() } : {}),
    ...(input.targetPrice && input.targetPrice.trim()
      ? { targetPrice: input.targetPrice.trim().slice(0, 60) }
      : {}),
    ...(input.invalidationLevel && input.invalidationLevel.trim()
      ? { invalidationLevel: input.invalidationLevel.trim().slice(0, 60) }
      : {}),
    authorUid: input.authorUid.trim(),
    authorName: input.authorName.trim().slice(0, 80) || 'MBK Desk',
    authorRole: (input.authorRole || 'ADMIN').trim().toUpperCase(),
    isPublished: input.isPublished !== false,
    timestampMs: input.timestampMs && input.timestampMs > 0 ? input.timestampMs : nowMs
  };

  await setDoc(doc(db, 'market_analysis', cleanId), post);
  invalidateMarketAnalysisCache();
  return post;
}

export async function deleteMarketAnalysisPost(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'market_analysis', id));
  invalidateMarketAnalysisCache();
}
