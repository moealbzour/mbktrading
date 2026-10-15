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

    if (isStandaloneMode) return;

    // 2. Check dismissal memory
    const dismissed = localStorage.getItem('mbk_pwa_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 4. Listen for Chromium/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt after a short delay on mobile for iOS
    const timer = setTimeout(() => {
      if (isIOSDevice && !isStandaloneMode) {
        setIsOpen(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    soundManager.playClick();
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
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

  if (isStandalone || !isOpen) return null;

  return (
    <>
      {/* Floating Bottom / Top Mobile PWA Install Banner */}
      <div
        className="fixed bottom-20 md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-md z-40 bg-[#1e222d]/95 backdrop-blur-md border border-[#089981]/50 rounded-xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.7)] animate-fade-in text-[#d1d4dc]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3">
          {/* App Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#089981] to-[#065f46] p-0.5 shrink-0 flex items-center justify-center shadow-sm">
            <span className="font-mono font-black text-xs text-white">MBK</span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                {isAr ? 'تطبيق MBK Trading المؤسسي' : 'MBK Trading Web App'}
              </span>
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#089981]/20 text-[#089981] font-bold">
                PWA
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
              className="p-1.5 text-[#787b86] hover:text-white rounded-md hover:bg-[#2a2e39] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="relative w-full max-w-sm bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl text-[#d1d4dc] pb-safe">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 left-4 rtl:left-auto rtl:right-4 p-1.5 text-[#787b86] hover:text-white rounded-lg hover:bg-[#2a2e39] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#2a2e39] border border-[#363a45] mx-auto mb-2 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-[#089981]" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تثبيت التطبيق على آيفون / آيباد' : 'Install on iPhone / iPad'}
              </h3>
              <p className="text-xs text-[#787b86] mt-0.5">
                {isAr
                  ? 'خطوتان بسيطتان لإضافة MBK Trading لشاشتك الرئيسية:'
                  : 'Two easy steps to add MBK Trading to your home screen:'}
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="w-8 h-8 rounded-lg bg-[#2a2e39] flex items-center justify-center text-blue-400 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    {isAr ? '1. اضغط على زر المشاركة' : '1. Tap the Share button'}
                  </span>
                  <span className="text-[#787b86]">
                    {isAr ? 'في شريط أدوات متصفح Safari بالأسفل' : 'In the bottom Safari navigation bar'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="w-8 h-8 rounded-lg bg-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    {isAr ? '2. اختر "إضافة إلى الصفحة الرئيسية"' : '2. Select "Add to Home Screen"'}
                  </span>
                  <span className="text-[#787b86]">
                    {isAr ? 'ثم اضغط "إضافة" (Add) في الزاوية العلوية' : 'Then tap "Add" in the top corner'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-white text-[#131722] font-bold text-xs hover:bg-[#d1d4dc] transition-all cursor-pointer"
            >
              {isAr ? 'فهمت ذلك، تم' : 'Got it, thanks!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
