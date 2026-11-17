import { UserProfile } from '../types/trading';

export type SubscriptionTier = 'free' | 'vip' | 'elite';

export type FeatureKey =
  | 'botSignals'
  | 'vipSignals'
  | 'vipChat'
  | 'standardAi';

export type EliteModuleKey =
  | 'superAi'
  | 'copyTrading'
  | 'autoBotTrader'
  | 'tradingCourse'
  | 'indicatorsStore';

export interface FeatureMeta {
  key: FeatureKey;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const FEATURE_CATALOG: FeatureMeta[] = [
  {
    key: 'botSignals',
    labelAr: 'إشارات البوت اللحظية (Bot Signals)',
    labelEn: 'Real-Time Bot Signals',
    descriptionAr: 'وصول كامل لتنبيهات وبث البوت الآلي الفوري',
    descriptionEn: 'Full access to real-time algorithmic bot webhook alerts'
  },
  {
    key: 'vipSignals',
    labelAr: 'التوصيات اليدوية الكاملة (VIP Signals)',
    labelEn: 'Full VIP Manual Signals',
    descriptionAr: 'فتح جميع أسعار الدخول والأهداف ووقف الخسارة بدون تشفير',
    descriptionEn: 'Unlocks all active entry levels, take-profits, and stop-losses'
  },
  {
    key: 'vipChat',
    labelAr: 'غرفة شات VIP الخاصة (Private VIP Chat)',
    labelEn: 'Private VIP Group Chat',
    descriptionAr: 'دخول ومشاركة في غرفة النقاش الخاصة بالأعضاء',
    descriptionEn: 'Read and post messages in the private VIP members chat'
  },
  {
    key: 'standardAi',
    labelAr: 'المساعد الذكي القياسي (Standard AI)',
    labelEn: 'Standard AI Assistant',
    descriptionAr: 'محادثة ذكية تفاعلية فورية للأسئلة والتحليل العام',
    descriptionEn: 'Conversational Gemini text assistant inside the workspace'
  }
];

export interface EliteLockedModuleMeta {
  key: EliteModuleKey;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
}

export const ELITE_UNRELEASED_FEATURES: EliteLockedModuleMeta[] = [
  {
    key: 'superAi',
    titleAr: 'المساعد الفائق (Super AI)',
    titleEn: 'Super AI',
    subtitleAr: 'تحليل الشارتات بالرؤية الذكية والمساعد الصوتي المباشر',
    subtitleEn: 'Chart Vision OCR, live voice mentor & portfolio execution AI'
  },
  {
    key: 'copyTrading',
    titleAr: 'نسخ الصفقات (Copy Trading)',
    titleEn: 'Copy Trading',
    subtitleAr: 'ربط ونسخ صفقات المحترفين آلياً على حسابك',
    subtitleEn: 'Automated institutional trade mirroring across your accounts'
  },
  {
    key: 'autoBotTrader',
    titleAr: 'التداول الآلي الكامل (Auto Bot Trader)',
    titleEn: 'Auto Bot Trader',
    subtitleAr: 'تنفيذ صفقات البوت تلقائياً مع إدارة المخاطر وإيقاف التراجع',
    subtitleEn: 'Autonomous MT5/cTrader execution with drawdown guardrails'
  },
  {
    key: 'tradingCourse',
    titleAr: 'الدورة الاحترافية للتداول (Trading Course)',
    titleEn: 'Trading Course',
    subtitleAr: 'منهج مؤسسي متكامل بالفيديو واستراتيجيات السيولة المتقدمة',
    subtitleEn: 'Institutional curriculum covering orderflow & liquidity sweeps'
  },
  {
    key: 'indicatorsStore',
    titleAr: 'متجر المؤشرات الحصرية (Indicators Store)',
    titleEn: 'Indicators Store',
    subtitleAr: 'حزمة مؤشرات Pine Script المؤسسية الحصرية لمنصة TradingView',
    subtitleEn: 'Proprietary Pine Script liquidity & SMC indicator suite'
  }
];

export const ELITE_LOCK_BADGE_TEXT = 'مخصص لباقة Elite - قيد التطوير / Coming Soon';

function isTimestampActive(isoOrMs?: string | number | null): boolean {
  if (!isoOrMs) return false;
  const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  return !Number.isNaN(ms) && ms > Date.now();
}

export function isStaffOrAdminUser(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  if (user.isAdmin || user.isStaff) return true;
  const role = (user.role || '').toString().toUpperCase();
  return ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(role);
}

/**
 * Returns the effective active base tier ('free' | 'vip' | 'elite') for a user.
 * Expired VIP/Elite memberships automatically fall back to 'free'.
 */
export function getEffectiveTier(user?: Partial<UserProfile> | null): SubscriptionTier {
  if (!user) return 'free';
  if (isStaffOrAdminUser(user)) return 'elite';
  if (user.isBanned) return 'free';

  const roleLower = (user.role || '').toString().toLowerCase();
  const tierLower = (user.tier || '').toString().toLowerCase();

  const eliteExpiry = user.eliteExpiryDate || user.subscriptionEndDate || user.vipExpiryDate;
  const vipExpiry = user.vipExpiryDate || user.subscriptionEndDate;

  const eliteActive =
    (tierLower === 'elite' || roleLower === 'elite' || Boolean(user.isElite)) &&
    (!eliteExpiry || isTimestampActive(eliteExpiry));

  if (eliteActive) return 'elite';

  const vipActive =
    (tierLower === 'vip' || roleLower === 'vip' || Boolean(user.isVip) || Boolean(user.vipAccess)) &&
    (!vipExpiry || isTimestampActive(vipExpiry));

  if (vipActive) return 'vip';

  return 'free';
}

export function isTierActive(user: Partial<UserProfile> | null | undefined, minTier: 'vip' | 'elite'): boolean {
  const effective = getEffectiveTier(user);
  if (minTier === 'vip') return effective === 'vip' || effective === 'elite';
  return effective === 'elite';
}

/**
 * Returns active (non-expired) custom feature grants on the user profile.
 */
export function getActiveTrialFeatures(user?: Partial<UserProfile> | null): Array<{
  key: FeatureKey;
  expiryDate: string;
}> {
  if (!user?.grantedFeatures || typeof user.grantedFeatures !== 'object') return [];
  const active: Array<{ key: FeatureKey; expiryDate: string }> = [];
  for (const [k, exp] of Object.entries(user.grantedFeatures)) {
    if (
      (k === 'botSignals' || k === 'vipSignals' || k === 'vipChat' || k === 'standardAi') &&
      typeof exp === 'string' &&
      isTimestampActive(exp)
    ) {
      active.push({ key: k, expiryDate: exp });
    }
  }
  return active;
}

/**
 * Checks whether a user can access a specific VIP/Trial feature either via
 * Admin/Staff role, active VIP/Elite tier, or an active custom feature grant.
 */
export function hasFeatureAccess(user: Partial<UserProfile> | null | undefined, feature: FeatureKey): boolean {
  if (!user || user.isBanned) return false;
  if (isStaffOrAdminUser(user)) return true;

  const tier = getEffectiveTier(user);
  if (tier === 'vip' || tier === 'elite') return true;

  const grantExpiry = user.grantedFeatures?.[feature];
  if (grantExpiry && isTimestampActive(grantExpiry)) {
    return true;
  }

  return false;
}

export function formatExpiryShort(expiry: string | null | undefined, isAr: boolean): string {
  if (!expiry) return isAr ? 'غير محدود' : 'Lifetime';
  const ms = new Date(expiry).getTime();
  if (Number.isNaN(ms)) return isAr ? 'نشط' : 'Active';
  const diffDays = Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return isAr ? 'منتهي' : 'Expired';
  if (diffDays >= 3650) return isAr ? 'مدى الحياة' : 'Lifetime';
  const dateStr = new Date(ms).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return isAr ? `${dateStr} (${diffDays} يوم)` : `${dateStr} (${diffDays}d)`;
}

export function getFeatureLabel(key: FeatureKey, isAr: boolean): string {
  const found = FEATURE_CATALOG.find((f) => f.key === key);
  if (!found) return key;
  return isAr ? found.labelAr : found.labelEn;
}
