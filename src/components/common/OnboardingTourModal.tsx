import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Radio,
  Bell,
  BellRing,
  CheckCircle2,
  Activity,
  Eye,
  Move,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Bot,
  Gem,
  Calendar,
  Newspaper,
  GraduationCap,
  MessageSquare,
  Headphones,
  Moon,
  Sun,
  Globe,
  Download,
  BarChart3,
  Star,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import {
  AppNotificationPermission,
  getNotificationPermissionState,
  isAppNotificationsEnabled,
  requestAppNotificationPermission,
  setAppNotificationsEnabled
} from '../../utils/mobileNotifications';

export const ONBOARDING_TOUR_DONE_KEY = 'mbk_onboarding_tour_v2_1_done';
export const ONBOARDING_TOUR_VIP_DONE_KEY = 'mbk_onboarding_tour_v2_1_vip_done';

export function hasCompletedOnboardingTour(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_TOUR_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingTourDone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_TOUR_DONE_KEY, '1');
  } catch {
    // ignore storage quota/privacy errors
  }
}

export function hasCompletedPostVipTour(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_TOUR_VIP_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPostVipTourDone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_TOUR_VIP_DONE_KEY, '1');
  } catch {
    // ignore storage quota/privacy errors
  }
}

export interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  isPostVipActivation?: boolean;
  onNavigateToTab?: (tab: 'signals' | 'proChart' | 'chart') => void;
}

