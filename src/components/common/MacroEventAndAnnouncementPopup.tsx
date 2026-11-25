import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Headphones,
  KeyRound,
  Layout,
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
  incrementAnnouncementMetric,
  normalizeBrandSenderName,
  subscribeToActiveAnnouncements,
  subscribeToUpcomingMacroEvents
} from '../../services/macroEventsAndAnnouncementsService';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  user: UserProfile;
  activeView: string;
  lang?: 'ar' | 'en';
  onOpenPlansModal?: () => void;
  onOpenPromoModal?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToTab?: (tabId: string) => void;
  onOpenSupportChat?: () => void;
}

function formatPopupCountdown(targetMs: number | null | undefined, nowMs: number) {
  if (!targetMs || targetMs <= nowMs) {
    return { expired: true, dd: '00', hh: '00', mm: '00', ss: '00' };
  }
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    expired: false,
    dd: pad(days),
    hh: pad(hours),
    mm: pad(mins),
    ss: pad(secs)
  };
}

function hasPopupBeenSeenByFrequency(ann: AdminAnnouncement): boolean {
  if (typeof window === 'undefined') return false;
  const freq = ann.frequency || 'once_per_session';
  try {
    if (freq === 'once_per_user') {
      return localStorage.getItem(`mbk_popup_seen_user_${ann.id}`) === '1';
    }
    if (freq === 'once_per_session') {
      return sessionStorage.getItem(`mbk_popup_seen_session_${ann.id}`) === '1';
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function markPopupSeenByFrequency(ann: AdminAnnouncement): void {
  if (typeof window === 'undefined') return;
  const freq = ann.frequency || 'once_per_session';
  try {
    if (freq === 'once_per_user') {
      localStorage.setItem(`mbk_popup_seen_user_${ann.id}`, '1');
    } else if (freq === 'once_per_session') {
      sessionStorage.setItem(`mbk_popup_seen_session_${ann.id}`, '1');
    }
  } catch {
    // ignore storage errors
  }
}

export const MacroEventAndAnnouncementPopup: React.FC<Props> = ({
  user,
  activeView,
  lang = 'ar',
  onOpenPlansModal,
  onOpenPromoModal,
  onNavigateToCalendar,
  onNavigateToTab,
  onOpenSupportChat
}) => {
  const isAr = lang === 'ar';
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [upcomingMacroEvents, setUpcomingMacroEvents] = useState<MacroEconomicEvent[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [openedAppSession, setOpenedAppSession] = useState<boolean>(true);
  const trackedPopupViewIdsRef = useRef<Set<string>>(new Set());
  const trackedMacroWarnIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to real upcoming High-Impact Macro Events from /api/market/calendar (15-min client cache)
  useEffect(() => {
    const unsub = subscribeToUpcomingMacroEvents((events) => {
      setUpcomingMacroEvents(events);
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore Admin Announcements (one-time getDocs cached in sessionStorage for 15 minutes)
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

    const remDays = getUserRemainingSubscriptionDays(user);

    if (audience === 'all') return true;
    if (audience === 'free') return tier === 'free';
    if (audience === 'vip') return tier === 'vip' || tier === 'elite';
    if (audience === 'elite') return tier === 'elite';
    if (audience === 'expiring_soon') {
      return remDays !== null && remDays > 0 && remDays <= 7;
    }
    if (audience === 'expired') {
      return remDays !== null && remDays <= 0;
    }
    return true;
  };

  // Find active Admin Announcement matching current tab, schedule, countdown, and frequency
  const matchingAnnouncement = useMemo<AdminAnnouncement | null>(() => {
    for (const ann of announcements) {
      if (!ann.isActive) continue;
      if (dismissedIds.has(ann.id)) continue;
      if (hasPopupBeenSeenByFrequency(ann)) continue;

      // Schedule & Expiry Checks
      if (ann.startAtMs && ann.startAtMs > nowMs) continue;
      if (ann.endAtMs && ann.endAtMs <= nowMs) continue;
      if (ann.countdownEnabled && ann.countdownEndAtMs && ann.countdownEndAtMs <= nowMs) {
        continue;
      }

      if (!userMatchesAudience(ann.targetAudience)) continue;

      const tabs = ann.targetTabs || [];
      const matchesAll = tabs.includes('all') || ann.triggerLocation === 'global';
      const matchesCurrentTab = tabs.includes(activeView);
      const matchesOnOpen = tabs.includes('on_open') && openedAppSession;

      if (matchesAll || matchesCurrentTab || matchesOnOpen) {
        return ann;
      }
    }
    return null;
  }, [announcements, dismissedIds, activeView, openedAppSession, user, nowMs]);

  // Tick every 1 second when a countdown/scheduled popup is visible, otherwise every 15 seconds
  const hasLiveTimerNeed = Boolean(
    (matchingAnnouncement &&
      (matchingAnnouncement.countdownEnabled ||
        matchingAnnouncement.endAtMs ||
        matchingAnnouncement.startAtMs)) ||
      upcomingWithinOneHourEvent
  );

  useEffect(() => {
    const intervalMs = hasLiveTimerNeed ? 1000 : 15000;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => clearInterval(interval);
  }, [hasLiveTimerNeed]);

  const upcomingMacroEventId = upcomingWithinOneHourEvent?.id || null;
  const matchingAnnouncementId = matchingAnnouncement?.id || null;

  // Trigger audio + OS notification for 1-hour macro warning (strictly once per event ID)
  useEffect(() => {
    if (!upcomingMacroEventId || !upcomingWithinOneHourEvent) return;
    if (trackedMacroWarnIdsRef.current.has(upcomingMacroEventId)) return;
    trackedMacroWarnIdsRef.current.add(upcomingMacroEventId);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingMacroEventId, isAr]);

  // Trigger once-per-browser Firestore view counter + notification (depends strictly on primitive matchingAnnouncementId)
  useEffect(() => {
    if (!matchingAnnouncementId || !matchingAnnouncement) return;
    if (trackedPopupViewIdsRef.current.has(matchingAnnouncementId)) return;
    trackedPopupViewIdsRef.current.add(matchingAnnouncementId);

    soundManager.playSignalPing();

    const browserViewedKey = `mbk_popup_viewed_${matchingAnnouncementId}`;
    let alreadyCountedInBrowser = false;
    try {
      alreadyCountedInBrowser = localStorage.getItem(browserViewedKey) === '1';
      if (!alreadyCountedInBrowser) {
        localStorage.setItem(browserViewedKey, '1');
      }
    } catch {
      // ignore storage errors
    }

    if (!alreadyCountedInBrowser) {
      incrementAnnouncementMetric(matchingAnnouncementId, 'views').catch(() => {});
    }

    dispatchMobileAppNotification({
      title: `${normalizeBrandSenderName(matchingAnnouncement.senderName)}: ${matchingAnnouncement.title}`,
      body: matchingAnnouncement.message.slice(0, 140),
      tag: `admin-ann-${matchingAnnouncementId}`
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingAnnouncementId]);

  const showMacroWarning =
    upcomingWithinOneHourEvent && !dismissedIds.has(upcomingWithinOneHourEvent.id);
  const showAdminAnnouncement =
    matchingAnnouncement && !dismissedIds.has(matchingAnnouncement.id);

  if (!showMacroWarning && !showAdminAnnouncement) {
    return null;
  }

  const handleDismiss = (annOrId: AdminAnnouncement | string, isOnOpen?: boolean) => {
    soundManager.playClick();
    const id = typeof annOrId === 'string' ? annOrId : annOrId.id;
    if (typeof annOrId !== 'string') {
      markPopupSeenByFrequency(annOrId);
    }
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (isOnOpen) {
      setOpenedAppSession(false);
    }
  };

  const handleCtaClick = (ann: AdminAnnouncement) => {
    soundManager.playClick();
    incrementAnnouncementMetric(ann.id, 'clicks').catch(() => {});

    if (ann.ctaType === 'plans' && onOpenPlansModal) {
      onOpenPlansModal();
    } else if (ann.ctaType === 'promo' && onOpenPromoModal) {
      onOpenPromoModal();
    } else if (ann.ctaType === 'calendar' && onNavigateToCalendar) {
      onNavigateToCalendar();
    } else if (ann.ctaType === 'navigate_tab' && onNavigateToTab) {
      onNavigateToTab(ann.ctaTargetTab || 'signals');
    } else if (ann.ctaType === 'support_chat' && onOpenSupportChat) {
      onOpenSupportChat();
    }

    handleDismiss(ann, ann.targetTabs.includes('on_open'));
  };

  const renderAdminPopupCard = (ann: AdminAnnouncement) => {
    const accent = ann.accentColor || (isLight ? '#089981' : '#26A69A');
    const isLightGoldAccent = isLight && (accent.toUpperCase() === '#F0B90B' || accent.toUpperCase() === '#F59E0B');
    const readableAccentText = isLightGoldAccent ? '#9A6700' : accent;
    const ctaBg = ann.ctaColor || accent;
    const surface = ann.surfaceStyle || 'dark_terminal';
    const sender = normalizeBrandSenderName(ann.senderName);
    const showLogo = ann.showLogo !== false;
    const countdown =
      ann.countdownEnabled && ann.countdownEndAtMs
        ? formatPopupCountdown(ann.countdownEndAtMs, nowMs)
        : null;

    return (
      <div
        className={`w-full rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.85)] text-[#131722] dark:text-[#E2E8F0] transition-all ${
          surface === 'high_contrast'
            ? 'bg-[#FFFFFF] dark:bg-[#0B0E11]'
            : 'bg-[#FFFFFF] dark:bg-[#131722]'
        }`}
        style={{
          borderWidth: surface === 'alert_border' ? '2px' : '1px',
          borderStyle: 'solid',
          borderColor:
            surface === 'alert_border'
              ? accent
              : isLight
              ? '#E0E3EB'
              : '#2A2E39'
        }}
      >
        {/* Top Accent Strip */}
        <div className="h-1 w-full" style={{ backgroundColor: accent }} />

        {/* Optional Banner Image */}
        {ann.bannerImageUrl && ann.bannerImageUrl.trim() && (
          <div className="w-full max-h-40 bg-[#F8F9FD] dark:bg-[#0B0E11] border-b border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden">
            <img
              src={ann.bannerImageUrl}
              alt={ann.title}
              className="w-full h-full max-h-40 object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Official Brand Identity Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {showLogo && (
                <img
                  src="/mbk-logo.png"
                  alt={sender}
                  className="w-8 h-8 rounded-md object-contain bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-0.5 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-[#131722] dark:text-white truncate">
                    {sender}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold inline-flex items-center gap-0.5 shrink-0"
                    style={{
                      backgroundColor: isLightGoldAccent ? '#FDF6E3' : `${accent}18`,
                      color: readableAccentText,
                      border: `1px solid ${isLightGoldAccent ? '#EFE0B4' : `${accent}55`}`
                    }}
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>VERIFIED</span>
                  </span>
                </div>
                {(ann.badgeText || ann.type) && (
                  <span
                    className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5"
                    style={{ color: readableAccentText }}
                  >
                    {ann.badgeText ||
                      (ann.type === 'offer'
                        ? isAr
                          ? 'عرض خاص وحصري'
                          : 'SPECIAL OFFER'
                        : ann.type === 'event'
                        ? isAr
                          ? 'تحذير حدث اقتصادي هام'
                          : 'MACRO EVENT ALERT'
                        : isAr
                        ? 'إعلان رسمي'
                        : 'OFFICIAL ANNOUNCEMENT')}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(ann, ann.targetTabs.includes('on_open'))}
              className="p-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Headline & Rich Message */}
          <div className="space-y-1.5">
            <h4 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white leading-snug">
              {ann.title}
            </h4>
            <p className="text-xs text-[#4A5162] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-wrap break-words">
              {ann.message}
            </p>
          </div>

          {/* Live Ticking Offer Countdown Timer */}
          {countdown && !countdown.expired && (
            <div className="p-2.5 rounded-md bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#131722] dark:text-[#E2E8F0]">
                <Clock className="w-3.5 h-3.5" style={{ color: readableAccentText }} />
                <span>
                  {ann.countdownLabel || (isAr ? 'ينتهي العرض خلال' : 'Offer ends in')}
                </span>
              </div>

              <div
                className="flex items-center gap-1 font-mono tabular-nums text-xs font-bold"
                dir="ltr"
              >
                {[
                  { val: countdown.dd, unit: 'D' },
                  { val: countdown.hh, unit: 'H' },
                  { val: countdown.mm, unit: 'M' },
                  { val: countdown.ss, unit: 'S' }
                ].map((part, idx) => (
                  <React.Fragment key={part.unit}>
                    {idx > 0 && <span className="text-[#787B86] dark:text-[#64748B]">:</span>}
                    <span
                      className="px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#131722] border text-[#131722] dark:text-white"
                      style={{ borderColor: isLightGoldAccent ? '#EFE0B4' : `${accent}55` }}
                    >
                      {part.val}
                      <span className="text-[9px] text-[#4A5162] dark:text-[#94A3B8] ms-0.5">{part.unit}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {ann.ctaType && ann.ctaType !== 'none' && ann.ctaType !== 'url' && (
              <button
                type="button"
                onClick={() => handleCtaClick(ann)}
                className="px-4 py-2 rounded-md text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow transition-transform active:scale-98"
                style={{
                  backgroundColor: ctaBg,
                  color: ctaBg.toUpperCase() === '#F0B90B' ? '#0B0E11' : '#FFFFFF'
                }}
              >
                {ann.ctaType === 'plans' && <Crown className="w-3.5 h-3.5" />}
                {ann.ctaType === 'promo' && <KeyRound className="w-3.5 h-3.5" />}
                {ann.ctaType === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
                {ann.ctaType === 'navigate_tab' && <Layout className="w-3.5 h-3.5" />}
                {ann.ctaType === 'support_chat' && <Headphones className="w-3.5 h-3.5" />}
                <span>
                  {ann.ctaLabel ||
                    (ann.ctaType === 'plans'
                      ? isAr
                        ? 'عرض الباقات والترقية الآن'
                        : 'View Plans & Upgrade'
                      : ann.ctaType === 'support_chat'
                      ? isAr
                        ? 'مراسلة الدعم الفني @mbktrading'
                        : 'Contact @mbktrading Support'
                      : ann.ctaType === 'calendar'
                      ? isAr
                        ? 'فتح التقويم الاقتصادي'
                        : 'Open Economic Calendar'
                      : isAr
                      ? 'فتح القسم الآن'
                      : 'Open Now')}
                </span>
              </button>
            )}

            {ann.ctaType === 'url' && ann.ctaUrl && (
              <a
                href={ann.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  incrementAnnouncementMetric(ann.id, 'clicks').catch(() => {});
                  handleDismiss(ann, ann.targetTabs.includes('on_open'));
                }}
                className="px-4 py-2 rounded-md text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                style={{
                  backgroundColor: ctaBg,
                  color: ctaBg.toUpperCase() === '#F0B90B' ? '#0B0E11' : '#FFFFFF'
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{ann.ctaLabel || (isAr ? 'فتح الرابط' : 'Open Link')}</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => handleDismiss(ann, ann.targetTabs.includes('on_open'))}
              className="px-3.5 py-2 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white text-xs font-semibold cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const activePlacement = matchingAnnouncement?.placement || 'center_modal';

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. ONE-HOUR UPCOMING HIGH-IMPACT ECONOMIC EVENT POPUP (CPI / FED / NFP) */}
      {showMacroWarning && upcomingWithinOneHourEvent && (
        <div className="fixed bottom-3 sm:bottom-5 end-3 start-3 sm:start-auto sm:end-5 sm:max-w-md z-[68] animate-fade-in">
          <div className="bg-[#FFFFFF] dark:bg-[#131722] border-2 border-[#EF5350] rounded-xl p-4 shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_14px_45px_rgba(239,83,80,0.35)] text-[#131722] dark:text-[#E2E8F0]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FDECEE] dark:bg-[#EF5350]/20 border border-[#F5C2C7] dark:border-[#EF5350]/50 text-[#D93848] dark:text-[#EF5350] flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#EF5350] text-white text-[10px] font-mono tabular-nums font-extrabold uppercase flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3" />
                      <span>
                        {isAr
                          ? `متبقي ${Math.max(
                              1,
                              Math.ceil(
                                (upcomingWithinOneHourEvent.releaseTimeMs - nowMs) / (60 * 1000)
                              )
                            )} دقيقة`
                          : `${Math.max(
                              1,
                              Math.ceil(
                                (upcomingWithinOneHourEvent.releaseTimeMs - nowMs) / (60 * 1000)
                              )
                            )}m LEFT`}
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#0B0E11] text-[#131722] dark:text-[#E2E8F0] border border-[#E0E3EB] dark:border-[#2A2E39] text-[10px] font-mono tabular-nums font-bold">
                      {new Date(upcomingWithinOneHourEvent.releaseTimeMs).toLocaleTimeString(
                        isAr ? 'ar-AE' : 'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FDF6E3] dark:bg-[#F0B90B]/20 text-[#9A6700] dark:text-[#F0B90B] border border-[#EFE0B4] dark:border-[#F0B90B]/40 text-[10px] font-mono font-bold">
                      {upcomingWithinOneHourEvent.code} • {upcomingWithinOneHourEvent.currency}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDismiss(upcomingWithinOneHourEvent.id)}
                    className="p-1 rounded-md text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#1E222D] transition-colors cursor-pointer shrink-0"
                    title={isAr ? 'إغلاق التحذير' : 'Dismiss warning'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-xs sm:text-sm font-black text-[#131722] dark:text-white leading-snug">
                  {isAr ? upcomingWithinOneHourEvent.titleAr : upcomingWithinOneHourEvent.titleEn}
                </h4>

                <div className="p-2.5 rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] space-y-1">
                  <div className="text-[10px] font-bold text-[#089981] dark:text-[#26A69A]">
                    {isAr
                      ? '⚡ التأثير المتوقع على الذهب (XAUUSD) والناسداك (US100):'
                      : '⚡ XAUUSD & US100 Trading Impact:'}
                  </div>
                  <p className="text-[11px] text-[#131722] dark:text-[#E2E8F0] leading-relaxed">
                    {isAr
                      ? upcomingWithinOneHourEvent.goldNasdaqImpactAr ||
                        upcomingWithinOneHourEvent.descriptionAr
                      : upcomingWithinOneHourEvent.goldNasdaqImpactEn ||
                        upcomingWithinOneHourEvent.descriptionEn}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[10px]">
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
                    <span className="text-[#4A5162] dark:text-[#94A3B8]">{isAr ? 'المتوقع:' : 'Forecast:'}</span>
                    <span className="text-[#9A6700] dark:text-[#F0B90B] font-bold">
                      {upcomingWithinOneHourEvent.forecast || '—'}
                    </span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#F0F3FA] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
                    <span className="text-[#4A5162] dark:text-[#94A3B8]">{isAr ? 'السابق:' : 'Previous:'}</span>
                    <span className="text-[#131722] dark:text-white font-bold">
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
                      className="px-3.5 py-1.5 rounded-md bg-[#2962FF] hover:bg-[#1E53E5] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isAr ? 'فتح التقويم الاقتصادي' : 'Open Economic Calendar'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(upcomingWithinOneHourEvent.id)}
                    className="px-3 py-1.5 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white text-[11px] font-bold cursor-pointer"
                  >
                    {isAr ? 'تم الاطلاع — تأمين الصفقات' : 'Got It'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN PRO POPUP STUDIO RENDERER (4 PLACEMENTS) */}
      {showAdminAnnouncement && matchingAnnouncement && (
        <>
          {activePlacement === 'center_modal' ? (
            <div className="fixed inset-0 z-[72] bg-[#131722]/45 dark:bg-black/75 dark:backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-lg">
                {renderAdminPopupCard(matchingAnnouncement)}
              </div>
            </div>
          ) : activePlacement === 'top_banner' ? (
            <div className="fixed top-14 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-[70] animate-fade-in">
              {renderAdminPopupCard(matchingAnnouncement)}
            </div>
          ) : activePlacement === 'bottom_card' ? (
            <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[70] animate-fade-in">
              {renderAdminPopupCard(matchingAnnouncement)}
            </div>
          ) : (
            <div className="fixed bottom-3 sm:bottom-5 end-3 start-3 sm:start-auto sm:end-5 sm:w-full sm:max-w-md z-[70] animate-fade-in">
              {renderAdminPopupCard(matchingAnnouncement)}
            </div>
          )}
        </>
      )}
    </div>
  );
};
