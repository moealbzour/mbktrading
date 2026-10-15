import React from 'react';
import { BookOpen, X, CheckCircle2, Clock, Tag, ArrowRight, ArrowLeft } from 'lucide-react';
import { soundManager } from '../utils/audio';

export interface ArticleData {
  id: string;
  tag: string;
  readTime: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  sectionsAr: { heading: string; content: string }[];
  sectionsEn: { heading: string; content: string }[];
  takeawaysAr: string[];
  takeawaysEn: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  article: ArticleData | null;
  lang?: 'ar' | 'en';
  onOpenDashboard?: () => void;
}

export const ArticleReaderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  article,
  lang = 'ar',
  onOpenDashboard
}) => {
  if (!isOpen || !article) return null;

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#1e222d] border border-[#363a45] rounded-2xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="sticky top-0 float-end p-2 rounded-lg bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer z-10 -mt-2 -mr-2"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Article Meta Header */}
        <div className="space-y-3 mb-6 border-b border-[#2a2e39] pb-6">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>{article.tag}</span>
            </span>
            <span className="text-[#787b86] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readTime}</span>
            </span>
            <span className="text-[#787b86]">• MBK Research Team</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {isAr ? article.titleAr : article.titleEn}
          </h2>

          <p className="text-xs sm:text-sm text-[#787b86] leading-relaxed">
            {isAr ? article.subtitleAr : article.subtitleEn}
          </p>
        </div>

        {/* Article Body Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed mb-8">
          {(isAr ? article.sectionsAr : article.sectionsEn).map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-bold text-white text-sm sm:text-base">
                {sec.heading}
              </h3>
              <p className="text-[#d1d4dc] whitespace-pre-line leading-relaxed">
                {sec.content}
              </p>
            </div>
          ))}
        </div>

        {/* Key Takeaways Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#131722] border border-[#2a2e39] mb-8 space-y-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#089981]" />
            <span>{isAr ? 'الخلاصات التنفيذية للتداول' : 'Actionable Key Takeaways'}</span>
          </h4>
          <ul className="space-y-2 text-xs text-[#d1d4dc]">
            {(isAr ? article.takeawaysAr : article.takeawaysEn).map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#089981] font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2e39] pt-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-xs font-medium text-[#d1d4dc] hover:text-white transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق الدليل' : 'Close Guide'}
          </button>

          {onOpenDashboard && (
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
                onOpenDashboard();
              }}
              className="px-5 py-2 rounded-lg bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{isAr ? 'تطبيق هذا المفهوم في MBK Desk ↗' : 'Apply Concept in MBK Desk ↗'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
