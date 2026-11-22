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

export type StoreProductCategory = 'indicator' | 'algo_bot' | 'bundle' | 'tool';
export type StoreBillingCycle = 'one_time' | 'monthly' | 'yearly' | 'free_for_elite';

export interface StoreProduct {
  id: string;
  titleAr: string;
  titleEn: string;
  category: StoreProductCategory;
  platform: string;
  markets: string[];
  priceUsd: number;
  billingCycle: StoreBillingCycle;
  includedInElite: boolean;
  shortDescAr: string;
  shortDescEn: string;
  featuresAr: string[];
  featuresEn: string[];
  imageUrl?: string;
  demoUrl?: string;
  checkoutUrl?: string;
  badgeTextAr?: string;
  badgeTextEn?: string;
  isPublished: boolean;
  sortOrder: number;
  timestampMs: number;
}

const STORE_CACHE_KEY = 'mbk_store_products_cache_v1';
const STORE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let memoryCachedProducts: StoreProduct[] | null = null;
let memoryCacheTimestampMs = 0;
let inFlightProductsPromise: Promise<StoreProduct[]> | null = null;

function normalizeCategory(raw: unknown): StoreProductCategory {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'algo_bot' || val === 'bot') return 'algo_bot';
  if (val === 'bundle') return 'bundle';
  if (val === 'tool') return 'tool';
  return 'indicator';
}

function normalizeBillingCycle(raw: unknown): StoreBillingCycle {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'monthly') return 'monthly';
  if (val === 'yearly') return 'yearly';
  if (val === 'free_for_elite') return 'free_for_elite';
  return 'one_time';
}

function mapDocToStoreProduct(docId: string, d: Record<string, any>): StoreProduct {
  const titleAr = String(d.titleAr || d.title || '').trim();
  const titleEn = String(d.titleEn || d.title || titleAr).trim();
  const shortDescAr = String(d.shortDescAr || d.descriptionAr || '').trim();
  const shortDescEn = String(d.shortDescEn || d.descriptionEn || shortDescAr).trim();

  const markets = Array.isArray(d.markets)
    ? d.markets.map((m: unknown) => String(m || '').trim().toUpperCase()).filter(Boolean)
    : ['XAUUSD', 'US100'];

  const featuresAr = Array.isArray(d.featuresAr)
    ? d.featuresAr.map((f: unknown) => String(f || '').trim()).filter(Boolean)
    : [];

  const featuresEn = Array.isArray(d.featuresEn)
    ? d.featuresEn.map((f: unknown) => String(f || '').trim()).filter(Boolean)
    : featuresAr;

  return {
    id: docId,
    titleAr: titleAr || titleEn || 'MBK Product',
    titleEn: titleEn || titleAr || 'MBK Product',
    category: normalizeCategory(d.category),
    platform: String(d.platform || 'TradingView (Pine Script)').trim(),
    markets,
    priceUsd: Math.max(0, Number(d.priceUsd ?? 0) || 0),
    billingCycle: normalizeBillingCycle(d.billingCycle),
    includedInElite: Boolean(d.includedInElite),
    shortDescAr,
    shortDescEn,
    featuresAr,
    featuresEn,
    imageUrl: d.imageUrl ? String(d.imageUrl).trim() : undefined,
    demoUrl: d.demoUrl ? String(d.demoUrl).trim() : undefined,
    checkoutUrl: d.checkoutUrl ? String(d.checkoutUrl).trim() : undefined,
    badgeTextAr: d.badgeTextAr ? String(d.badgeTextAr).trim() : undefined,
    badgeTextEn: d.badgeTextEn ? String(d.badgeTextEn).trim() : undefined,
    isPublished: d.isPublished !== false,
    sortOrder: Number.isFinite(Number(d.sortOrder)) ? Number(d.sortOrder) : 0,
    timestampMs: Number(d.timestampMs || Date.now())
  };
}

function sortProductsList(list: StoreProduct[]): StoreProduct[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return b.timestampMs - a.timestampMs;
  });
}

function readLocalCache(nowMs: number): StoreProduct[] | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.cachedAtMs === 'number' &&
      nowMs - parsed.cachedAtMs < STORE_CACHE_TTL_MS &&
      Array.isArray(parsed.products)
    ) {
      return parsed.products;
    }
  } catch {
    // ignore storage read error
  }
  return null;
}

function writeLocalCache(products: StoreProduct[], nowMs: number): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      STORE_CACHE_KEY,
      JSON.stringify({
        cachedAtMs: nowMs,
        products
      })
    );
  } catch {
    // ignore storage quota notice
  }
}

