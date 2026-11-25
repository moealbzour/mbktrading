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
      className="fixed inset-0 z-50 bg-[#131722]/40 dark:bg-black/60 dark:backdrop-blur-xs flex justify-end animate-in fade-in duration-200 select-none"
      onClick={onClose}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-2xl h-full bg-[#FFFFFF] dark:bg-[#131722] border-s border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-end duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Header */}
        <div className="px-4 py-3 bg-[#F8F9FD] dark:bg-[#1e222d] border-b border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E6F5F2] dark:bg-[#089981]/15 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white flex items-center gap-1.5">
                <span>{isAr ? 'مركز النشر السريع وإدارة الصفقات' : 'Quick Signal Publisher & Trade Manager'}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40 text-[9px] font-mono">
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
            className="p-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
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
