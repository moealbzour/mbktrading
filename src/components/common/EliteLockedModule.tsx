import React from 'react';
import { Lock, Gem } from 'lucide-react';
import { ELITE_LOCK_BADGE_TEXT } from '../../utils/entitlements';
import { soundManager } from '../../utils/audio';

interface EliteLockedModuleProps {
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  lang?: 'ar' | 'en';
  compact?: boolean;
  onViewPlans?: () => void;
}

export const EliteLockedModule: React.FC<EliteLockedModuleProps> = ({
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  lang = 'ar',
  compact = false,
  onViewPlans
}) => {
  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`w-full h-full flex flex-col items-center justify-center text-center bg-[#131722] border border-[#2a2e39] rounded-2xl ${
        compact ? 'p-5 min-h-[240px]' : 'p-8 sm:p-12 min-h-[360px]'
      } relative overflow-hidden select-none`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#1e222d] border border-amber-500/35 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
        <Lock className="w-6 h-6" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold mb-3 whitespace-nowrap">
        <span>🔒</span>
        <span>{ELITE_LOCK_BADGE_TEXT}</span>
      </div>

      <h3 className="text-base sm:text-lg font-extrabold text-white mb-2">
        {isAr ? titleAr : titleEn}
      </h3>

      <p className="text-xs text-[#787b86] max-w-md leading-relaxed mb-5">
        {isAr ? subtitleAr : subtitleEn}
      </p>

      {onViewPlans && (
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onViewPlans();
          }}
          className="px-4 py-2.5 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
        >
          <Gem className="w-3.5 h-3.5" />
          <span>{isAr ? 'عرض تفاصيل باقة Elite ($500/mo)' : 'View Elite Plan ($500/mo)'}</span>
        </button>
      )}
    </div>
  );
};

export default EliteLockedModule;
