import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Gift,
  KeyRound,
  Megaphone,
  Sparkles,
  X
} from 'lucide-react';
import { UserProfile } from '../../types/trading';
import { getEffectiveTier } from '../../utils/entitlements';
import { soundManager } from '../../utils/audio';
import { dispatchMobileAppNotification } from '../../utils/mobileNotifications';
import {
  AdminAnnouncement,
  MacroEconomicEvent,
  getUserRemainingSubscriptionDays,
  subscribeToActiveAnnouncements,
  subscribeToUpcomingMacroEvents
} from '../../services/macroEventsAndAnnouncementsService';

interface Props {
  user: UserProfile;
  activeView: string;
  lang?: 'ar' | 'en';
  onOpenPlansModal?: () => void;
  onOpenPromoModal?: () => void;
  onNavigateToCalendar?: () => void;
}

export const MacroEventAndAnnouncementPopup: React.FC<Props> = ({
  user,
  activeView,
  lang = 'ar',
  onOpenPlansModal,
  onOpenPromoModal,
  onNavigateToCalendar
}) => {
  const isAr = lang === 'ar';
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [upcomingMacroEvents, setUpcomingMacroEvents] = useState<MacroEconomicEvent[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => new Set());
  const [openedAppSession, setOpenedAppSession] = useState<boolean>(true);

  // Tick every 15 seconds for live 1-hour countdown detection
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real upcoming High-Impact Macro Events from /api/market/calendar (15-min client cache)
  useEffect(() => {
    const unsub = subscribeToUpcomingMacroEvents((events) => {
      setUpcomingMacroEvents(events);
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore Admin Announcements
  useEffect(() => {
    const unsub = subscribeToActiveAnnouncements((list) => {
      setAnnouncements(list);
    });
    return () => unsub();
  }, []);

  // Detect any real upcoming High-Impact Macro Event within 1 hour (0 < remaining <= 60 min)
  const upcomingWithinOneHourEvent = useMemo<MacroEconomicEvent | null>(() => {
    for (const ev of upcomingMacroEvents) {
      const diffMs = ev.releaseTimeMs - nowMs;
      if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
        return ev;
      }
    }
    return null;
  }, [nowMs, upcomingMacroEvents]);

  // Determine if user matches targetAudience of an Admin Announcement
  const userMatchesAudience = (audience: AdminAnnouncement['targetAudience']): boolean => {
    const tier = getEffectiveTier(user);
    const roleUpper = (user.role || '').toUpperCase();
    const isAdminUser = Boolean(
      user.isAdmin || roleUpper === 'ADMIN' || user.email?.toLowerCase() === 'moe.albzour@gmail.com'
    );
    // Admins always see announcements they publish so they can verify them immediately
    if (isAdminUser) return true;

    if (audience === 'all') return true;
    if (audience === 'free') return tier === 'free';
    if (audience === 'vip') return tier === 'vip' || tier === 'elite';
    if (audience === 'elite') return tier === 'elite';
    if (audience === 'expiring_soon') {
      const remDays = getUserRemainingSubscriptionDays(user);
      return remDays !== null && remDays >= 0 && remDays <= 7;
    }
    return true;
  };

  // Find active Admin Announcement matching current tab or app open
  const matchingAnnouncement = useMemo<AdminAnnouncement | null>(() => {
    for (const ann of announcements) {
      if (!ann.isActive) continue;
      if (dismissedIds.has(ann.id)) continue;
      if (!userMatchesAudience(ann.targetAudience)) continue;

      const tabs = ann.targetTabs || [];
      const matchesAll = tabs.includes('all');
      const matchesCurrentTab = tabs.includes(activeView);
      const matchesOnOpen = tabs.includes('on_open') && openedAppSession;

      if (matchesAll || matchesCurrentTab || matchesOnOpen) {
        return ann;
      }
    }
    return null;
  }, [announcements, dismissedIds, activeView, openedAppSession, user]);

  // Trigger audio + OS notification once per new popup
  useEffect(() => {
    if (
      upcomingWithinOneHourEvent &&
      !dismissedIds.has(upcomingWithinOneHourEvent.id) &&
      !notifiedIds.has(upcomingWithinOneHourEvent.id)
    ) {
      const minsLeft = Math.max(
        1,
        Math.ceil((upcomingWithinOneHourEvent.releaseTimeMs - Date.now()) / (60 * 1000))
      );
      soundManager.playSignalPing();
      dispatchMobileAppNotification({
        title: isAr
          ? `⚠️ تحذير خبر اقتصادي هام بعد ${minsLeft} دقيقة!`
          : `⚠️ High-Impact Macro Event in ${minsLeft} min!`,
        body: isAr
          ? upcomingWithinOneHourEvent.titleAr
          : upcomingWithinOneHourEvent.titleEn,
        tag: `macro-warn-${upcomingWithinOneHourEvent.code}`
      }).catch(() => {});

      setNotifiedIds((prev) => new Set(prev).add(upcomingWithinOneHourEvent.id));
    }
  }, [upcomingWithinOneHourEvent, dismissedIds, notifiedIds, isAr]);

  useEffect(() => {
    if (
      matchingAnnouncement &&
      !dismissedIds.has(matchingAnnouncement.id) &&
      !notifiedIds.has(matchingAnnouncement.id)
    ) {
      soundManager.playSignalPing();
      dispatchMobileAppNotification({
        title: matchingAnnouncement.title,
        body: matchingAnnouncement.message.slice(0, 140),
        tag: `admin-ann-${matchingAnnouncement.id}`
      }).catch(() => {});

      setNotifiedIds((prev) => new Set(prev).add(matchingAnnouncement.id));
    }
  }, [matchingAnnouncement, dismissedIds, notifiedIds]);

  const showMacroWarning =
    upcomingWithinOneHourEvent && !dismissedIds.has(upcomingWithinOneHourEvent.id);
  const showAdminAnnouncement =
    matchingAnnouncement && !dismissedIds.has(matchingAnnouncement.id);

  if (!showMacroWarning && !showAdminAnnouncement) {
    return null;
  }

  const handleDismiss = (id: string, isOnOpen?: boolean) => {
    soundManager.playClick();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (isOnOpen) {
      setOpenedAppSession(false);
    }
  };

  return (
    <div
      className="fixed bottom-3 sm:bottom-5 end-3 start-3 sm:start-auto sm:end-5 sm:max-w-md z-[68] space-y-3 animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. ONE-HOUR UPCOMING HIGH-IMPACT ECONOMIC EVENT POPUP (CPI / FED / NFP) */}
      {showMacroWarning && upcomingWithinOneHourEvent && (
        <div className="bg-[#1e222d]/98 backdrop-blur-xl border-2 border-[#f23645]/80 rounded-xl p-4 shadow-[0_14px_45px_rgba(242,54,69,0.35)] text-[#d1d4dc]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f23645]/20 border border-[#f23645]/50 text-[#f23645] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#f23645] text-white text-[10px] font-mono tabular-nums font-extrabold uppercase flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3" />
                    <span>
                      {isAr
                        ? `متبقي ${Math.max(
                            1,
                            Math.ceil((upcomingWithinOneHourEvent.releaseTimeMs - nowMs) / (60 * 1000))
                          )} دقيقة`
                        : `${Math.max(
                            1,
                            Math.ceil((upcomingWithinOneHourEvent.releaseTimeMs - nowMs) / (60 * 1000))
                          )}m LEFT`}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#131722] text-[#d1d4dc] border border-[#2a2e39] text-[10px] font-mono tabular-nums font-bold">
                    {new Date(upcomingWithinOneHourEvent.releaseTimeMs).toLocaleTimeString(
                      isAr ? 'ar-AE' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    {upcomingWithinOneHourEvent.code} • {upcomingWithinOneHourEvent.currency}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismiss(upcomingWithinOneHourEvent.id)}
                  className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer shrink-0"
                  title={isAr ? 'إغلاق التحذير' : 'Dismiss warning'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                {isAr ? upcomingWithinOneHourEvent.titleAr : upcomingWithinOneHourEvent.titleEn}
              </h4>

              <div className="p-2.5 rounded-lg bg-[#131722] border border-[#2a2e39] space-y-1">
                <div className="text-[10px] font-bold text-[#089981]">
                  {isAr
                    ? '⚡ التأثير المتوقع على الذهب (XAUUSD) والناسداك (US100):'
                    : '⚡ XAUUSD & US100 Trading Impact:'}
                </div>
                <p className="text-[11px] text-[#d1d4dc] leading-relaxed">
                  {isAr
                    ? upcomingWithinOneHourEvent.goldNasdaqImpactAr ||
                      upcomingWithinOneHourEvent.descriptionAr
                    : upcomingWithinOneHourEvent.goldNasdaqImpactEn ||
                      upcomingWithinOneHourEvent.descriptionEn}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[10px]">
                <div className="px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                  <span className="text-[#787b86]">{isAr ? 'المتوقع:' : 'Forecast:'}</span>
                  <span className="text-amber-400 font-bold">
                    {upcomingWithinOneHourEvent.forecast || '—'}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                  <span className="text-[#787b86]">{isAr ? 'السابق:' : 'Previous:'}</span>
                  <span className="text-white font-bold">
                    {upcomingWithinOneHourEvent.previous || '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onNavigateToCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onNavigateToCalendar();
                      handleDismiss(upcomingWithinOneHourEvent.id);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح التقويم الاقتصادي' : 'Open Economic Calendar'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismiss(upcomingWithinOneHourEvent.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#9db2c6] hover:text-white text-[11px] font-bold cursor-pointer"
                >
                  {isAr ? 'تم الاطلاع — تأمين الصفقات' : 'Got It'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN LIVE POPUP ANNOUNCEMENT / OFFER / NEWS CARD */}
      {showAdminAnnouncement && matchingAnnouncement && (
        <div
          className={`bg-[#1e222d]/98 backdrop-blur-xl border-2 rounded-2xl p-4 shadow-[0_14px_45px_rgba(0,0,0,0.85)] text-[#d1d4dc] ${
            matchingAnnouncement.type === 'offer'
              ? 'border-amber-500/70'
              : matchingAnnouncement.type === 'event'
              ? 'border-rose-500/70'
              : 'border-[#089981]/70'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                matchingAnnouncement.type === 'offer'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : matchingAnnouncement.type === 'event'
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-[#089981]/20 border-[#089981]/50 text-[#089981]'
              }`}
            >
              {matchingAnnouncement.type === 'offer' ? (
                <Gift className="w-6 h-6 animate-bounce" />
              ) : matchingAnnouncement.type === 'event' ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <Megaphone className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase flex items-center gap-1 ${
                    matchingAnnouncement.type === 'offer'
                      ? 'bg-amber-500 text-black'
                      : matchingAnnouncement.type === 'event'
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#089981] text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {matchingAnnouncement.type === 'offer'
                      ? isAr
                        ? 'عرض خاص وحصري'
                        : 'SPECIAL OFFER'
                      : matchingAnnouncement.type === 'event'
                      ? isAr
                        ? 'تحذير حدث اقتصادي هام'
                        : 'MACRO EVENT ALERT'
                      : isAr
                      ? 'إعلان من الإدارة'
                      : 'OFFICIAL ANNOUNCEMENT'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleDismiss(
                      matchingAnnouncement.id,
                      matchingAnnouncement.targetTabs.includes('on_open')
                    )
                  }
                  className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer shrink-0"
                  title={isAr ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                {matchingAnnouncement.title}
              </h4>

              <p className="text-[11px] text-[#b2b5be] leading-relaxed whitespace-pre-wrap break-words">
                {matchingAnnouncement.message}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {matchingAnnouncement.ctaType === 'plans' && onOpenPlansModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onOpenPlansModal();
                      handleDismiss(matchingAnnouncement.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>
                      {matchingAnnouncement.ctaLabel ||
                        (isAr ? 'عرض الباقات والترقية الآن' : 'View Plans & Upgrade')}
                    </span>
                  </button>
                )}

                {matchingAnnouncement.ctaType === 'promo' && onOpenPromoModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onOpenPromoModal();
                      handleDismiss(matchingAnnouncement.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {matchingAnnouncement.ctaLabel ||
                        (isAr ? 'تفعيل كود الاشتراك' : 'Redeem Activation Code')}
                    </span>
                  </button>
                )}

                {matchingAnnouncement.ctaType === 'calendar' && onNavigateToCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onNavigateToCalendar();
                      handleDismiss(matchingAnnouncement.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {matchingAnnouncement.ctaLabel ||
                        (isAr ? 'فتح التقويم الاقتصادي' : 'Open Economic Calendar')}
                    </span>
                  </button>
                )}

                {matchingAnnouncement.ctaType === 'url' && matchingAnnouncement.ctaUrl && (
                  <a
                    href={matchingAnnouncement.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleDismiss(matchingAnnouncement.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {matchingAnnouncement.ctaLabel || (isAr ? 'فتح الرابط' : 'Open Link')}
                    </span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleDismiss(
                      matchingAnnouncement.id,
                      matchingAnnouncement.targetTabs.includes('on_open')
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#9db2c6] hover:text-white text-[11px] font-semibold cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