export function invalidateStoreProductsCache(): void {
  memoryCachedProducts = null;
  memoryCacheTimestampMs = 0;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORE_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Quota-safe one-shot fetch of Store products from Firestore `store_products`.
 * Caches results in memory + localStorage for 10 minutes so switching tabs incurs 0 reads.
 */
export async function fetchStoreProducts(forceRefresh: boolean = false): Promise<StoreProduct[]> {
  const nowMs = Date.now();

  if (!forceRefresh) {
    if (
      memoryCachedProducts !== null &&
      nowMs - memoryCacheTimestampMs < STORE_CACHE_TTL_MS
    ) {
      return memoryCachedProducts;
    }

    const localHit = readLocalCache(nowMs);
    if (localHit !== null) {
      memoryCachedProducts = localHit;
      memoryCacheTimestampMs = nowMs;
      return localHit;
    }
  }

  if (inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  inFlightProductsPromise = (async () => {
    try {
      const q = query(
        collection(db, 'store_products'),
        orderBy('timestampMs', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      const list: StoreProduct[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push(mapDocToStoreProduct(docSnap.id, data));
        }
      });

      const sorted = sortProductsList(list);
      const completedAt = Date.now();
      memoryCachedProducts = sorted;
      memoryCacheTimestampMs = completedAt;
      writeLocalCache(sorted, completedAt);
      return sorted;
    } catch (err) {
      console.warn('[StoreService] Could not fetch store_products:', err);
      return memoryCachedProducts || [];
    } finally {
      inFlightProductsPromise = null;
    }
  })();

  return inFlightProductsPromise;
}

/**
 * Create or update a Store Product in Firestore `store_products` (Admin only) and invalidate cache.
 */
export async function saveStoreProduct(
  input: Partial<StoreProduct> & { titleAr: string; titleEn?: string }
): Promise<StoreProduct> {
  const nowMs = Date.now();
  const cleanId =
    input.id && /^[a-zA-Z0-9_-]+$/.test(input.id.trim())
      ? input.id.trim()
      : `prod-${nowMs}-${Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, '0')}`;

  const titleAr = input.titleAr.trim().slice(0, 160);
  const titleEn = (input.titleEn || titleAr).trim().slice(0, 160);
  const shortDescAr = (input.shortDescAr || '').trim().slice(0, 800);
  const shortDescEn = (input.shortDescEn || shortDescAr).trim().slice(0, 800);

  const markets = Array.isArray(input.markets) && input.markets.length > 0
    ? input.markets.map((m) => m.trim().toUpperCase()).filter(Boolean).slice(0, 12)
    : ['XAUUSD', 'US100'];

  const featuresAr = Array.isArray(input.featuresAr)
    ? input.featuresAr.map((f) => f.trim()).filter(Boolean).slice(0, 12)
    : [];

  const featuresEn = Array.isArray(input.featuresEn) && input.featuresEn.length > 0
    ? input.featuresEn.map((f) => f.trim()).filter(Boolean).slice(0, 12)
    : featuresAr;

  const product: StoreProduct = {
    id: cleanId,
    titleAr,
    titleEn,
    category: normalizeCategory(input.category),
    platform: (input.platform || 'TradingView (Pine Script)').trim().slice(0, 100),
    markets,
    priceUsd: Math.max(0, Number(input.priceUsd ?? 0) || 0),
    billingCycle: normalizeBillingCycle(input.billingCycle),
    includedInElite: Boolean(input.includedInElite),
    shortDescAr,
    shortDescEn,
    featuresAr,
    featuresEn,
    ...(input.imageUrl && input.imageUrl.trim() ? { imageUrl: input.imageUrl.trim() } : {}),
    ...(input.demoUrl && input.demoUrl.trim() ? { demoUrl: input.demoUrl.trim() } : {}),
    ...(input.checkoutUrl && input.checkoutUrl.trim() ? { checkoutUrl: input.checkoutUrl.trim() } : {}),
    ...(input.badgeTextAr && input.badgeTextAr.trim() ? { badgeTextAr: input.badgeTextAr.trim().slice(0, 50) } : {}),
    ...(input.badgeTextEn && input.badgeTextEn.trim() ? { badgeTextEn: input.badgeTextEn.trim().slice(0, 50) } : {}),
    isPublished: input.isPublished !== false,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    timestampMs: input.timestampMs && input.timestampMs > 0 ? input.timestampMs : nowMs
  };

  await setDoc(doc(db, 'store_products', cleanId), product);
  invalidateStoreProductsCache();
  return product;
}

/**
 * Delete a Store Product from Firestore `store_products` (Admin only) and invalidate cache.
 */
export async function deleteStoreProduct(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, 'store_products', id));
  invalidateStoreProductsCache();
}
