import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Clock,
  Crown,
  DollarSign,
  Headphones,
  MessageSquare,
  Phone,
  PieChart,
  Radio,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { soundManager } from '../../utils/audio';
import { formatExpiryShort, getEffectiveTier } from '../../utils/entitlements';
import { hasAnyStaffPermission } from '../../utils/rbac';
import {
  DEFAULT_PLAN_PRICING,
  fetchPlanPricingSettings,
  getCachedPlanPricingSettings,
  PlanPricingSettings
} from '../../services/platformSettingsService';
import type { AdminUserRecord } from './AdminDashboard';

export type AnalyticsTimeframe = '7D' | '30D' | '90D';

interface CachedPlatformActivity {
  fetchedAtMs: number;
  timeframe: AnalyticsTimeframe;
  pushDevicesCount: number;
  openSupportThreadsCount: number;
  signalsTimestamps: Array<{ tsMs: number; isBot: boolean }>;
  chatTimestamps: number[];
  supportTimestamps: number[];
}

// Session-level in-memory cache keyed by timeframe (ZERO onSnapshot listeners)
const sessionAnalyticsCache = new Map<AnalyticsTimeframe, CachedPlatformActivity>();

interface Props {
  users: AdminUserRecord[];
  pushActiveCountFallback: number;
  isAr: boolean;
  canManageUsers: boolean;
  onInspectUser: (user: AdminUserRecord) => void;
  onOpenUsersCrm: () => void;
}

function getTimeframeDays(tf: AnalyticsTimeframe): number {
  if (tf === '7D') return 7;
  if (tf === '30D') return 30;
  return 90;
}

