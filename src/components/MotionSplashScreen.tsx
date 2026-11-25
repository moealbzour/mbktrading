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
      className="min-h-screen h-[100dvh] w-full bg-[#F0F3FA] dark:bg-[#090c12] text-[#131722] dark:text-[#d1d4dc] flex flex-col justify-between relative overflow-hidden select-none antialiased"
    >
      {/* Subtle Architectural Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD2DF_1px,transparent_1px)] dark:bg-[radial-gradient(#2a2e39_1px,transparent_1px)] [background-size:28px_28px] opacity-30 pointer-events-none" />
      <div className="hidden dark:block absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#089981]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/mbk-logo.png"
            alt="MBK Trading"
            className="h-9 w-auto rounded-lg object-contain border border-[#E0E3EB] dark:border-white/10 shadow-md"
          />
          <span className="text-sm font-extrabold tracking-tight text-[#131722] dark:text-white whitespace-nowrap">
            MBK Trading
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleLang}
          className="px-3.5 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-semibold text-[#131722] dark:text-[#d1d4dc] hover:text-[#131722] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-[#089981]" />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Center Animated Official MBK Logo */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 text-center">
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-6">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-56 sm:w-64 rounded-2xl bg-[#FFFFFF] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-[0_0_50px_rgba(8,153,129,0.22)] p-2 flex items-center justify-center relative overflow-hidden"
            >
              <img
                src="/mbk-logo.png"
                alt="MBK Trading Logo"
                className="w-full h-auto object-contain rounded-xl"
              />
            </motion.div>
          </div>

          <motion.p
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs sm:text-sm font-semibold text-[#4A5162] dark:text-[#8a93a6] max-w-md mb-7"
          >
            {isAr
              ? 'بوت MBK • التوصيات • الشات العام • أخبار MBK'
              : 'MBK Bot • Signals • General Chat • MBK News'}
          </motion.p>

          {/* Smooth Progress Sweep */}
          <div className="w-56 h-1 bg-[#F8F9FD] dark:bg-[#1e222d] rounded-full overflow-hidden mb-7 border border-[#E0E3EB] dark:border-[#2a2e39]">
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
            className="px-6 py-3 rounded-xl bg-[#131722] hover:bg-[#2A2E39] dark:bg-[#089981] dark:hover:bg-[#07846f] text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-[#089981]/20"
          >
            <span>{isAr ? 'دخول المنصة' : 'Enter MBK Trading'}</span>
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </motion.button>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-[#787b86] relative z-10">
        MBK Trading © 2026
      </footer>
    </div>
  );
};
