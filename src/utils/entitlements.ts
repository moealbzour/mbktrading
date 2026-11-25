import { UserProfile } from '../types/trading';

export type SubscriptionTier = 'free' | 'vip' | 'elite';

export type FeatureKey =
  | 'botSignals'
  | 'vipSignals'
  | 'vipChat'
  | 'standardAi'
  | 'publishAnalysis';

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
    labelAr: 'بوت MBK',
    labelEn: 'MBK Bot',
    descriptionAr: 'وصول كامل لتنبيهات بوت MBK الفورية',
    descriptionEn: 'Full access to live MBK Bot alerts'
  },
  {
    key: 'vipSignals',
    labelAr: 'توصيات VIP',
    labelEn: 'VIP Signals',
    descriptionAr: 'فتح جميع التوصيات ونقاط الدخول والأهداف ووقف الخسارة',
    descriptionEn: 'Unlocks all active entry levels, take-profits, and stop-losses'
  },
  {
    key: 'vipChat',
    labelAr: 'الشات العام',
    labelEn: 'General Chat',
    descriptionAr: 'دخول ومشاركة في الشات العام للأعضاء',
    descriptionEn: 'Read and post messages in General Chat'
  },
  {
    key: 'standardAi',
    labelAr: 'ذكاء MBK',
    labelEn: 'MBK AI',
    descriptionAr: 'محادثة ذكية تفاعلية فورية للتحليل',
    descriptionEn: 'Interactive AI assistant inside the workspace'
  },
  {
    key: 'publishAnalysis',
    labelAr: 'نشر التحليلات',
    labelEn: 'Publish Analysis',
    descriptionAr: 'صلاحية إضافة ونشر تحليلات وصور الشارت في قسم التحليلات',
    descriptionEn: 'Permission to publish market analysis & chart images in the Analysis tab'
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
    titleAr: 'مؤشرات MBK الحصرية',
    titleEn: 'MBK Indicators',
    subtitleAr: 'حزمة مؤشرات MBK الخاصة بالسيولة والاتجاه',
    subtitleEn: 'Exclusive MBK liquidity & trend indicator suite'
  }
];

export const ELITE_LOCK_BADGE_TEXT = 'مخصص لباقة Elite - قيد التطوير / Coming Soon';

function parseExpiryMs(val?: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
  }
  return 0;
}

function pickLatestExpiryIso(...candidates: Array<any>): string | null {
  let bestMs = 0;
  let bestIso: string | null = null;
  for (const c of candidates) {
    const ms = parseExpiryMs(c);
    if (ms > bestMs) {
      bestMs = ms;
      bestIso = typeof c === 'string' ? c : new Date(ms).toISOString();
    }
  }
  return bestIso;
}

function isTimestampActive(isoOrMs?: any): boolean {
  const ms = parseExpiryMs(isoOrMs);
  return ms > Date.now();
}

export function isStaffOrAdminUser(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  if (user.isAdmin || user.isStaff) return true;
  const role = (user.role || '').toString().toUpperCase();
  if (['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(role)) return true;
  const staffRole = (user.staffRole || '').toString().toLowerCase();
  if (staffRole && staffRole !== 'none') return true;
  if (user.permissions && typeof user.permissions === 'object') {
    if (Object.values(user.permissions).some(Boolean)) return true;
  }
  return false;
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

  const eliteExpiry = pickLatestExpiryIso(
    user.eliteExpiryDate,
    user.subscriptionEndDate,
    user.vipExpiryDate
  );
  const vipExpiry = pickLatestExpiryIso(
    user.vipExpiryDate,
    user.subscriptionEndDate,
    user.eliteExpiryDate
  );

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
      (k === 'botSignals' ||
        k === 'vipSignals' ||
        k === 'vipChat' ||
        k === 'standardAi' ||
        k === 'publishAnalysis') &&
      typeof exp === 'string' &&
      isTimestampActive(exp)
    ) {
      active.push({ key: k as FeatureKey, expiryDate: exp });
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
  if (feature === 'vipChat') return true;

  // Publishing Market Analysis is strictly limited to Admins, canPostAnalysis staff, or explicit publishAnalysis grants
  if (feature === 'publishAnalysis') {
    const roleUpper = (user.role || '').toString().toUpperCase();
    const staffRoleLower = (user.staffRole || '').toString().toLowerCase();
    const hasExplicitPerms =
      user.permissions && typeof user.permissions === 'object' && Object.keys(user.permissions).length > 0;
    const isAdminOrAnalyst =
      Boolean(user.isAdmin) ||
      user.email?.toLowerCase() === 'moe.albzour@gmail.com' ||
      roleUpper === 'ADMIN' ||
      staffRoleLower === 'super_admin' ||
      Boolean(user.permissions?.canManageSystem) ||
      Boolean(user.permissions?.canPostAnalysis) ||
      (!hasExplicitPerms &&
        (staffRoleLower === 'market_analyst' || roleUpper === 'ANALYSER' || roleUpper === 'ANALYST'));

    if (isAdminOrAnalyst) return true;

    const grantExpiry = user.grantedFeatures?.publishAnalysis;
    return Boolean(grantExpiry && isTimestampActive(grantExpiry));
  }

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
