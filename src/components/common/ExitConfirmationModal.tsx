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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md rounded-2xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl p-6 text-center relative overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full" />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl mb-4 shadow-inner">
          🚪
        </div>

        <h3 className="text-lg font-bold text-white mb-2">
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
            className="flex-1 py-3 px-4 rounded-xl bg-[#2a2e39] hover:bg-[#363c4e] text-white font-bold text-xs transition-colors cursor-pointer border border-[#363c4e]"
          >
            {isAr ? 'البقاء في التطبيق (إلغاء)' : 'Stay in App'}
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onConfirmExit();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/20"
          >
            {isAr ? 'نعم، خروج' : 'Yes, Exit'}
          </button>
        </div>
      </div>
    </div>
  );
};
