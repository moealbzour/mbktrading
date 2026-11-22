import React from 'react';
import { X, Zap, Radio } from 'lucide-react';
import { PublishingCenter } from './PublishingCenter';
import { soundManager } from '../../utils/audio';

interface QuickSignalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserName?: string;
  lang?: 'ar' | 'en';
}

export const QuickSignalDrawer: React.FC<QuickSignalDrawerProps> = ({
  isOpen,
  onClose,
  currentUserRole = 'ADMIN',
  currentUserName = 'MBK Chief Analyst',
  lang = 'ar'
}) => {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 select-none"
      onClick={onClose}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-2xl h-full bg-[#131722] border-s border-[#2a2e39] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-end duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Header */}
        <div className="px-4 py-3 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#089981]/15 border border-[#089981]/40 text-[#089981] flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>{isAr ? 'مركز النشر السريع وإدارة الصفقات' : 'Quick Signal Publisher & Trade Manager'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#089981]/20 text-[#089981] border border-[#089981]/40 text-[9px] font-mono">
                  LIVE DESK
                </span>
              </h2>
              <p className="text-[10px] text-[#787b86]">
                {isAr
                  ? 'انشر صفقة جديدة أو احذف/عدل الصفقات الجارية دون مغادرة الشارت أو الشات'
                  : 'Publish a new signal or edit/delete active trades without leaving your current view'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Publishing Center Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <PublishingCenter
            currentUserRole={currentUserRole}
            currentUserName={currentUserName}
            lang={lang}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
