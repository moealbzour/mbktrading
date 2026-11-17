import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Globe } from 'lucide-react';

interface MotionSplashScreenProps {
  onComplete: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const MotionSplashScreen: React.FC<MotionSplashScreenProps> = ({
  onComplete,
  lang,
  onToggleLang
}) => {
  const isAr = lang === 'ar';
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        onComplete();
      },
      prefersReducedMotion ? 700 : 1900
    );
    return () => window.clearTimeout(timer);
  }, [onComplete, prefersReducedMotion]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen h-[100dvh] w-full bg-[#131722] text-[#d1d4dc] flex flex-col justify-between relative overflow-hidden select-none antialiased"
    >
      {/* Subtle Architectural Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#2a2e39_1px,transparent_1px)] [background-size:28px_28px] opacity-35 pointer-events-none" />
      <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#089981]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          MBK Trading
        </span>
        <button
          type="button"
          onClick={onToggleLang}
          className="px-3.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-semibold text-[#d1d4dc] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-[#089981]" />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Center Animated Brand Emblem */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center">
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Geometric MBK Trading Logo Mark */}
          <div className="relative mb-7">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-24 h-24 rounded-2xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              <svg
                viewBox="0 0 64 64"
                className="w-14 h-14"
                fill="none"
                aria-label="MBK Trading Logo"
              >
                <rect x="6" y="34" width="8" height="20" rx="2" fill="#2a2e39" />
                <rect x="18" y="24" width="8" height="30" rx="2" fill="#089981" fillOpacity="0.65" />
                <rect x="30" y="16" width="8" height="38" rx="2" fill="#089981" />
                <path
                  d="M10 28L22 18L34 22L54 10"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M44 10H54V20"
                  stroke="#089981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </div>

          <motion.h1
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2"
          >
            MBK Trading
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm text-[#8a93a6] max-w-md mb-8"
          >
            {isAr
              ? 'منصة التوصيات المؤسسية وتنبيهات البوت وغرفة التداول المباشرة'
              : 'Institutional Signals, Algorithmic Alerts & Live Trading Workspace'}
          </motion.p>

          {/* Smooth Progress Sweep (GPU transform scaleX) */}
          <div className="w-56 h-1 bg-[#1e222d] rounded-full overflow-hidden mb-7 border border-[#2a2e39]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: prefersReducedMotion ? 0.5 : 1.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: isAr ? 'right center' : 'left center' }}
              className="h-full w-full bg-[#089981]"
            />
          </div>

          <motion.button
            type="button"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            onClick={onComplete}
            className="px-6 py-3 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-lg shadow-[#089981]/20"
          >
            <span>{isAr ? 'دخول المنصة' : 'Continue to MBK Trading'}</span>
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </motion.button>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-[#787b86] relative z-10">
        MBK Trading Desk © 2026
      </footer>
    </div>
  );
};