function formatDayKey(tsMs: number): string {
  const d = new Date(tsMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDateLabel(tsMs: number, isAr: boolean): string {
  try {
    return new Date(tsMs).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

export const AdminAnalyticsOverview: React.FC<Props> = ({
  users,
  pushActiveCountFallback,
  isAr,
  canManageUsers,
  onInspectUser,
  onOpenUsersCrm
}) => {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30D');
  const [loadingActivity, setLoadingActivity] = useState<boolean>(false);
  const [activityData, setActivityData] = useState<CachedPlatformActivity | null>(() => {
    return sessionAnalyticsCache.get('30D') || null;
  });
  const [planPricing, setPlanPricing] = useState<PlanPricingSettings>(() =>
    getCachedPlanPricingSettings()
  );
  const [hoveredGrowthIdx, setHoveredGrowthIdx] = useState<number | null>(null);
  const [hoveredActivityIdx, setHoveredActivityIdx] = useState<number | null>(null);

  const loadQuotaSafeActivity = useCallback(
    async (tf: AnalyticsTimeframe, forceRefresh: boolean = false) => {
      if (!forceRefresh && sessionAnalyticsCache.has(tf)) {
        setActivityData(sessionAnalyticsCache.get(tf) || null);
        fetchPlanPricingSettings(false)
          .then((p) => setPlanPricing(p))
          .catch(() => {});
        return;
      }

      setLoadingActivity(true);
      const days = getTimeframeDays(tf);
      const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

      try {
        const pricingPromise = fetchPlanPricingSettings(forceRefresh).catch(() =>
          getCachedPlanPricingSettings()
        );
        // 1. Server aggregation counts (1 read per 1,000 docs via getCountFromServer)
        const pushCountPromise = getCountFromServer(collection(db, 'push_subscriptions'))
          .then((snap) => snap.data().count)
          .catch(() => pushActiveCountFallback);

        const supportCountPromise = getCountFromServer(
          query(
            collection(db, 'dm_conversations'),
            where('participants', 'array-contains', 'mbktrading')
          )
        )
          .then((snap) => snap.data().count)
          .catch(() => 0);

        // 2. Bounded limit(300) + date-cutoff one-time getDocs queries for Chart 3
        const signalsPromise = getDocs(
          query(
            collection(db, 'signals'),
            where('timestampMs', '>=', cutoffMs),
            orderBy('timestampMs', 'desc'),
            limit(300)
          )
        )
          .then((snap) => {
            const list: Array<{ tsMs: number; isBot: boolean }> = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              const tsMs = Number(d.timestampMs || 0);
              if (tsMs >= cutoffMs) {
                const isBot =
                  d.source === 'BOT_WEBHOOK' ||
                  Boolean(d.isBotSignal) ||
                  d.channel === 'bot';
                list.push({ tsMs, isBot });
              }
            });
            return list;
          })
          .catch(() => [] as Array<{ tsMs: number; isBot: boolean }>);

        const botAlertsPromise = getDocs(
          query(
            collection(db, 'bot_alerts'),
            where('timestampMs', '>=', cutoffMs),
            orderBy('timestampMs', 'desc'),
            limit(300)
          )
        )
          .then((snap) => {
            const list: Array<{ tsMs: number; isBot: boolean }> = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              const tsMs = Number(d.timestampMs || 0);
              if (tsMs >= cutoffMs) {
                list.push({ tsMs, isBot: true });
              }
            });
            return list;
          })
          .catch(() => [] as Array<{ tsMs: number; isBot: boolean }>);

        const chatPromise = getDocs(
          query(
            collection(db, 'public_chat'),
            where('timestampMs', '>=', cutoffMs),
            orderBy('timestampMs', 'desc'),
            limit(300)
          )
        )
          .then((snap) => {
            const list: number[] = [];
            snap.forEach((docSnap) => {
              const tsMs = Number(docSnap.data().timestampMs || 0);
              if (tsMs >= cutoffMs) list.push(tsMs);
            });
            return list;
          })
          .catch(() => [] as number[]);

        const supportTicketsPromise = getDocs(
          query(
            collection(db, 'dm_conversations'),
            where('participants', 'array-contains', 'mbktrading'),
            limit(300)
          )
        )
          .then((snap) => {
            const list: number[] = [];
            snap.forEach((docSnap) => {
              const tsMs = Number(docSnap.data().lastMessageAtMs || 0);
              if (tsMs >= cutoffMs) list.push(tsMs);
            });
            return list;
          })
          .catch(() => [] as number[]);

        const [
          fetchedPricing,
          pushDevicesCount,
          openSupportThreadsCount,
          manualAndWebhookSignals,
          rawBotAlerts,
          chatTimestamps,
          supportTimestamps
        ] = await Promise.all([
          pricingPromise,
          pushCountPromise,
          supportCountPromise,
          signalsPromise,
          botAlertsPromise,
          chatPromise,
          supportTicketsPromise
        ]);

        setPlanPricing(fetchedPricing);
        const combinedSignals = [...manualAndWebhookSignals, ...rawBotAlerts];

        const nextCache: CachedPlatformActivity = {
          fetchedAtMs: Date.now(),
          timeframe: tf,
          pushDevicesCount: Math.max(pushDevicesCount, pushActiveCountFallback),
          openSupportThreadsCount: Math.max(openSupportThreadsCount, supportTimestamps.length),
          signalsTimestamps: combinedSignals,
          chatTimestamps,
          supportTimestamps
        };

        sessionAnalyticsCache.set(tf, nextCache);
        setActivityData(nextCache);
      } finally {
        setLoadingActivity(false);
      }
    },
    [pushActiveCountFallback]
  );

  useEffect(() => {
    loadQuotaSafeActivity(timeframe, false);
  }, [timeframe, loadQuotaSafeActivity]);

  // ================= DERIVED USER, REVENUE & EXPIRY METRICS (REUSES LOADED USERS ARRAY — 0 EXTRA READS) =================
  const metrics = useMemo(() => {
    const nowMs = Date.now();
    const days = getTimeframeDays(timeframe);
    const cutoffMs = nowMs - days * 24 * 60 * 60 * 1000;

    let freeCount = 0;
    let activeVipCount = 0;
    let activeEliteCount = 0;
    let expiredPaidCount = 0;
    let staffCount = 0;
    let totalLedgerRevenue = 0;
    let newUsersInWindow = 0;

    const expiringWithin7Days: Array<{
      user: AdminUserRecord;
      daysLeft: number;
      hoursLeft: number;
      effTier: string;
    }> = [];

    for (const u of users) {
      totalLedgerRevenue += Number(u.totalPaid || 0);

      const isStaffMember =
        ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(
          (u.role || '').toUpperCase()
        ) || hasAnyStaffPermission(u);

      if (u.createdAtMs && u.createdAtMs >= cutoffMs) {
        newUsersInWindow += 1;
      }

      if (isStaffMember) {
        staffCount += 1;
        continue;
      }

      const effTier = getEffectiveTier(u);
      const endMs = u.subscriptionEndDate ? new Date(u.subscriptionEndDate).getTime() : 0;
      const hasValidEnd = Boolean(u.subscriptionEndDate && !Number.isNaN(endMs) && endMs > 0);
      const diffHours = hasValidEnd ? (endMs - nowMs) / (1000 * 60 * 60) : null;
      const diffDays = diffHours !== null ? diffHours / 24 : null;

      const wasPaidOrMarkedExpired =
        u.subscriptionStatus === 'expired' ||
        (hasValidEnd &&
          diffHours !== null &&
          diffHours <= 0 &&
          (u.isVip || u.isElite || u.role === 'VIP' || u.role === 'ELITE'));

      if (wasPaidOrMarkedExpired && effTier === 'free') {
        expiredPaidCount += 1;
      }

      if (effTier === 'elite') {
        activeEliteCount += 1;
      } else if (effTier === 'vip') {
        activeVipCount += 1;
      } else {
        freeCount += 1;
      }

      if (diffHours !== null && diffHours >= -24 && diffHours <= 7 * 24) {
        expiringWithin7Days.push({
          user: u,
          daysLeft: Math.max(0, Math.ceil(diffDays || 0)),
          hoursLeft: Math.round(diffHours),
          effTier: effTier === 'free' ? (u.isElite ? 'ELITE' : 'VIP') : effTier.toUpperCase()
        });
      }
    }

    expiringWithin7Days.sort((a, b) => a.hoursLeft - b.hoursLeft);

    const vipMonthlyUsd =
      Number.isFinite(planPricing.vipMonthlyUsd) && planPricing.vipMonthlyUsd >= 0
        ? planPricing.vipMonthlyUsd
        : DEFAULT_PLAN_PRICING.vipMonthlyUsd;
    const eliteMonthlyUsd =
      Number.isFinite(planPricing.eliteMonthlyUsd) && planPricing.eliteMonthlyUsd >= 0
        ? planPricing.eliteMonthlyUsd
        : DEFAULT_PLAN_PRICING.eliteMonthlyUsd;

    const activePaidTotal = activeVipCount + activeEliteCount;
    const estimatedMrr =
      activeVipCount * vipMonthlyUsd + activeEliteCount * eliteMonthlyUsd;

    const pushEnabledCount = Math.max(
      activityData?.pushDevicesCount || 0,
      pushActiveCountFallback
    );
    const pushOptInPct =
      users.length > 0 ? Math.min(100, (pushEnabledCount / users.length) * 100) : 0;

    return {
      totalUsers: users.length,
      newUsersInWindow,
      freeCount,
      activeVipCount,
      activeEliteCount,
      activePaidTotal,
      expiredPaidCount,
      staffCount,
      vipMonthlyUsd,
      eliteMonthlyUsd,
      estimatedMrr,
      totalLedgerRevenue,
      expiringWithin7DaysCount: expiringWithin7Days.length,
      top5ExpiringSoon: expiringWithin7Days.slice(0, 5),
      pushEnabledCount,
      pushOptInPct,
      openSupportThreads: activityData?.openSupportThreadsCount || 0
    };
  }, [users, timeframe, activityData, pushActiveCountFallback, planPricing]);

  // ================= TIME-SERIES BUCKETS FOR CHART 1 (USER GROWTH) & CHART 3 (PLATFORM ACTIVITY) =================
  const timeSeriesBuckets = useMemo(() => {
    const days = getTimeframeDays(timeframe);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const endMs = now.getTime();
    const startMs = endMs - (days - 1) * 24 * 60 * 60 * 1000;

    // Build daily buckets
    const dailyMap = new Map<
      string,
      {
        dayKey: string;
        tsMs: number;
        label: string;
        newUsers: number;
        cumulativeUsers: number;
        botSignals: number;
        manualSignals: number;
        totalSignals: number;
        chatMessages: number;
        supportTickets: number;
      }
    >();

    const orderedKeys: string[] = [];
    for (let i = 0; i < days; i++) {
      const bucketTs = startMs + i * 24 * 60 * 60 * 1000;
      const key = formatDayKey(bucketTs);
      orderedKeys.push(key);
      dailyMap.set(key, {
        dayKey: key,
        tsMs: bucketTs,
        label: formatShortDateLabel(bucketTs, isAr),
        newUsers: 0,
        cumulativeUsers: 0,
        botSignals: 0,
        manualSignals: 0,
        totalSignals: 0,
        chatMessages: 0,
        supportTickets: 0
      });
    }

    // Count baseline users created before startMs
    let baselineUsersBeforeWindow = 0;
    for (const u of users) {
      const cMs = u.createdAtMs || 0;
      if (!cMs || cMs < startMs) {
        baselineUsersBeforeWindow += 1;
      } else {
        const key = formatDayKey(cMs);
        const bucket = dailyMap.get(key);
        if (bucket) {
          bucket.newUsers += 1;
        } else {
          baselineUsersBeforeWindow += 1;
        }
      }
    }

    // Populate signals, chat, and support activity
    if (activityData) {
      for (const sig of activityData.signalsTimestamps) {
        const bucket = dailyMap.get(formatDayKey(sig.tsMs));
        if (bucket) {
          bucket.totalSignals += 1;
          if (sig.isBot) bucket.botSignals += 1;
          else bucket.manualSignals += 1;
        }
      }
      for (const cTs of activityData.chatTimestamps) {
        const bucket = dailyMap.get(formatDayKey(cTs));
        if (bucket) bucket.chatMessages += 1;
      }
      for (const sTs of activityData.supportTimestamps) {
        const bucket = dailyMap.get(formatDayKey(sTs));
        if (bucket) bucket.supportTickets += 1;
      }
    }

    let runningCumulative = baselineUsersBeforeWindow;
    const rawDays = orderedKeys.map((k) => {
      const b = dailyMap.get(k)!;
      runningCumulative += b.newUsers;
      b.cumulativeUsers = runningCumulative;
      return b;
    });

    // For 90D, aggregate into 15 6-day buckets so bars and SVG nodes remain crisp and scannable
    if (timeframe === '90D') {
      const grouped: typeof rawDays = [];
      const groupSize = 6;
      for (let i = 0; i < rawDays.length; i += groupSize) {
        const slice = rawDays.slice(i, i + groupSize);
        if (slice.length === 0) continue;
        const last = slice[slice.length - 1];
        grouped.push({
          dayKey: last.dayKey,
          tsMs: last.tsMs,
          label: `${slice[0].label} - ${last.label}`,
          newUsers: slice.reduce((acc, item) => acc + item.newUsers, 0),
          cumulativeUsers: last.cumulativeUsers,
          botSignals: slice.reduce((acc, item) => acc + item.botSignals, 0),
          manualSignals: slice.reduce((acc, item) => acc + item.manualSignals, 0),
          totalSignals: slice.reduce((acc, item) => acc + item.totalSignals, 0),
          chatMessages: slice.reduce((acc, item) => acc + item.chatMessages, 0),
          supportTickets: slice.reduce((acc, item) => acc + item.supportTickets, 0)
        });
      }
      return grouped;
    }

    return rawDays;
  }, [timeframe, users, activityData, isAr]);

  const activityTotals = useMemo(() => {
    let totalSignals = 0;
    let botSignals = 0;
    let manualSignals = 0;
    let chatMessages = 0;
    let supportTickets = 0;
    for (const b of timeSeriesBuckets) {
      totalSignals += b.totalSignals;
      botSignals += b.botSignals;
      manualSignals += b.manualSignals;
      chatMessages += b.chatMessages;
      supportTickets += b.supportTickets;
    }
    return { totalSignals, botSignals, manualSignals, chatMessages, supportTickets };
  }, [timeSeriesBuckets]);

  const maxNewUsers = useMemo(
    () => Math.max(1, ...timeSeriesBuckets.map((b) => b.newUsers)),
    [timeSeriesBuckets]
  );
  const minCumulativeUsers = useMemo(
    () => Math.max(0, Math.min(...timeSeriesBuckets.map((b) => b.cumulativeUsers)) - 1),
    [timeSeriesBuckets]
  );
  const maxCumulativeUsers = useMemo(
    () => Math.max(minCumulativeUsers + 1, ...timeSeriesBuckets.map((b) => b.cumulativeUsers)),
    [timeSeriesBuckets, minCumulativeUsers]
  );
  const maxActivityDayValue = useMemo(
    () =>
      Math.max(
        1,
        ...timeSeriesBuckets.map((b) =>
          Math.max(b.totalSignals, b.chatMessages, b.supportTickets)
        )
      ),
    [timeSeriesBuckets]
  );

  // Plan distribution percentages for Chart 2
  const clientTotal = Math.max(
    1,
    metrics.freeCount + metrics.activeVipCount + metrics.activeEliteCount
  );
  const freePct = ((metrics.freeCount / clientTotal) * 100).toFixed(1);
  const vipPct = ((metrics.activeVipCount / clientTotal) * 100).toFixed(1);
  const elitePct = ((metrics.activeEliteCount / clientTotal) * 100).toFixed(1);

  const paidPlusExpiredTotal = Math.max(
    1,
    metrics.activePaidTotal + metrics.expiredPaidCount
  );
  const activeRetentionPct = (
    (metrics.activePaidTotal / paidPlusExpiredTotal) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-4">
      {/* TOP BAR: HEADER + TIMEFRAME SWITCHER (7D / 30D / 90D) + MANUAL QUOTA-SAFE REFRESH */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0E3EB] dark:border-[#2A2E39] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#131722] dark:text-[#F8FAFC]">
              {isAr
                ? 'مركز الإحصائيات، الإيرادات، ونشاط المنصة'
                : 'Institutional Website, Revenue & Activity Analytics'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F8F9FD] dark:bg-[#1E222D] text-[#089981] dark:text-[#26A69A] border border-[#E0E3EB] dark:border-[#2A2E39]">
              QUOTA-SAFE
            </span>
          </div>
          <p className="text-xs text-[#787B86] dark:text-[#64748B]">
            {isAr
              ? 'قراءة فورية مخزنة مؤقتاً للجلسة بدون مستمعات خلفية مستمرة (Zero onSnapshot Listeners)'
              : 'Session-cached one-time aggregation with zero background snapshot listeners'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Switcher: 7D | 30D | 90D */}
          <div className="inline-flex items-center rounded-md bg-[#FFFFFF] dark:bg-[#131722] p-0.5 border border-[#E0E3EB] dark:border-[#2A2E39]">
            {(['7D', '30D', '90D'] as AnalyticsTimeframe[]).map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTimeframe(tf);
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#131722] dark:bg-[#26A69A] text-white'
                      : 'text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D]'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            disabled={loadingActivity}
            onClick={() => {
              soundManager.playClick();
              loadQuotaSafeActivity(timeframe, true);
            }}
            className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-semibold text-[#131722] dark:text-[#E2E8F0] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A] ${loadingActivity ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>

          {canManageUsers && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onOpenUsersCrm();
              }}
              className="px-3 py-1.5 rounded-md bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-semibold text-[#089981] dark:text-[#26A69A] flex items-center gap-1 cursor-pointer"
            >
              <span>{isAr ? 'سجل العملاء CRM' : 'Users CRM'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP 6-CARD INSTITUTIONAL KPI STRIP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {/* KPI 1: Total Users */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#4A5162] dark:text-[#94A3B8]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'إجمالي الأعضاء' : 'Total Users'}
            </span>
            <Users className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
          </div>
          <div className="text-xl font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#089981] dark:text-[#26A69A]">
            +{metrics.newUsersInWindow} {isAr ? `في آخر ${timeframe}` : `in last ${timeframe}`}
          </div>
        </div>

        {/* KPI 2: Active Paid (VIP + Elite) */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#9A6700] dark:text-[#F0B90B]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'المشتركون النشطون' : 'Active Paid (VIP+Elite)'}
            </span>
            <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-[#F0B90B]" />
          </div>
          <div className="text-xl font-bold text-[#9A6700] dark:text-[#F0B90B] font-mono tabular-nums">
            {metrics.activePaidTotal.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#4A5162] dark:text-[#94A3B8]">
            VIP: {metrics.activeVipCount} • ELITE: {metrics.activeEliteCount}
          </div>
        </div>

        {/* KPI 3: Estimated MRR */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#089981] dark:text-[#26A69A]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'الإيراد الشهري المتوقع MRR' : 'Estimated MRR'}
            </span>
            <DollarSign className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
          </div>
          <div className="text-xl font-bold text-[#089981] dark:text-[#26A69A] font-mono tabular-nums">
            ${metrics.estimatedMrr.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#787B86] dark:text-[#64748B]">
            {isAr ? 'المحصّل:' : 'Collected:'} ${metrics.totalLedgerRevenue.toLocaleString()} • VIP ${metrics.vipMonthlyUsd} / Elite ${metrics.eliteMonthlyUsd}
          </div>
        </div>

        {/* KPI 4: Expiring <= 7 Days */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#D93848] dark:text-[#EF5350]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'ينتهي خلال <= 7 أيام' : 'Expiring <= 7 Days'}
            </span>
            <Clock className="w-3.5 h-3.5 text-[#D93848] dark:text-[#EF5350]" />
          </div>
          <div className="text-xl font-bold text-[#D93848] dark:text-[#EF5350] font-mono tabular-nums">
            {metrics.expiringWithin7DaysCount}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#4A5162] dark:text-[#94A3B8]">
            {metrics.expiredPaidCount} {isAr ? 'اشتراك منتهي سابقاً' : 'expired accounts'}
          </div>
        </div>

        {/* KPI 5: Push-Enabled Devices (with opt-in %) */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#089981] dark:text-[#26A69A]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'أجهزة Web Push المفعلة' : 'Push-Enabled Devices'}
            </span>
            <Bell className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
          </div>
          <div className="text-xl font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
            {metrics.pushEnabledCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#089981] dark:text-[#26A69A]">
            {metrics.pushOptInPct.toFixed(1)}% {isAr ? 'نسبة التفعيل' : 'Opt-in Rate'}
          </div>
        </div>

        {/* KPI 6: Open Support Threads (@mbktrading) */}
        <div className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
          <div className="flex items-center justify-between text-[#1E53E5] dark:text-[#3B82F6]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isAr ? 'محادثات دعم @mbktrading' : 'Open Support Threads'}
            </span>
            <Headphones className="w-3.5 h-3.5 text-[#1E53E5] dark:text-[#3B82F6]" />
          </div>
          <div className="text-xl font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
            {metrics.openSupportThreads.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-[#4A5162] dark:text-[#94A3B8]">
            {activityTotals.supportTickets} {isAr ? `نشطة في ${timeframe}` : `active in ${timeframe}`}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHARTS ROW 1: USER GROWTH (CHART 1) + PLAN & REVENUE BREAKDOWN (CHART 2) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CHART 1: USER GROWTH (New & Cumulative Signups over 7D / 30D / 90D) */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#F8FAFC]">
                  {isAr
                    ? `نمو المستخدمين والتسجيلات التراكمية (${timeframe})`
                    : `User Growth: New & Cumulative Signups (${timeframe})`}
                </h3>
              </div>
              <p className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                {isAr
                  ? 'الأعمدة الخضراء تمثل التسجيلات الجديدة والمنحنى يمثل الإجمالي التراكمي'
                  : 'Green bars show new signups per period; line shows cumulative member base'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-[#089981] dark:text-[#26A69A]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#26A69A]" />
                <span>{isAr ? 'تسجيلات جديدة' : 'New Signups'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#9A6700] dark:text-[#F0B90B]">
                <span className="w-2.5 h-0.5 bg-[#F0B90B]" />
                <span>{isAr ? 'الإجمالي التراكمي' : 'Cumulative'}</span>
              </span>
            </div>
          </div>

          {/* Interactive SVG + Bar Hybrid Chart */}
          <div className="relative h-[210px] w-full pt-6 pb-5 px-2 bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-md select-none">
            {/* Hover Tooltip Banner */}
            {hoveredGrowthIdx !== null && timeSeriesBuckets[hoveredGrowthIdx] && (
              <div className="absolute top-1.5 inset-x-2 flex items-center justify-between px-2.5 py-1 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono tabular-nums z-10">
                <span className="text-[#131722] dark:text-[#F8FAFC] font-bold">
                  {timeSeriesBuckets[hoveredGrowthIdx].label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[#089981] dark:text-[#26A69A]">
                    {isAr ? 'جديد:' : 'New:'} +{timeSeriesBuckets[hoveredGrowthIdx].newUsers}
                  </span>
                  <span className="text-[#9A6700] dark:text-[#F0B90B]">
                    {isAr ? 'الإجمالي:' : 'Total:'}{' '}
                    {timeSeriesBuckets[hoveredGrowthIdx].cumulativeUsers}
                  </span>
                </div>
              </div>
            )}

            {/* Cumulative SVG Line Overlay */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-x-2 top-7 bottom-6 w-[calc(100%-16px)] h-[calc(100%-52px)] pointer-events-none overflow-visible"
            >
              {(() => {
                const count = timeSeriesBuckets.length;
                if (count < 2) return null;
                const range = Math.max(1, maxCumulativeUsers - minCumulativeUsers);
                const points = timeSeriesBuckets.map((b, idx) => {
                  const x = (idx / (count - 1)) * 100;
                  const y = 95 - ((b.cumulativeUsers - minCumulativeUsers) / range) * 85;
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                });
                const areaPoints = `0,100 ${points.join(' ')} 100,100`;
                return (
                  <>
                    <polygon points={areaPoints} className="fill-[#B47B00]/10 dark:fill-[#F0B90B]/10" />
                    <polyline
                      fill="none"
                      className="stroke-[#B47B00] dark:stroke-[#F0B90B]"
                      strokeWidth="1.8"
                      vectorEffect="non-scaling-stroke"
                      points={points.join(' ')}
                    />
                  </>
                );
              })()}
            </svg>

            {/* Daily New Signups Bars */}
            <div className="relative h-full flex items-end justify-between gap-1">
              {timeSeriesBuckets.map((bucket, idx) => {
                const barHeightPct =
                  bucket.newUsers > 0
                    ? Math.max(10, Math.round((bucket.newUsers / maxNewUsers) * 85))
                    : 4;
                const isHovered = hoveredGrowthIdx === idx;
                return (
                  <div
                    key={bucket.dayKey}
                    onMouseEnter={() => setHoveredGrowthIdx(idx)}
                    onMouseLeave={() => setHoveredGrowthIdx(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                  >
                    <div
                      style={{ height: `${barHeightPct}%` }}
                      className={`w-full max-w-[22px] rounded-t transition-all ${
                        bucket.newUsers > 0
                          ? isHovered
                            ? 'bg-[#089981] dark:bg-[#26A69A] brightness-110'
                            : 'bg-[#089981]/80 dark:bg-[#26A69A]/75'
                          : 'bg-[#E0E3EB] dark:bg-[#1E222D]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Start / Mid / End Labels */}
            <div className="absolute bottom-1 inset-x-2 flex items-center justify-between text-[9px] font-mono text-[#787B86] dark:text-[#64748B]">
              <span>{timeSeriesBuckets[0]?.label || ''}</span>
              <span>
                {timeSeriesBuckets[Math.floor(timeSeriesBuckets.length / 2)]?.label || ''}
              </span>
              <span>{timeSeriesBuckets[timeSeriesBuckets.length - 1]?.label || ''}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[#4A5162] dark:text-[#94A3B8]">
            <span>
              {isAr ? 'التسجيلات الجديدة خلال الفترة:' : 'Period New Signups:'}{' '}
              <strong className="text-[#089981] dark:text-[#26A69A]">+{metrics.newUsersInWindow}</strong>
            </span>
            <span>
              {isAr ? 'إجمالي قاعدة العملاء:' : 'Cumulative Users:'}{' '}
              <strong className="text-[#131722] dark:text-[#F8FAFC]">{metrics.totalUsers}</strong>
            </span>
          </div>
        </div>

        {/* CHART 2: PLAN & REVENUE BREAKDOWN (Free vs VIP vs Elite + Active vs Expired Ratio) */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#F8FAFC]">
                  {isAr
                    ? 'توزيع الباقات والإيرادات (Free / VIP / Elite)'
                    : 'Plan & Revenue Breakdown'}
                </h3>
              </div>
              <p className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                {isAr
                  ? 'نسب المشتركين حسب الباقة ومعدل الاحتفاظ بالاشتراكات النشطة'
                  : 'Tier share across active members & Active vs Expired subscription ratio'}
              </p>
            </div>
          </div>

          {/* Stacked Multi-Segment Distribution Bar */}
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden flex">
              <div
                style={{ width: `${elitePct}%` }}
                className="h-full bg-[#26A69A] transition-all"
                title={`Elite: ${metrics.activeEliteCount} (${elitePct}%)`}
              />
              <div
                style={{ width: `${vipPct}%` }}
                className="h-full bg-[#F0B90B] transition-all"
                title={`VIP: ${metrics.activeVipCount} (${vipPct}%)`}
              />
              <div
                style={{ width: `${freePct}%` }}
                className="h-full bg-[#94A3B8] dark:bg-[#334155] transition-all"
                title={`Free: ${metrics.freeCount} (${freePct}%)`}
              />
            </div>

            {/* Tier Breakdown Rows */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#089981] dark:text-[#26A69A]">
                  <span className="w-2 h-2 rounded-xs bg-[#26A69A]" />
                  <span>ELITE (${metrics.eliteMonthlyUsd})</span>
                </div>
                <div className="text-sm font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
                  {metrics.activeEliteCount}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-[#787B86] dark:text-[#64748B]">
                  {elitePct}% • ${(metrics.activeEliteCount * metrics.eliteMonthlyUsd).toLocaleString()}/mo
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#9A6700] dark:text-[#F0B90B]">
                  <span className="w-2 h-2 rounded-xs bg-[#F0B90B]" />
                  <span>VIP (${metrics.vipMonthlyUsd})</span>
                </div>
                <div className="text-sm font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
                  {metrics.activeVipCount}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-[#787B86] dark:text-[#64748B]">
                  {vipPct}% • ${(metrics.activeVipCount * metrics.vipMonthlyUsd).toLocaleString()}/mo
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#4A5162] dark:text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-xs bg-[#475569]" />
                  <span>FREE</span>
                </div>
                <div className="text-sm font-bold text-[#131722] dark:text-[#F8FAFC] font-mono tabular-nums">
                  {metrics.freeCount}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-[#787B86] dark:text-[#64748B]">
                  {freePct}% • $0/mo
                </div>
              </div>
            </div>
          </div>

          {/* Active vs Expired Paid Ratio Gauge */}
          <div className="p-3 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#131722] dark:text-[#E2E8F0]">
                {isAr ? 'معدل الاشتراكات النشطة مقابل المنتهية' : 'Active vs Expired Paid Ratio'}
              </span>
              <span className="font-mono font-bold tabular-nums text-[#089981] dark:text-[#26A69A]">
                {activeRetentionPct}% {isAr ? 'نشط' : 'Active'}
              </span>
            </div>

            <div className="h-2.5 w-full rounded bg-[#F8F9FD] dark:bg-[#1E222D] overflow-hidden flex">
              <div
                style={{ width: `${activeRetentionPct}%` }}
                className="h-full bg-[#26A69A] transition-all"
              />
              <div
                style={{ width: `${100 - Number(activeRetentionPct)}%` }}
                className="h-full bg-[#EF5350] transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[#4A5162] dark:text-[#94A3B8]">
              <span className="text-[#089981] dark:text-[#26A69A]">
                {isAr ? 'نشط حالياً:' : 'Active Paid:'} {metrics.activePaidTotal}
              </span>
              <span className="text-[#D93848] dark:text-[#EF5350]">
                {isAr ? 'منتهي الصلاحية:' : 'Expired:'} {metrics.expiredPaidCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHARTS ROW 2: PLATFORM ACTIVITY (CHART 3) + TOP 5 EXPIRING SOON QUICK ACTION PANEL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CHART 3: PLATFORM ACTIVITY (Signals Published Bot+Manual, Chat Activity, Support Tickets) */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#F8FAFC]">
                  {isAr
                    ? `نشاط المنصة اليومي (${timeframe}): التوصيات، الشات، والدعم`
                    : `Platform Activity (${timeframe}): Signals, Chat & Support`}
                </h3>
              </div>
              <p className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                {isAr
                  ? 'إحصائيات الصفقات المنشورة (بوت + يدوي)، رسائل الشات، وتذاكر الدعم'
                  : 'Bounded limit(300) telemetry across published signals, trading chat, and support desk'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 text-[#089981] dark:text-[#26A69A]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#26A69A]" />
                <span>
                  {isAr ? 'التوصيات' : 'Signals'} ({activityTotals.totalSignals})
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[#1E53E5] dark:text-[#3B82F6]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#3B82F6]" />
                <span>
                  {isAr ? 'الشات' : 'Chat'} ({activityTotals.chatMessages})
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[#9A6700] dark:text-[#F0B90B]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#F0B90B]" />
                <span>
                  {isAr ? 'تذاكر الدعم' : 'Support'} ({activityTotals.supportTickets})
                </span>
              </span>
            </div>
          </div>

          {/* Interactive Grouped Bar Chart */}
          <div className="relative h-[200px] w-full pt-6 pb-5 px-2 bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] rounded-md select-none">
            {hoveredActivityIdx !== null && timeSeriesBuckets[hoveredActivityIdx] && (
              <div className="absolute top-1.5 inset-x-2 flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono tabular-nums z-10">
                <span className="text-[#131722] dark:text-[#F8FAFC] font-bold">
                  {timeSeriesBuckets[hoveredActivityIdx].label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[#089981] dark:text-[#26A69A]">
                    {isAr ? 'توصيات:' : 'Signals:'}{' '}
                    {timeSeriesBuckets[hoveredActivityIdx].totalSignals} (Bot:{' '}
                    {timeSeriesBuckets[hoveredActivityIdx].botSignals} / Manual:{' '}
                    {timeSeriesBuckets[hoveredActivityIdx].manualSignals})
                  </span>
                  <span className="text-[#1E53E5] dark:text-[#3B82F6]">
                    {isAr ? 'شات:' : 'Chat:'} {timeSeriesBuckets[hoveredActivityIdx].chatMessages}
                  </span>
                  <span className="text-[#9A6700] dark:text-[#F0B90B]">
                    {isAr ? 'دعم:' : 'Support:'}{' '}
                    {timeSeriesBuckets[hoveredActivityIdx].supportTickets}
                  </span>
                </div>
              </div>
            )}

            <div className="relative h-full flex items-end justify-between gap-1">
              {timeSeriesBuckets.map((bucket, idx) => {
                const sigH =
                  bucket.totalSignals > 0
                    ? Math.max(8, Math.round((bucket.totalSignals / maxActivityDayValue) * 86))
                    : 3;
                const chatH =
                  bucket.chatMessages > 0
                    ? Math.max(8, Math.round((bucket.chatMessages / maxActivityDayValue) * 86))
                    : 3;
                const supH =
                  bucket.supportTickets > 0
                    ? Math.max(8, Math.round((bucket.supportTickets / maxActivityDayValue) * 86))
                    : 3;
                return (
                  <div
                    key={`act-${bucket.dayKey}`}
                    onMouseEnter={() => setHoveredActivityIdx(idx)}
                    onMouseLeave={() => setHoveredActivityIdx(null)}
                    className="flex-1 h-full flex items-end justify-center gap-0.5 cursor-pointer py-0.5 hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D]/40 rounded"
                  >
                    <div
                      style={{ height: `${sigH}%` }}
                      className={`w-1.5 sm:w-2 rounded-t ${
                        bucket.totalSignals > 0 ? 'bg-[#089981] dark:bg-[#26A69A]' : 'bg-[#E0E3EB] dark:bg-[#1E222D]'
                      }`}
                    />
                    <div
                      style={{ height: `${chatH}%` }}
                      className={`w-1.5 sm:w-2 rounded-t ${
                        bucket.chatMessages > 0 ? 'bg-[#1E53E5] dark:bg-[#3B82F6]' : 'bg-[#E0E3EB] dark:bg-[#1E222D]'
                      }`}
                    />
                    <div
                      style={{ height: `${supH}%` }}
                      className={`w-1.5 sm:w-2 rounded-t ${
                        bucket.supportTickets > 0 ? 'bg-[#B47B00] dark:bg-[#F0B90B]' : 'bg-[#E0E3EB] dark:bg-[#1E222D]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-1 inset-x-2 flex items-center justify-between text-[9px] font-mono text-[#787B86] dark:text-[#64748B]">
              <span>{timeSeriesBuckets[0]?.label || ''}</span>
              <span>
                {timeSeriesBuckets[Math.floor(timeSeriesBuckets.length / 2)]?.label || ''}
              </span>
              <span>{timeSeriesBuckets[timeSeriesBuckets.length - 1]?.label || ''}</span>
            </div>
          </div>

          {/* Activity Summary Pill Row */}
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
            <div className="px-2.5 py-1.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
              <span className="text-[#4A5162] dark:text-[#94A3B8]">{isAr ? 'البوت / يدوي:' : 'Bot / Manual:'}</span>
              <span className="text-[#089981] dark:text-[#26A69A] font-bold">
                {activityTotals.botSignals} / {activityTotals.manualSignals}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
              <span className="text-[#4A5162] dark:text-[#94A3B8]">{isAr ? 'رسائل الشات:' : 'Chat Msgs:'}</span>
              <span className="text-[#1E53E5] dark:text-[#3B82F6] font-bold">{activityTotals.chatMessages}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
              <span className="text-[#4A5162] dark:text-[#94A3B8]">{isAr ? 'تذاكر الدعم:' : 'Support:'}</span>
              <span className="text-[#9A6700] dark:text-[#F0B90B] font-bold">{activityTotals.supportTickets}</span>
            </div>
          </div>
        </div>

        {/* QUICK ACTION PANEL: TOP 5 "EXPIRING SOON" USERS WITH 1-CLICK JUMP TO CRM DRAWER */}
        <div className="lg:col-span-5 p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#9A6700] dark:text-[#F0B90B]" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#F8FAFC]">
                  {isAr
                    ? 'أولوية التجديد: أقرب 5 اشتراكات انتهاءً'
                    : 'Quick Action: Top 5 Expiring Soon'}
                </h3>
                <p className="text-[11px] text-[#787B86] dark:text-[#64748B]">
                  {isAr
                    ? 'قفزة فورية بضغطة واحدة إلى درج التحكم لتجديد الاشتراك'
                    : '1-click jump straight into the subscriber CRM Control Drawer'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums bg-[#FDF6E3] dark:bg-[#F0B90B]/15 text-[#9A6700] dark:text-[#F0B90B] border border-[#EFE0B4] dark:border-[#F0B90B]/40">
              {metrics.expiringWithin7DaysCount} {'<='} 7D
            </span>
          </div>

          <div className="flex-1 space-y-2">
            {metrics.top5ExpiringSoon.length === 0 ? (
              <div className="h-[190px] rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center justify-center text-center p-4 text-xs text-[#787B86] dark:text-[#64748B]">
                <ShieldCheck className="w-6 h-6 text-[#089981] dark:text-[#26A69A] mb-1.5 opacity-80" />
                <span>
                  {isAr
                    ? 'لا توجد اشتراكات تنتهي خلال الـ 7 أيام القادمة.'
                    : 'No paid subscriptions expiring within the next 7 days.'}
                </span>
              </div>
            ) : (
              metrics.top5ExpiringSoon.map(({ user: u, effTier }) => {
                const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
                return (
                  <div
                    key={`exp-soon-${u.id}`}
                    className="p-2.5 rounded-md bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] hover:border-[#F0B90B]/50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC] truncate">
                          {u.displayName}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                            effTier === 'ELITE'
                              ? 'bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A] border-[#B3E2D9] dark:border-[#26A69A]/40'
                              : 'bg-[#FDF6E3] dark:bg-[#F0B90B]/15 text-[#9A6700] dark:text-[#F0B90B] border-[#EFE0B4] dark:border-[#F0B90B]/40'
                          }`}
                        >
                          {effTier}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-[#FDECEE] dark:bg-[#EF5350]/15 text-[#D93848] dark:text-[#EF5350] border border-[#F5C2C7] dark:border-[#EF5350]/30">
                          {formatExpiryShort(u.subscriptionEndDate, isAr)}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#787B86] dark:text-[#64748B] truncate">
                        {u.phone || u.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#089981] dark:text-[#26A69A] transition-colors"
                          title="WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onInspectUser(u);
                        }}
                        className="px-2.5 py-1 rounded bg-[#F0B90B] hover:brightness-110 text-black font-bold text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <span>{isAr ? 'فتح في CRM' : 'Open CRM'}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {canManageUsers && metrics.expiringWithin7DaysCount > 5 && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onOpenUsersCrm();
              }}
              className="w-full py-1.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[11px] font-semibold text-[#131722] dark:text-[#E2E8F0] cursor-pointer"
            >
              {isAr
                ? `عرض جميع الاشتراكات القريبة من الانتهاء (${metrics.expiringWithin7DaysCount}) في CRM`
                : `View All ${metrics.expiringWithin7DaysCount} Expiring Users in CRM`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
