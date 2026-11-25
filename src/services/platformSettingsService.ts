import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, reportFirestoreError } from '../utils/firestoreError';

export interface PlatformContactSettings {
  whatsappNumber: string;
  telegramUrl: string;
  supportEmail: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformContactSettings = {
  whatsappNumber: '',
  telegramUrl: '',
  supportEmail: 'support@mbktrading.live'
};

export function extractWhatsAppDigits(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

export function buildWhatsAppUrl(rawNumber: string, prefillText?: string): string {
  const digits = extractWhatsAppDigits(rawNumber);
  if (!digits || digits.length < 7) return '';
  const query = prefillText ? `?text=${encodeURIComponent(prefillText)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function normalizeTelegramUrl(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(t\.me|telegram\.me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  const cleanHandle = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9_/+]/g, '');
  return cleanHandle ? `https://t.me/${cleanHandle}` : '';
}

export function formatTelegramHandle(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return trimmed;
  const match = trimmed.match(/(?:t\.me|telegram\.me)\/([^/?#]+)/i);
  if (match && match[1]) {
    return match[1].startsWith('+') ? trimmed : `@${match[1]}`;
  }
  return `@${trimmed.replace(/^@+/, '')}`;
}

function mapDocToSettings(data?: Record<string, any>): PlatformContactSettings {
  if (!data) return { ...DEFAULT_PLATFORM_SETTINGS };
  return {
    whatsappNumber: typeof data.whatsappNumber === 'string' ? data.whatsappNumber.trim() : '',
    telegramUrl: typeof data.telegramUrl === 'string' ? data.telegramUrl.trim() : '',
    supportEmail:
      typeof data.supportEmail === 'string' && data.supportEmail.trim()
        ? data.supportEmail.trim()
        : DEFAULT_PLATFORM_SETTINGS.supportEmail,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined
  };
}

let cachedPlatformSettings: PlatformContactSettings | null = null;
let cachedPlatformSettingsAtMs = 0;
const PLATFORM_SETTINGS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const platformSettingsSubscribers = new Set<(settings: PlatformContactSettings) => void>();

export async function fetchPlatformSettings(
  forceRefresh: boolean = false
): Promise<PlatformContactSettings> {
  const nowMs = Date.now();
  if (
    !forceRefresh &&
    cachedPlatformSettings &&
    nowMs - cachedPlatformSettingsAtMs < PLATFORM_SETTINGS_CACHE_TTL_MS
  ) {
    return { ...cachedPlatformSettings };
  }
  const ref = doc(db, 'settings', 'platform');
  try {
    const snap = await getDoc(ref);
    const resolved = snap.exists()
      ? mapDocToSettings(snap.data())
      : { ...DEFAULT_PLATFORM_SETTINGS };
    cachedPlatformSettings = resolved;
    cachedPlatformSettingsAtMs = Date.now();
    return { ...resolved };
  } catch (err) {
    console.warn('[PlatformSettings] Could not fetch settings/platform:', err);
    return cachedPlatformSettings ? { ...cachedPlatformSettings } : { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export function subscribeToPlatformSettings(
  onChange: (settings: PlatformContactSettings) => void
): () => void {
  platformSettingsSubscribers.add(onChange);
  if (cachedPlatformSettings) {
    onChange({ ...cachedPlatformSettings });
  }
  fetchPlatformSettings(false)
    .then((resolved) => {
      onChange(resolved);
    })
    .catch(() => {
      onChange(cachedPlatformSettings || { ...DEFAULT_PLATFORM_SETTINGS });
    });

  return () => {
    platformSettingsSubscribers.delete(onChange);
  };
}

export async function savePlatformSettings(
  input: Pick<PlatformContactSettings, 'whatsappNumber' | 'telegramUrl' | 'supportEmail'>
): Promise<PlatformContactSettings> {
  const cleanWhatsapp = (input.whatsappNumber || '').trim().slice(0, 40);
  const cleanTelegram = normalizeTelegramUrl(input.telegramUrl || '').slice(0, 300);
  const cleanEmail = (input.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail).trim().slice(0, 200);

  const payload: PlatformContactSettings = {
    whatsappNumber: cleanWhatsapp,
    telegramUrl: cleanTelegram,
    supportEmail: cleanEmail,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin'
  };

  try {
    await setDoc(doc(db, 'settings', 'platform'), payload);
    cachedPlatformSettings = payload;
    cachedPlatformSettingsAtMs = Date.now();
    platformSettingsSubscribers.forEach((cb) => {
      try {
        cb({ ...payload });
      } catch {
        // ignore
      }
    });
    return payload;
  } catch (err) {
    const { message } = reportFirestoreError(err, OperationType.WRITE, 'settings/platform');
    throw new Error(message);
  }
}

export interface PlanPricingSettings {
  vipMonthlyUsd: number;
  eliteMonthlyUsd: number;
  syncToPublicPlans: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLAN_PRICING: PlanPricingSettings = {
  vipMonthlyUsd: 45,
  eliteMonthlyUsd: 90,
  syncToPublicPlans: false
};

let cachedPlanPricing: PlanPricingSettings | null = null;

function mapDocToPlanPricing(data?: Record<string, any>): PlanPricingSettings {
  if (!data) return { ...DEFAULT_PLAN_PRICING };
  const rawVip = Number(data.vipMonthlyUsd);
  const rawElite = Number(data.eliteMonthlyUsd);
  return {
    vipMonthlyUsd:
      Number.isFinite(rawVip) && rawVip >= 0 ? Math.round(rawVip * 100) / 100 : DEFAULT_PLAN_PRICING.vipMonthlyUsd,
    eliteMonthlyUsd:
      Number.isFinite(rawElite) && rawElite >= 0
        ? Math.round(rawElite * 100) / 100
        : DEFAULT_PLAN_PRICING.eliteMonthlyUsd,
    syncToPublicPlans: Boolean(data.syncToPublicPlans),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined
  };
}

export function getCachedPlanPricingSettings(): PlanPricingSettings {
  return cachedPlanPricing ? { ...cachedPlanPricing } : { ...DEFAULT_PLAN_PRICING };
}

export async function fetchPlanPricingSettings(
  forceRefresh: boolean = false
): Promise<PlanPricingSettings> {
  if (!forceRefresh && cachedPlanPricing) {
    return { ...cachedPlanPricing };
  }
  const ref = doc(db, 'settings', 'pricing');
  try {
    const snap = await getDoc(ref);
    const resolved = snap.exists()
      ? mapDocToPlanPricing(snap.data())
      : { ...DEFAULT_PLAN_PRICING };
    cachedPlanPricing = resolved;
    return { ...resolved };
  } catch (err) {
    console.warn('[PlatformSettings] Could not fetch settings/pricing:', err);
    return cachedPlanPricing ? { ...cachedPlanPricing } : { ...DEFAULT_PLAN_PRICING };
  }
}

export async function savePlanPricingSettings(
  input: Pick<PlanPricingSettings, 'vipMonthlyUsd' | 'eliteMonthlyUsd' | 'syncToPublicPlans'>
): Promise<PlanPricingSettings> {
  const cleanVip = Math.min(
    100000,
    Math.max(0, Math.round((Number(input.vipMonthlyUsd) || 0) * 100) / 100)
  );
  const cleanElite = Math.min(
    100000,
    Math.max(0, Math.round((Number(input.eliteMonthlyUsd) || 0) * 100) / 100)
  );

  const payload: PlanPricingSettings = {
    vipMonthlyUsd: cleanVip,
    eliteMonthlyUsd: cleanElite,
    syncToPublicPlans: Boolean(input.syncToPublicPlans),
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin'
  };

  try {
    await setDoc(doc(db, 'settings', 'pricing'), payload);
    cachedPlanPricing = payload;
    return { ...payload };
  } catch (err) {
    const { message } = reportFirestoreError(err, OperationType.WRITE, 'settings/pricing');
    throw new Error(message);
  }
}

