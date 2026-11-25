import React from 'react';
import { soundManager } from '../../utils/audio';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onCancel: () => void;
  lang?: 'ar' | 'en';
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onConfirmExit,
  onCancel,
  lang = 'ar'
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#131722]/45 dark:bg-black/80 dark:backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md rounded-2xl bg-[#FFFFFF] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-2xl p-6 text-center relative overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#131722] dark:bg-gradient-to-r dark:from-amber-500 dark:to-indigo-500 rounded-full" />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FDF6E3] dark:bg-amber-500/10 border border-[#EFE0B4] dark:border-amber-500/30 flex items-center justify-center text-[#9A6700] dark:text-amber-400 text-2xl mb-4 shadow-inner">
          🚪
        </div>

        <h3 className="text-lg font-bold text-[#131722] dark:text-white mb-2">
          {isAr ? 'هل تريد الخروج من التطبيق؟' : 'Exit Application?'}
        </h3>
        <p className="text-sm text-[#787b86] mb-6 leading-relaxed">
          {isAr
            ? 'أنت على وشك مغادرة منصة MBK Trading أو اختصار التطبيق. هل أنت متأكد من رغبتك في الخروج؟'
            : 'You are about to exit MBK Trading app or shortcut. Are you sure you want to leave?'}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onCancel();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#EDF1F7] dark:bg-[#2a2e39] hover:bg-[#E0E3EB] dark:hover:bg-[#363c4e] text-[#131722] dark:text-white font-bold text-xs transition-colors cursor-pointer border border-[#CBD2DF] dark:border-[#363c4e]"
          >
            {isAr ? 'البقاء في التطبيق (إلغاء)' : 'Stay in App'}
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onConfirmExit();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shadow-none dark:shadow-rose-600/20"
          >
            {isAr ? 'نعم، خروج' : 'Yes, Exit'}
          </button>
        </div>
      </div>
    </div>
  );
};