const TOTAL_STEPS = 7;

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  lang,
  isPostVipActivation = false,
  onNavigateToTab
}) => {
  const isAr = lang === 'ar';
  const [step, setStep] = useState<number>(0);

  // Live Web Push state for Step 2 interactive button (strictly localStorage + browser Notification API)
  const [notifPermission, setNotifPermission] = useState<AppNotificationPermission>(() =>
    getNotificationPermissionState()
  );
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => isAppNotificationsEnabled());
  const [enablingPush, setEnablingPush] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  const isPushActive = notifPermission === 'granted' && notifEnabled;

  // Reset to step 0 when opened and sync current push state
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setNotifPermission(getNotificationPermissionState());
    setNotifEnabled(isAppNotificationsEnabled());
    setPushFeedback(null);
  }, [isOpen]);

  // Listen for push preference changes from header/settings while modal is open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handleNotifChange = () => {
      setNotifPermission(getNotificationPermissionState());
      setNotifEnabled(isAppNotificationsEnabled());
    };
    window.addEventListener('mbk-notif-pref-changed', handleNotifChange);
    return () => window.removeEventListener('mbk-notif-pref-changed', handleNotifChange);
  }, [isOpen]);

  const handleFinish = useCallback(() => {
    soundManager.playClick();
    markOnboardingTourDone();
    if (isPostVipActivation) {
      markPostVipTourDone();
    }
    onClose();
  }, [isPostVipActivation, onClose]);

  const handleJumpAndFinish = useCallback(
    (tab: 'signals' | 'proChart' | 'chart') => {
      soundManager.playClick();
      markOnboardingTourDone();
      if (isPostVipActivation) {
        markPostVipTourDone();
      }
      onNavigateToTab?.(tab);
      onClose();
    },
    [isPostVipActivation, onNavigateToTab, onClose]
  );

  const handleNext = useCallback(() => {
    soundManager.playClick();
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }, [step, handleFinish]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      soundManager.playClick();
      setStep((s) => s - 1);
    }
  }, [step]);

  // Full keyboard navigation (Esc + RTL/LTR aware Left/Right arrows)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isAr) handleBack();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isAr) handleNext();
        else handleBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isAr, handleNext, handleBack, handleFinish]);

  // 1-tap Push Notification activation wired directly to existing Web Push handler
  const handleEnablePushClick = async () => {
    soundManager.playClick();
    setPushFeedback(null);
    setEnablingPush(true);
    try {
      const currentPerm = getNotificationPermissionState();
      if (currentPerm === 'unsupported') {
        setNotifPermission('unsupported');
        setPushFeedback(
          isAr
            ? 'للتفعيل على آيفون، أضف التطبيق للشاشة الرئيسية (Add to Home Screen) ثم فعّل الإشعارات.'
            : 'On iPhone/Safari, add MBK Trading to your Home Screen first, then enable notifications.'
        );
        return;
      }

      if (currentPerm === 'denied') {
        setNotifPermission('denied');
        setPushFeedback(
          isAr
            ? 'الإشعارات محظورة من إعدادات المتصفح. قم بالسماح بها من شريط العنوان ثم حاول مجدداً.'
            : 'Notifications are blocked in browser settings. Allow them from the address bar and retry.'
        );
        return;
      }

      if (currentPerm === 'granted') {
        setAppNotificationsEnabled(true);
        setNotifPermission('granted');
        setNotifEnabled(true);
        return;
      }

      const result = await requestAppNotificationPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setAppNotificationsEnabled(true);
        setNotifEnabled(true);
      } else if (result === 'denied') {
        setPushFeedback(
          isAr
            ? 'تم رفض الإذن من المتصفح. يمكنك تفعيلها لاحقاً من إعدادات المتصفح.'
            : 'Permission was declined. You can enable notifications anytime in browser settings.'
        );
      }
    } finally {
      setEnablingPush(false);
    }
  };

  if (!isOpen) return null;

  const NextIcon = isAr ? ChevronLeft : ChevronRight;
  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  const renderStepPreview = () => {
    switch (step) {
      case 0:
        return (
          <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#4A5162] dark:text-[#94A3B8]">
              <span>{isAr ? 'أدوات التحكم السريع في المساحة' : 'Quick Workspace Controls'}</span>
              <span className="font-mono tabular-nums text-[10px] text-[#B47B00] dark:text-[#F0B90B] font-bold">
                v2.1 TERMINAL
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center text-center gap-1.5">
                <div className="flex items-center gap-1 text-[#131722] dark:text-[#F8FAFC]">
                  <Moon className="w-3.5 h-3.5 text-[#B47B00] dark:text-[#F0B90B]" />
                  <span className="text-[#CBD2DF] dark:text-[#2A2E39]">/</span>
                  <Sun className="w-3.5 h-3.5 text-[#4A5162] dark:text-[#94A3B8]" />
                </div>
                <span className="text-[11px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                  {isAr ? 'ليلي / نهاري' : 'Dark / Day'}
                </span>
              </div>

              <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center text-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                <span className="text-[11px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                  {isAr ? 'العربية / EN' : 'AR / EN'}
                </span>
              </div>

              <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center text-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#1E53E5] dark:text-[#60A5FA]" />
                <span className="text-[11px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                  {isAr ? 'تثبيت PWA' : 'Install App'}
                </span>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3.5 space-y-3">
            {/* Mini Live Signal Preview */}
            <div className="rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#E6F5F2] dark:bg-[#26A69A]/15 border border-[#B3E2D9] dark:border-[#26A69A]/35 flex items-center justify-center shrink-0">
                  <Radio className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-extrabold text-[#131722] dark:text-[#F8FAFC]">
                      XAUUSD
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#26A69A]/20 text-[#089981] dark:text-[#26A69A]">
                      BUY
                    </span>
                  </div>
                  <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                    {isAr ? 'بوت وتوصيات MBK • تنبيه TradingView' : 'MBK Bot & Signals • TradingView Alert'}
                  </div>
                </div>
              </div>
              <div className="text-end font-mono tabular-nums shrink-0" dir="ltr">
                <div className="text-[11px] font-bold text-[#089981] dark:text-[#26A69A]">TP1 • TP2</div>
                <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8]">LIVE PUSH</div>
              </div>
            </div>

            {/* Interactive 1-Tap Web Push Control */}
            <div className="flex flex-col gap-2">
              {isPushActive ? (
                <div className="w-full px-3.5 py-2.5 rounded-md bg-[#E6F5F2] dark:bg-[#26A69A]/15 border border-[#B3E2D9] dark:border-[#26A69A]/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#089981] dark:text-[#26A69A] shrink-0" />
                    <span className="text-xs font-bold text-[#089981] dark:text-[#26A69A] truncate">
                      {isAr ? 'الإشعارات مفعّلة' : 'Notifications Active'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#089981] dark:text-[#26A69A] shrink-0">
                    ON
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={enablingPush}
                  onClick={handleEnablePushClick}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-md bg-[#B47B00] hover:bg-[#9A6700] dark:bg-[#F0B90B] dark:hover:bg-[#E0AC08] text-white dark:text-[#0B0E11] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <BellRing className="w-4 h-4 shrink-0" />
                  <span>
                    {enablingPush
                      ? isAr
                        ? 'جاري تفعيل الإشعارات...'
                        : 'Enabling Notifications...'
                      : isAr
                      ? 'تفعيل إشعارات الخلفية'
                      : 'Enable Push Notifications'}
                  </span>
                </button>
              )}

              {pushFeedback && (
                <div className="flex items-start gap-1.5 text-[11px] text-[#B47B00] dark:text-[#F0B90B] px-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="leading-snug">{pushFeedback}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3.5 space-y-2.5">
            {/* Simulated Pro Chart Toolbar Highlighting MBK Admin Layer Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E0E3EB] dark:border-[#2A2E39]">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#131722] dark:text-[#F8FAFC]">
                <Activity className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                <span>{isAr ? 'شارت MBK الاحترافي' : 'MBK Pro Chart'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E6F5F2] dark:bg-[#26A69A]/15 border border-[#089981] dark:border-[#26A69A] text-[#089981] dark:text-[#26A69A] text-[11px] font-bold">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'تحليل الإدارة (VIP)' : 'MBK Admin Layer'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#089981] dark:bg-[#26A69A]" />
              </div>
            </div>

            {/* Clean Institutional Mini Chart Illustration */}
            <div className="relative h-20 rounded bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] px-3 py-2 flex items-end justify-between gap-1.5 overflow-hidden">
              <div className="absolute inset-x-3 top-5 border-t border-dashed border-[#089981]/60 dark:border-[#26A69A]/70 flex justify-end">
                <span className="text-[9px] font-mono font-bold text-[#089981] dark:text-[#26A69A] bg-[#FFFFFF] dark:bg-[#131722] px-1 -mt-2">
                  TP ZONE
                </span>
              </div>
              <div className="absolute inset-x-3 bottom-4 border-t border-dashed border-[#B47B00]/65 dark:border-[#F0B90B]/70 flex justify-end">
                <span className="text-[9px] font-mono font-bold text-[#B47B00] dark:text-[#F0B90B] bg-[#FFFFFF] dark:bg-[#131722] px-1 -mt-2">
                  ENTRY
                </span>
              </div>
              {[28, 36, 32, 44, 40, 54, 48, 62, 58, 70, 66, 76].map((h, idx) => {
                const isUp = idx % 3 !== 2;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full max-w-[10px] rounded-[1px] ${
                        isUp ? 'bg-[#089981] dark:bg-[#26A69A]' : 'bg-[#D93848] dark:bg-[#EF5350]'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          /* Step 4 — Prominent Highlighted Callout Card for the Flexible Floating Quick-Access Panel */
          <div className="rounded-lg bg-[#FDF6E3]/65 dark:bg-[#1E222D] border-2 border-[#B47B00] dark:border-[#F0B90B] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#9A6700] dark:text-[#F0B90B]">
                <Star className="w-4 h-4 fill-current shrink-0" />
                <span>{isAr ? 'ميزة مميزة: مرونة كاملة في التحكم' : 'Featured: Fully Flexible Control'}</span>
              </div>
              <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#0B0E11] px-1.5 py-1 rounded border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8]">
                <PanelLeft className="w-3 h-3" />
                <PanelBottom className="w-3 h-3 text-[#B47B00] dark:text-[#F0B90B]" />
                <PanelRight className="w-3 h-3" />
              </div>
            </div>

            {/* Simulated Drag Handle + 3 Quick-Access Tabs */}
            <div className="rounded-md bg-[#FFFFFF] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] overflow-hidden">
              <div className="py-1.5 bg-[#F8F9FD] dark:bg-[#131722] border-b border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#4A5162] dark:text-[#94A3B8]">
                <Move className="w-3 h-3 text-[#B47B00] dark:text-[#F0B90B]" />
                <span>
                  {isAr ? 'اسحب الحافة للأعلى أو الأسفل أو بدّل الموضع' : 'Drag handle up, down, or dock Left / Bottom / Right'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-2">
                <div className="p-2 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center gap-1 text-center">
                  <BarChart3 className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                  <span className="text-[10px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                    {isAr ? 'البوت والصفقات' : 'Bot & Trades'}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center gap-1 text-center">
                  <MessageSquare className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                  <span className="text-[10px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                    {isAr ? 'الماسنجر' : 'Messenger'}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex flex-col items-center gap-1 text-center">
                  <Bot className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                  <span className="text-[10px] font-bold text-[#131722] dark:text-[#F8FAFC] leading-tight">
                    {isAr ? 'ذكاء MBK' : 'MBK AI'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#089981] dark:text-[#26A69A]" />
                  <span className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC]">
                    {isAr ? 'ذكاء MBK' : 'MBK AI'}
                  </span>
                </div>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#26A69A]/15 text-[#089981] dark:text-[#26A69A]">
                  v2.1+
                </span>
              </div>
              <p className="text-[11px] text-[#4A5162] dark:text-[#94A3B8] leading-snug">
                {isAr
                  ? 'المحلل الكمي الذكي للأسواق مع تحديثات مستمرة قادمة.'
                  : 'Quantitative market analyst with ongoing v2.1+ upgrades.'}
              </p>
            </div>

            <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Gem className="w-4 h-4 text-[#B47B00] dark:text-[#F0B90B]" />
                  <span className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC]">
                    {isAr ? 'نسخ الصفقات' : 'Copy Trading'}
                  </span>
                </div>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FDF6E3] dark:bg-[#F0B90B]/15 text-[#9A6700] dark:text-[#F0B90B]">
                  ELITE
                </span>
              </div>
              <p className="text-[11px] text-[#4A5162] dark:text-[#94A3B8] leading-snug">
                {isAr
                  ? 'قسم باقة Elite لربط ومتابعة النسخ الآلي والمدار للصفقات.'
                  : 'Inside the Elite tab to connect and follow automated copying.'}
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39]">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-[#D93848] dark:text-[#EF5350] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC] truncate">
                    {isAr ? 'التقويم الاقتصادي وأخبار MBK' : 'Economic Calendar & MBK News'}
                  </div>
                  <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                    {isAr ? 'تحذيرات الأخبار عالية التأثير (CPI / Fed / NFP)' : 'High-impact macro alerts (CPI / Fed / NFP)'}
                  </div>
                </div>
              </div>
              <Newspaper className="w-4 h-4 text-[#4A5162] dark:text-[#94A3B8] shrink-0" />
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39]">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-4 h-4 text-[#B47B00] dark:text-[#F0B90B] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC] truncate">
                    {isAr ? 'الأكاديمية (MBK Academy)' : 'MBK Trading Academy'}
                  </div>
                  <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                    {isAr ? 'دروس منظمة واستراتيجيات وإدارة مخاطر' : 'Structured lessons, playbooks & risk guides'}
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold text-[#089981] dark:text-[#26A69A] shrink-0">
                {isAr ? 'تعليمي' : 'GUIDES'}
              </span>
            </div>
          </div>
        );

      case 6:
      default:
        return (
          <div className="rounded-lg bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#089981] dark:text-[#26A69A] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC] truncate">
                    {isAr ? 'الشات العام للمتداولين' : 'Public Trading Room'}
                  </div>
                  <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                    {isAr ? 'ناقش الفرص مع المجتمع' : 'Discuss setups with traders'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center gap-2.5">
                <Headphones className="w-4 h-4 text-[#B47B00] dark:text-[#F0B90B] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#131722] dark:text-[#F8FAFC] truncate" dir="ltr">
                    @mbktrading DM
                  </div>
                  <div className="text-[10px] text-[#4A5162] dark:text-[#94A3B8] truncate">
                    {isAr ? 'دعم مباشر للحساب والاشتراك' : 'Private account & VIP desk'}
                  </div>
                </div>
              </div>
            </div>

            {onNavigateToTab && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleJumpAndFinish('proChart')}
                  className="flex-1 min-w-[130px] px-3 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-[#F8FAFC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-[#089981] dark:text-[#26A69A]" />
                  <span>{isAr ? 'الانتقال لشارت MBK' : 'Open Pro Chart'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#4A5162] dark:text-[#94A3B8]" />
                </button>
                <button
                  type="button"
                  onClick={() => handleJumpAndFinish('signals')}
                  className="flex-1 min-w-[130px] px-3 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-[#F8FAFC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-[#B47B00] dark:text-[#F0B90B]" />
                  <span>{isAr ? 'الانتقال للتوصيات' : 'Open Live Signals'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#4A5162] dark:text-[#94A3B8]" />
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  const stepsContent = [
    {
      icon: ShieldCheck,
      iconColor: 'text-[#B47B00] dark:text-[#F0B90B]',
      titleAr: 'مرحباً بك في MBK Trading',
      titleEn: 'Welcome to MBK Trading v2.1',
      bodyAr:
        'أهلاً بك في مساحة التداول الاحترافية. يمكنك من الشريط العلوي أو إعدادات الحساب التبديل بين الوضع الليلي (الافتراضي) والوضع النهاري الأبيض، تغيير اللغة بين العربية والإنجليزية، أو تثبيت التطبيق على الشاشة الرئيسية (PWA) للوصول الفوري من هاتفك.',
      bodyEn:
        'Welcome to your institutional trading workspace. From the top bar or App Settings, switch anytime between Dark Mode (default) and White Day Mode, toggle Arabic / English, or install the PWA to your Home Screen for instant mobile access.'
    },
    {
      icon: Bell,
      iconColor: 'text-[#089981] dark:text-[#26A69A]',
      titleAr: 'التوصيات وتنبيهات البوت',
      titleEn: 'Live Signals & Bot Alerts',
      bodyAr:
        'ستجد جميع صفقات الإدارة الرسمية وتنبيهات بوت TradingView اللحظية داخل تبويب «بوت وتوصيات MBK». فعّل إشعارات الخلفية بضغطة واحدة أدناه حتى لا تفوتك أي صفقة أو تحديث حتى عند إغلاق التطبيق.',
      bodyEn:
        'Official live setups and real-time TradingView Bot Alerts appear inside the “MBK Bot & Signals” tab. Tap below to enable instant background push alerts so you never miss an entry or update.'
    },
    {
      icon: Activity,
      iconColor: 'text-[#089981] dark:text-[#26A69A]',
      titleAr: 'الشارت ومزامنة شارت فريق MBK',
      titleEn: 'Pro Charts & MBK Team Chart Sync',
      bodyAr:
        'استخدم «الشارت المباشر» و«شارت MBK الاحترافي» للتحليل والرسم بحرية. لمزامنة وعرض تحليلات ومستويات فريق MBK مباشرة على شارتك، فعّل زر «تحليل الإدارة (VIP)» من الشريط العلوي داخل شارت MBK الاحترافي.',
      bodyEn:
        'Analyze markets with “Live Chart” and “MBK Pro Chart”. To sync and load the MBK Team’s live markups, zones, and trade levels directly onto your canvas, toggle the “MBK Admin Layer” button in the Pro Chart top toolbar.'
    },
    {
      icon: Move,
      iconColor: 'text-[#B47B00] dark:text-[#F0B90B]',
      titleAr: 'اللوحة العائمة المرنة للوصول السريع',
      titleEn: 'Flexible Floating Quick-Access Panel',
      bodyAr:
        'اللوحة المساعدة مصممة لتمنحك مرونة كاملة دون حجب الشارت: اسحب حافتها للأعلى أو الأسفل أو غيّر موضعها (يسار / أسفل / يمين) في أي لحظة، واضغط عليها للوصول الفوري بضغطة واحدة إلى «البوت والصفقات» و«الماسنجر» و«ذكاء MBK» من أي صفحة.',
      bodyEn:
        'Your resizable Helping Panel stays completely flexible: drag its edge up, down, or dock it Left, Bottom, or Right so it never blocks your chart. Tap it anytime for 1-click access to “Bot & Trades”, “Messenger”, and “MBK AI” from anywhere in the app.'
    },
    {
      icon: Bot,
      iconColor: 'text-[#089981] dark:text-[#26A69A]',
      titleAr: 'الذكاء الاصطناعي ونسخ الصفقات',
      titleEn: 'MBK AI & Copy Trading',
      bodyAr:
        'افتح تبويب «ذكاء MBK» للحصول على تحليلات كمية فورية للأسواق (مع ترقيات ذكاء اصطناعي متواصلة ضمن إصدارات v2.1+). كما يتيح قسم «باقة Elite» الوصول إلى Copy Trading لمتابعة وربط نسخ الصفقات الآلي والمدار.',
      bodyEn:
        'Use the “MBK AI” tab for quantitative market insights (with ongoing AI upgrades rolling out across v2.1+). Inside the “Elite” section, explore Copy Trading to connect and follow automated or managed trade copying.'
    },
    {
      icon: Calendar,
      iconColor: 'text-[#D93848] dark:text-[#EF5350]',
      titleAr: 'التقويم الاقتصادي، تنبيهات الأخبار والأكاديمية',
      titleEn: 'Economic Calendar, News & Academy',
      bodyAr:
        'تابع «التقويم الاقتصادي» و«أخبار MBK» وتنبيهات الأخبار عالية التأثير قبل صدورها بساعة لتأمين صفقاتك قبل التقلبات. وتصفح تبويب «الأكاديمية» للاستفادة من الدروس المنظمة واستراتيجيات التداول وإدارة المخاطر.',
      bodyEn:
        'Check “Calendar” and “MBK News” alongside automatic high-impact macro warnings so major releases never catch you off-guard. Visit the “Academy” tab for structured lessons, strategies, and trading guides.'
    },
    {
      icon: MessageSquare,
      iconColor: 'text-[#B47B00] dark:text-[#F0B90B]',
      titleAr: 'المجتمع والدعم المباشر',
      titleEn: 'Community Chat & Direct Support',
      bodyAr:
        'تفاعل مع المتداولين وشارك الفرص داخل «الشات العام» في ماسنجر المتداولين، أو راسل حساب «@mbktrading» عبر الرسائل الخاصة للحصول على دعم مباشر وفوري للحساب أو الاشتراك أو المساعدة الفنية.',
      bodyEn:
        'Discuss live setups with traders inside the “Public Trading Room” in MBK Messenger, or message “@mbktrading” privately via Direct Messages for fast account, subscription, or technical support.'
    }
  ];

  const current = stepsContent[step];
  const StepIcon = current.icon;
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'جولة تعريفية في منصة MBK Trading' : 'MBK Trading Interactive Platform Tour'}
      className="fixed inset-0 z-[85] bg-[#131722]/55 dark:bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div className="w-full sm:max-w-[540px] max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] shadow-[0_12px_40px_rgba(19,23,34,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden text-[#131722] dark:text-[#F8FAFC]">
        {/* Mobile bottom-sheet handle bar */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 bg-[#FFFFFF] dark:bg-[#131722]">
          <div className="w-10 h-1 rounded-full bg-[#CBD2DF] dark:bg-[#2A2E39]" />
        </div>

        {/* Sticky Header */}
        <div className="px-4 sm:px-6 pt-3 pb-3 border-b border-[#E0E3EB] dark:border-[#2A2E39] bg-[#FFFFFF] dark:bg-[#131722] shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/mbk-logo.png"
                alt="MBK Trading"
                className="w-7 h-7 rounded-md object-contain bg-[#F8F9FD] dark:bg-[#0B0E11] border border-[#E0E3EB] dark:border-[#2A2E39] p-0.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold tracking-tight text-[#131722] dark:text-[#F8FAFC] truncate">
                    {isAr ? 'جولة منصة MBK Trading' : 'MBK Trading Tour'}
                  </span>
                  {isPostVipActivation && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FDF6E3] dark:bg-[#F0B90B]/15 border border-[#EFE0B4] dark:border-[#F0B90B]/40 text-[#9A6700] dark:text-[#F0B90B] whitespace-nowrap">
                      {isAr ? 'تم تفعيل الاشتراك' : 'Subscription Active'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className="px-2 py-0.5 rounded bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] font-mono tabular-nums text-[11px] font-bold text-[#4A5162] dark:text-[#94A3B8]"
                dir="ltr"
              >
                {step + 1} / {TOTAL_STEPS}
              </span>
              <button
                type="button"
                onClick={handleFinish}
                aria-label={isAr ? 'إغلاق الجولة' : 'Close tour'}
                className="w-9 h-9 rounded-md bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-[#F8FAFC] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Segment Interactive Progress Bar */}
          <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label={isAr ? 'خطوات الجولة' : 'Tour steps'}>
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
              const isCompleted = idx < step;
              const isCurrent = idx === step;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`${isAr ? 'الخطوة' : 'Step'} ${idx + 1}`}
                  onClick={() => {
                    soundManager.playClick();
                    setStep(idx);
                  }}
                  className={`h-1.5 rounded-full transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#B47B00] dark:bg-[#F0B90B]'
                      : isCompleted
                      ? 'bg-[#089981] dark:bg-[#26A69A]'
                      : 'bg-[#E0E3EB] dark:bg-[#2A2E39] hover:bg-[#CBD2DF] dark:hover:bg-[#3A4050]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {/* Step Heading + Crisp Icon */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F8F9FD] dark:bg-[#1E222D] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-center shrink-0">
              <StepIcon className={`w-5 h-5 ${current.iconColor}`} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-[11px] font-mono tabular-nums font-bold uppercase tracking-wider text-[#4A5162] dark:text-[#94A3B8]">
                {isAr ? `الخطوة ${step + 1} من ${TOTAL_STEPS}` : `STEP ${step + 1} OF ${TOTAL_STEPS}`}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#131722] dark:text-[#F8FAFC] leading-snug">
                {isAr ? current.titleAr : current.titleEn}
              </h2>
            </div>
          </div>

          {/* Crisp Step Copy */}
          <p className="text-[13px] sm:text-sm text-[#4A5162] dark:text-[#CBD5E1] leading-relaxed">
            {isAr ? current.bodyAr : current.bodyEn}
          </p>

          {/* Step-Specific Institutional Visual Preview */}
          {renderStepPreview()}
        </div>

        {/* Sticky Footer Navigation */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-[#E0E3EB] dark:border-[#2A2E39] bg-[#F8F9FD] dark:bg-[#0B0E11] flex items-center justify-between gap-2 shrink-0">
          <div>
            {!isLastStep ? (
              <button
                type="button"
                onClick={handleFinish}
                className="min-h-[40px] px-2.5 py-2 rounded-md text-xs font-bold text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
              >
                {isAr ? 'تخطي' : 'Skip'}
              </button>
            ) : (
              <span className="text-[11px] font-medium text-[#4A5162] dark:text-[#94A3B8] hidden sm:inline">
                {isAr ? 'يمكنك إعادة الجولة من الإعدادات في أي وقت' : 'Replay anytime from Settings'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[42px] px-3.5 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-xs font-bold text-[#131722] dark:text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <BackIcon className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'السابق' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`min-h-[42px] px-4 sm:px-5 py-2 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                isLastStep
                  ? 'bg-[#089981] hover:bg-[#07846F] dark:bg-[#26A69A] dark:hover:bg-[#209287] text-white dark:text-[#0B0E11]'
                  : 'bg-[#B47B00] hover:bg-[#9A6700] dark:bg-[#F0B90B] dark:hover:bg-[#E0AC08] text-white dark:text-[#0B0E11]'
              }`}
            >
              <span>
                {isLastStep
                  ? isAr
                    ? 'ابدأ التداول'
                    : 'Start Trading'
                  : isAr
                  ? 'التالي'
                  : 'Next'}
              </span>
              {!isLastStep && <NextIcon className="w-4 h-4 shrink-0" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
