import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { emitBackgroundNotificationPulse } from '../utils/mobileNotifications';

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
const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes quota-safe cache (0 background listeners)

let memoryCachedAnalysis: MarketAnalysisPost[] | null = null;
let memoryCacheTimestampMs = 0;
let inFlightAnalysisPromise: Promise<MarketAnalysisPost[]> | null = null;

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

function readLocalCache(nowMs: number): MarketAnalysisPost[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ANALYSIS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.cachedAtMs === 'number' &&
      nowMs - parsed.cachedAtMs < ANALYSIS_CACHE_TTL_MS &&
      Array.isArray(parsed.posts)
    ) {
      return parsed.posts;
    }
  } catch {
    // ignore storage read error
  }
  return null;
}

function writeLocalCache(posts: MarketAnalysisPost[], nowMs: number): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      ANALYSIS_CACHE_KEY,
      JSON.stringify({
        cachedAtMs: nowMs,
        posts
      })
    );
  } catch {
    // ignore storage quota notice
  }
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

/**
 * Quota-safe one-shot fetch of Market Analysis posts from Firestore `market_analysis`.
 * Caches results in memory + localStorage for 10 minutes with ZERO permanent background listeners.
 */
export async function fetchMarketAnalysisPosts(
  forceRefresh: boolean = false
): Promise<MarketAnalysisPost[]> {
  const nowMs = Date.now();

  if (!forceRefresh) {
    if (
      memoryCachedAnalysis !== null &&
      nowMs - memoryCacheTimestampMs < ANALYSIS_CACHE_TTL_MS
    ) {
      return memoryCachedAnalysis;
    }

    const localHit = readLocalCache(nowMs);
    if (localHit !== null) {
      memoryCachedAnalysis = localHit;
      memoryCacheTimestampMs = nowMs;
      return localHit;
    }
  }

  if (inFlightAnalysisPromise) {
    return inFlightAnalysisPromise;
  }

  inFlightAnalysisPromise = (async () => {
    try {
      const q = query(
        collection(db, 'market_analysis'),
        orderBy('timestampMs', 'desc'),
        limit(15)
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
      const completedAt = Date.now();
      memoryCachedAnalysis = list;
      memoryCacheTimestampMs = completedAt;
      writeLocalCache(list, completedAt);
      return list;
    } catch (err) {
      console.warn('[MarketAnalysisService] Could not fetch market_analysis:', err);
      return memoryCachedAnalysis || [];
    } finally {
      inFlightAnalysisPromise = null;
    }
  })();

  return inFlightAnalysisPromise;
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

  if (post.isPublished) {
    emitBackgroundNotificationPulse({
      title: `📊 تحليل جديد (${post.symbol} - ${post.timeframe}): ${post.titleAr}`,
      body: post.summaryAr.slice(0, 180),
      tag: `mbk-analysis-${post.id}`,
      excludeUid: post.authorUid
    });
  }

  return post;
}

export async function deleteMarketAnalysisPost(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'market_analysis', id));
  invalidateMarketAnalysisCache();
}
