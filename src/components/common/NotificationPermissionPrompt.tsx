import React, { useEffect, useState } from 'react';
import { Bell, BellRing, CheckCircle2, Settings, Smartphone, Volume2, X } from 'lucide-react';
import { useSignalsContext } from '../../context/SignalsContext';
import { soundManager } from '../../utils/audio';
import {
  dispatchMobileAppNotification,
  getNotificationPermissionState,
  isAppNotificationsEnabled,
  setAppNotificationsEnabled
} from '../../utils/mobileNotifications';

interface Props {
  lang?: 'ar' | 'en';
}

/**
 * Displays a prompt EVERY time the user opens or uses the website/PWA
 * until browser/mobile notifications are explicitly granted and active.
 * Dismissal is intentionally session-only (React state, not persisted to localStorage)
 * so users who haven't allowed notifications are prompted again on their next visit.
 */
export const NotificationPermissionPrompt: React.FC<Props> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const { notificationPermission, requestNotificationPermission, addToast } = useSignalsContext();

  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => isAppNotificationsEnabled());
  const [dismissedThisVisit, setDismissedThisVisit] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [justGranted, setJustGranted] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    const syncPref = () => {
      setNotifEnabled(isAppNotificationsEnabled());
    };
    window.addEventListener('mbk-notif-pref-changed', syncPref);
    window.addEventListener('focus', syncPref);
    return () => {
      window.removeEventListener('mbk-notif-pref-changed', syncPref);
      window.removeEventListener('focus', syncPref);
    };
  }, []);

  const isIOS =
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
    !(window as any).MSStream;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  const isFullyAllowed = notificationPermission === 'granted' && notifEnabled;

  // Hide once fully granted (or after showing confirmation briefly), or if user dismissed for this visit
  if ((isFullyAllowed && !justGranted) || dismissedThisVisit) {
    return null;
  }

  const handleAllowClick = async () => {
    soundManager.playClick();
    setStatusFeedback(null);
    setRequesting(true);

    try {
      // If user already granted OS permission but paused notifications inside our app
      if (notificationPermission === 'granted' && !notifEnabled) {
        setAppNotificationsEnabled(true);
        setNotifEnabled(true);
        setJustGranted(true);
        soundManager.playSignalPing();
        dispatchMobileAppNotification({
          title: isAr ? 'تم تشغيل إشعارات MBK Trading' : 'MBK Trading Alerts Active',
          body: isAr
            ? 'ستصلك الآن إشعارات الصفقات الجديدة والرسائل الخاصة والشات فوراً.'
            : 'You will now receive instant alerts for trades, DMs & VIP chat.',
          tag: 'mbk-welcome-notif'
        }).catch(() => {});
        setTimeout(() => setJustGranted(false), 2600);
        return;
      }

      if (notificationPermission === 'unsupported') {
        if (isIOS && !isStandalone) {
          window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
          setStatusFeedback(
            isAr
              ? 'أضف الموقع للشاشة الرئيسية على الآيفون أولاً لتفعيل إشعارات التطبيق.'
              : 'Add this site to your iPhone Home Screen first to unlock notifications.'
          );
        } else {
          setStatusFeedback(
            isAr
              ? 'متصفحك الحالي لا يدعم إشعارات الويب.'
              : 'Your current browser does not support web notifications.'
          );
        }
        return;
      }

      const result = await requestNotificationPermission();
      const latestPerm = result || getNotificationPermissionState();

      if (latestPerm === 'granted') {
        setAppNotificationsEnabled(true);
        setNotifEnabled(true);
        setJustGranted(true);
        soundManager.playSignalPing();
        dispatchMobileAppNotification({
          title: isAr ? 'تم تفعيل إشعارات MBK Trading 🔔' : 'MBK Trading Notifications Enabled 🔔',
          body: isAr
            ? 'ستصلك تنبيهات الصفقات، الشات المباشر والرسائل الخاصة مع الصوت!'
            : 'Live trades, VIP chat & direct message notifications are now active!',
          tag: 'mbk-welcome-notif'
        }).catch(() => {});
        addToast({
          title: isAr ? 'تم تفعيل الإشعارات بنجاح 🔔' : 'Notifications Allowed 🔔',
          message: isAr
            ? 'ستصلك التنبيهات فوراً مع الصوت أثناء فتح الموقع أو اختصار التطبيق.'
            : 'Notifications & sound alerts are now active.',
          type: 'success'
        });
        setTimeout(() => setJustGranted(false), 2600);
      } else if (latestPerm === 'denied') {
        setStatusFeedback(
          isAr
            ? 'تم رفض الإشعارات سابقاً في المتصفح. اضغط على أيقونة القفل/الإعدادات بجانب رابط الموقع ثم اختر "السماح بالإشعارات (Allow)".'
            : 'Notifications are blocked by your browser. Click the lock/settings icon near the address bar and set Notifications to Allow.'
        );
      } else {
        setStatusFeedback(
          isAr
            ? 'يرجى الضغط على "السماح / Allow" في نافذة المتصفح المنبثقة لتفعيل التنبيهات.'
            : 'Please click "Allow" in the browser popup to enable alerts.'
        );
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className="fixed bottom-3 sm:bottom-5 start-3 end-3 sm:start-5 sm:end-auto sm:max-w-md z-[65] animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="bg-[#1e222d]/98 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 shadow-[0_14px_45px_rgba(0,0,0,0.8)] text-[#d1d4dc]">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              justGranted
                ? 'bg-[#089981]/20 border-[#089981]/50 text-[#089981]'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
            }`}
          >
            {justGranted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-black text-white">
                {justGranted
                  ? isAr
                    ? 'تم تفعيل الإشعارات بنجاح!'
                    : 'Notifications Activated!'
                  : notificationPermission === 'denied'
                  ? isAr
                    ? 'الإشعارات محظورة — يرجى السماح بها'
                    : 'Notifications Blocked — Action Needed'
                  : notificationPermission === 'unsupported' && isIOS && !isStandalone
                  ? isAr
                    ? 'أضف الاختصار لتفعيل إشعارات الآيفون'
                    : 'Add Shortcut for iPhone Notifications'
                  : isAr
                  ? 'فعّل الإشعارات حتى لا تفوتك الصفقات والرسائل'
                  : 'Allow Notifications for Live Trades & Messages'}
              </h4>

              {!justGranted && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setDismissedThisVisit(true);
                  }}
                  className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer shrink-0"
                  title={isAr ? 'تذكيري في الزيارة القادمة' : 'Remind me next visit'}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#9db2c6] leading-relaxed">
              {justGranted
                ? isAr
                  ? 'ستصلك تنبيهات الصفقات، شات VIP والرسائل الخاصة مع الصوت مباشرة.'
                  : 'Live trades, VIP chat, and DM notifications with sound are ready.'
                : notificationPermission === 'denied'
                ? isAr
                  ? 'لقد قمت بحظر إشعارات المتصفح. افتح إعدادات الموقع (أيقونة القفل/الضبط بجانب الرابط) واسمح بالإشعارات لتصلك تنبيهات الصفقات والرسائل الخاصة.'
                  : 'Browser notifications are currently blocked. Open Site Settings next to the URL bar and allow Notifications.'
                : notificationPermission === 'unsupported' && isIOS && !isStandalone
                ? isAr
                  ? 'أضف الموقع إلى الشاشة الرئيسية أولاً عبر Safari ثم افتح الاختصار للسماح بإشعارات الهاتف والصوت.'
                  : 'Install MBK Trading to your iPhone Home Screen via Safari Share menu, then open it to allow notifications.'
                : isAr
                ? 'اسمح للموقع بإرسال إشعارات مع الصوت عند وصول توصية/صفقة جديدة أو رسالة شات أو رسالة خاصة.'
                : 'Enable instant notifications and sound alerts for new trade signals, VIP chat messages, and direct messages.'}
            </p>

            {statusFeedback && (
              <div className="p-2 rounded-xl bg-[#131722] border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
                {statusFeedback}
              </div>
            )}

            {!justGranted && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {notificationPermission === 'unsupported' && isIOS && !isStandalone ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isAr ? 'طريقة الإضافة للشاشة الرئيسية' : 'Add to Home Screen'}</span>
                  </button>
                ) : notificationPermission === 'denied' ? (
                  <button
                    type="button"
                    onClick={handleAllowClick}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إعادة فحص الإذن بعد السماح' : 'Re-check Permission'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={requesting}
                    onClick={handleAllowClick}
                    className="px-3.5 py-1.5 rounded-xl bg-[#089981] hover:bg-[#07846f] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>
                      {requesting
                        ? isAr
                          ? 'جاري الطلب...'
                          : 'Requesting...'
                        : notificationPermission === 'granted' && !notifEnabled
                        ? isAr
                          ? 'تشغيل الإشعارات الآن'
                          : 'Turn Alerts On'
                        : isAr
                        ? 'السماح بالإشعارات الآن'
                        : 'Allow Notifications'}
                    </span>
                    <Volume2 className="w-3 h-3 opacity-80" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setDismissedThisVisit(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#9db2c6] hover:text-white text-[11px] font-semibold cursor-pointer"
                >
                  {isAr ? 'تذكيري لاحقاً' : 'Later'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
