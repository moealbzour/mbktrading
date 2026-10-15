import React from 'react';
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundManager } from '../utils/audio';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar'
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundManager.playClick();
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col relative text-[#d1d4dc]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e39] bg-[#131722]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تثبيت تطبيق MBK Trading' : 'Install MBK Trading Web App'}
              </h3>
              <p className="text-[11px] text-[#787b86]">
                {isAr ? 'تطبيق ويب متقدم لـ iOS و Android' : 'Progressive Web App for iOS & Android'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* App preview banner */}
          <div className="p-3.5 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#089981] to-[#046c5b] p-0.5 shrink-0 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm tracking-tighter">MBK</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">MBK Trading Desk</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                  v2.6 PWA
                </span>
              </div>
              <p className="text-[11px] text-[#787b86] truncate">
                {isAr ? 'وصول فوري وشاشة كاملة بدون شريط المتصفح' : 'Instant fullscreen without browser chrome'}
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#089981] shrink-0" />
              <span>{isAr ? 'سرعة استجابة 0.9ms' : '0.9ms Latency'}</span>
            </div>
            <div className="p-2 rounded bg-[#131722] border border-[#2a2e39] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#089981] shrink-0" />
              <span>{isAr ? 'إشعارات إشارات حية' : 'Live Signal Alerts'}</span>
            </div>
          </div>

          {/* Case 1: Already Installed */}
          {isInstalled ? (
            <div className="p-4 rounded-lg bg-[#089981]/10 border border-[#089981]/30 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#089981] mx-auto" />
              <p className="text-sm font-bold text-white">
                {isAr ? 'التطبيق مثبت بالفعل على جهازك!' : 'App is already installed!'}
              </p>
              <p className="text-[11px] text-[#787b86]">
                {isAr
                  ? 'يمكنك تشغيل التطبيق مباشرة من الشاشة الرئيسية للحصول على تجربة الشاشة الكاملة.'
                  : 'You can launch it directly from your Home Screen for the full app experience.'}
              </p>
            </div>
          ) : isInstallable ? (
            /* Case 2: Android / Chrome 1-Click Install */
            <div className="space-y-3">
              <p className="text-xs text-[#d1d4dc] leading-relaxed">
                {isAr
                  ? 'يمكنك تثبيت تطبيق MBK مباشرة على جهازك بنقرة واحدة، ليظهر على شاشتك الرئيسية كتطبيق أصلي.'
                  : 'Install MBK Trading directly to your home screen with a single tap for a native app feel.'}
              </p>

              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-lg bg-[#089981] hover:bg-[#089981]/90 text-[#131722] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#089981]/20"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تثبيت التطبيق الآن (1-Tap Install)' : 'Install App Now (1-Tap)'}</span>
              </button>
            </div>
          ) : isIOS ? (
            /* Case 3: iOS Safari Step-by-Step Instructions */
            <div className="space-y-3">
              <div className="px-3 py-2 rounded bg-[#131722] border border-[#2a2e39] text-[#787b86] text-[11px]">
                {isAr
                  ? 'في نظام iOS (iPhone / iPad)، يدعم متصفح Safari التثبيت عبر الخطوات التالية:'
                  : 'On iOS Safari, follow these 2 simple steps to add to your Home Screen:'}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
                  <div className="w-6 h-6 rounded-md bg-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0 mt-0.5">
                    <Share className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {isAr ? '1. اضغط زر المشاركة (Share)' : '1. Tap the Share button'}
                    </span>
                    <span className="text-[11px] text-[#787b86]">
                      {isAr
                        ? 'في أسفل شاشة Safari، اضغط على أيقونة المشاركة (مربع مع سهم للأعلى).'
                        : 'Located in the Safari toolbar at the bottom of the screen.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#131722] border border-[#2a2e39]">
                  <div className="w-6 h-6 rounded-md bg-[#2a2e39] flex items-center justify-center text-[#089981] shrink-0 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {isAr ? '2. اختر "إضافة إلى الشاشة الرئيسية"' : '2. Select "Add to Home Screen"'}
                    </span>
                    <span className="text-[11px] text-[#787b86]">
                      {isAr
                        ? 'مرر قائمة الخيارات للأسفل وانقر على "Add to Home Screen" ثم اضغط "إضافة (Add)".'
                        : 'Scroll down the actions list and tap "Add to Home Screen", then tap "Add".'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Case 4: General Browser Instructions */
            <div className="space-y-3">
              <p className="text-xs text-[#787b86] leading-relaxed">
                {isAr
                  ? 'لتثبيت المنصة كتطبيق على جهازك، افتح قائمة المتصفح (النقاط الثلاث أو زر المشاركة) واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".'
                  : 'To install MBK Trading as an app, open your browser menu and choose "Install App" or "Add to Home Screen".'}
              </p>
              <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                <span className="text-white font-medium">
                  {isAr ? 'يعمل دون الحاجة إلى متجر تطبيقات' : 'Runs instantly without app stores'}
                </span>
                <span className="text-[#089981] font-mono font-bold">100% PWA</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2a2e39] bg-[#131722]/60 flex items-center justify-between">
          <span className="text-[11px] text-[#787b86]">
            {isAr ? 'MBK Web Terminal • بدون إعلانات' : 'MBK Web Terminal • Clean & Ad-free'}
          </span>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-3 py-1.5 rounded-md bg-[#2a2e39] hover:bg-[#363a45] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
