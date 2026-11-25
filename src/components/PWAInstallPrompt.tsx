import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  lang?: 'ar' | 'en';
}

export const PWAInstallPrompt: React.FC<Props> = ({ lang = 'ar' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const isAr = lang === 'ar';

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isStandaloneMode) return;

    // 3. Listen for Chromium/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      const dismissed = localStorage.getItem('mbk_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed, 10) >= 24 * 60 * 60 * 1000) {
        setIsOpen(true);
      }
    };

    const handleManualInstallTrigger = async () => {
      if (deferredPrompt) {
        try {
          await deferredPrompt.prompt();
          const choiceResult = await deferredPrompt.userChoice;
          if (choiceResult.outcome === 'accepted') {
            setInstalledSuccess(true);
            setIsOpen(true);
            setTimeout(() => setIsOpen(false), 3000);
          }
          setDeferredPrompt(null);
          return;
        } catch {
          // fall through to guide modal
        }
      }
      setShowIOSModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('mbk-open-pwa-install', handleManualInstallTrigger);

    // Show prompt after a short delay on mobile for iOS if not dismissed recently
    const dismissed = localStorage.getItem('mbk_pwa_dismissed');
    const recentlyDismissed =
      dismissed && Date.now() - parseInt(dismissed, 10) < 24 * 60 * 60 * 1000;

    const timer = setTimeout(() => {
      if (isIOSDevice && !isStandaloneMode && !recentlyDismissed) {
        setIsOpen(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('mbk-open-pwa-install', handleManualInstallTrigger);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    soundManager.playClick();
    if (isIOS || !deferredPrompt) {
      setShowIOSModal(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => setIsOpen(false), 3000);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    soundManager.playClick();
    setIsOpen(false);
    localStorage.setItem('mbk_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || (!isOpen && !showIOSModal)) return null;

  return (
    <>
      {/* Floating Bottom / Top Mobile PWA Install Banner */}
      {isOpen && (
      <div
        className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-md z-40 bg-[#FFFFFF] dark:bg-[#1e222d]/95 dark:backdrop-blur-md border border-[#B3E2D9] dark:border-[#089981]/50 rounded-xl p-3 shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.7)] animate-fade-in text-[#131722] dark:text-[#d1d4dc]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3">
          {/* App Icon */}
          <img
            src="/mbk-logo.png"
            alt="MBK Trading"
            className="w-11 h-11 rounded-lg object-cover border border-[#B3E2D9] dark:border-[#089981]/40 shrink-0 shadow-sm"
          />

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#131722] dark:text-white truncate">
                MBK Trading
              </span>
            </div>
            <p className="text-[11px] text-[#787b86] truncate">
              {installedSuccess
                ? isAr
                  ? 'تم التثبيت بنجاح! شكرًا لك'
                  : 'Installed successfully! Thank you'
                : isAr
                ? 'تجربة كاملة الشاشة، تنبيهات لحظية وسرعة فائقة'
                : 'Fast, fullscreen desktop & mobile experience'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!installedSuccess ? (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-lg bg-[#089981] hover:bg-[#07806c] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تثبيت' : 'Install'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[#089981] text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="p-1.5 text-[#787b86] hover:text-[#131722] dark:hover:text-white rounded-md hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* iOS Safari / Android Chrome Install Guide Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="relative w-full max-w-sm bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl p-5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl text-[#131722] dark:text-[#d1d4dc] pb-safe">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 left-4 rtl:left-auto rtl:right-4 p-1.5 text-[#787b86] hover:text-[#131722] dark:hover:text-white rounded-lg hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <img
                src="/mbk-logo.png"
                alt="MBK Trading"
                className="w-16 h-16 rounded-xl object-cover border border-[#CBD2DF] dark:border-[#363a45] mx-auto mb-2 shadow-md"
              />
              <h3 className="text-sm font-bold text-[#131722] dark:text-white">
                {isIOS
                  ? isAr
                    ? 'تثبيت التطبيق على آيفون / آيباد'
                    : 'Install on iPhone / iPad'
                  : isAr
                  ? 'إضافة اختصار التطبيق للشاشة الرئيسية'
                  : 'Add App Shortcut to Home Screen'}
              </h3>
              <p className="text-xs text-[#787b86] mt-0.5">
                {isAr
                  ? 'للحصول على تجربة تطبيق الهاتف وتنبيهات الصفقات والشات:'
                  : 'For a native mobile app experience and live notifications:'}
              </p>
            </div>

            {isIOS ? (
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-[#FFFFFF] dark:bg-[#131722] rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39]">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF1F7] dark:bg-[#2a2e39] flex items-center justify-center text-[#1E53E5] dark:text-blue-400 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#131722] dark:text-white block">
                      {isAr ? '1. اضغط على زر المشاركة' : '1. Tap the Share button'}
                    </span>
                    <span className="text-[#787b86]">
                      {isAr ? 'في شريط أدوات متصفح Safari بالأسفل' : 'In the bottom Safari navigation bar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#FFFFFF] dark:bg-[#131722] rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39]">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF1F7] dark:bg-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#131722] dark:text-white block">
                      {isAr ? '2. اختر "إضافة إلى الصفحة الرئيسية"' : '2. Select "Add to Home Screen"'}
                    </span>
                    <span className="text-[#787b86]">
                      {isAr ? 'ثم اضغط "إضافة" (Add) في الزاوية العلوية' : 'Then tap "Add" in the top corner'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-[#FFFFFF] dark:bg-[#131722] rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39]">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF1F7] dark:bg-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#131722] dark:text-white block">
                      {isAr ? '1. افتح قائمة المتصفح (⋮)' : '1. Open Browser Menu (⋮)'}
                    </span>
                    <span className="text-[#787b86]">
                      {isAr
                        ? 'في Chrome أو Edge أعلى الشاشة'
                        : 'In Chrome or Edge top browser toolbar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#FFFFFF] dark:bg-[#131722] rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39]">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF1F7] dark:bg-[#2a2e39] flex items-center justify-center text-[#1E53E5] dark:text-blue-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#131722] dark:text-white block">
                      {isAr ? '2. اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"' : '2. Tap "Install App" or "Add to Home Screen"'}
                    </span>
                    <span className="text-[#787b86]">
                      {isAr
                        ? 'سيظهر اختصار MBK Trading كأي تطبيق موبايل'
                        : 'MBK Trading will appear on your home screen like a native app'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] dark:bg-white text-[#131722] dark:text-white dark:text-[#131722] font-bold text-xs hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] dark:hover:bg-[#d1d4dc] transition-all cursor-pointer"
            >
              {isAr ? 'فهمت ذلك، تم' : 'Got it, thanks!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
