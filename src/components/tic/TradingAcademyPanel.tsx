import React, { useState } from 'react';
import { GraduationCap, BookOpen, ShieldAlert, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface TradingAcademyPanelProps {
  lang?: 'ar' | 'en';
}

interface LessonItem {
  id: string;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  durationAr: string;
  durationEn: string;
  summaryAr: string;
  summaryEn: string;
  pointsAr: string[];
  pointsEn: string[];
}

const ACADEMY_LESSONS: LessonItem[] = [
  {
    id: 'risk-foundation',
    categoryAr: 'إدارة المخاطر',
    categoryEn: 'Risk Management',
    titleAr: 'قواعد إدارة رأس المال وحماية الحساب (1% Rule)',
    titleEn: 'Capital Preservation & The 1% Risk Rule',
    durationAr: '8 دقائق قراءة',
    durationEn: '8 min read',
    summaryAr:
      'الأساس الرياضي لاستمرارية المتداول في الأسواق المتقلبة وتجنب المرجنة أو تجاوز حدود التراجع اليومي.',
    summaryEn:
      'The mathematical foundation for surviving volatile sessions without blowing daily drawdown limits.',
    pointsAr: [
      'لا تخاطر بأكثر من 0.5% إلى 1% من رصيد الحساب في الصفقة الواحدة.',
      'احسب حجم العقد (Lot Size) بناءً على مسافة وقف الخسارة وليس بالعشوائية.',
      'توقف عن التداول فوراً إذا خسرت صفقتين متتاليتين في نفس الجلسة.'
    ],
    pointsEn: [
      'Risk strictly 0.5% to 1% of equity per trade setup.',
      'Derive lot size dynamically from stop-loss distance rather than fixed guesses.',
      'Enforce a hard two-loss pause rule per session.'
    ]
  },
  {
    id: 'market-structure',
    categoryAr: 'هيكل السوق',
    categoryEn: 'Market Structure',
    titleAr: 'تحديد الاتجاه المؤسسي وكسر الهيكل (BOS / CHoCH)',
    titleEn: 'Institutional Structure & Break of Structure',
    durationAr: '10 دقائق قراءة',
    durationEn: '10 min read',
    summaryAr:
      'كيفية قراءة القمم والقيعان الحقيقية على إطار 4 ساعات و15 دقيقة لتحديد مناطق الدخول عالية الاحتمالية.',
    summaryEn:
      'Reading true swing highs and lows across 4H and 15M timeframes to align with institutional flow.',
    pointsAr: [
      'ابدأ دائماً بتحديد السيولة والاتجاه العام على فريم 4H و Daily.',
      'ابحث عن سحب السيولة (Liquidity Sweep) قبل انتظار تأكيد تغيير الاتجاه CHoCH.',
      'استهدف نسبة عائد إلى مخاطرة لا تقل عن 1:2 لتبقى رابحاً على المدى الطويل.'
    ],
    pointsEn: [
      'Map 4H/Daily liquidity pools before dropping to execution timeframes.',
      'Wait for a liquidity sweep followed by clear Market Structure Shift (CHoCH).',
      'Require a minimum 1:2 Risk-to-Reward profile before execution.'
    ]
  },
  {
    id: 'sessions-timing',
    categoryAr: 'التوقيت والسيولة',
    categoryEn: 'Trading Sessions',
    titleAr: 'أفضل أوقات التداول: تداخل لندن ونيويورك',
    titleEn: 'Optimal Execution Windows: London & NY Overlap',
    durationAr: '6 دقائق قراءة',
    durationEn: '6 min read',
    summaryAr:
      'فهم ذروة السيولة في الذهب (XAUUSD) والناسداك (US100) وتجنب أوقات التذبذب العرضي الميت.',
    summaryEn:
      'Understanding liquidity spikes on Gold (XAUUSD) and Nasdaq (US100) while avoiding low-volume chops.',
    pointsAr: [
      'افتتاح لندن (08:00 UTC) يحدد غالباً الاتجاه المبكر للذهب واليورو.',
      'افتتاح نيويورك (13:30–16:00 UTC) يشهد أعلى سيولة لمؤشر US100.',
      'تجنب الدخول قبل صدور أخبار الفائدة والتضخم عالية التأثير مباشرة.'
    ],
    pointsEn: [
      'London Open (08:00 UTC) establishes initial intraday range expansion.',
      'New York Open (13:30–16:00 UTC) delivers peak liquidity for US100 and XAUUSD.',
      'Step aside 15 minutes before High-Impact CPI, NFP, and FOMC releases.'
    ]
  }
];

export const TradingAcademyPanel: React.FC<TradingAcademyPanelProps> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [selectedId, setSelectedId] = useState<string>(ACADEMY_LESSONS[0].id);
  const activeLesson = ACADEMY_LESSONS.find((l) => l.id === selectedId) || ACADEMY_LESSONS[0];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="h-full overflow-y-auto p-3 sm:p-5 bg-[#131722] text-[#d1d4dc]">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1e222d] border border-[#2a2e39] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#089981]/15 border border-[#089981]/35 flex items-center justify-center text-[#089981] shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {isAr ? 'أكاديمية MBK للتداول (Free Academy)' : 'MBK Trading Academy (Free)'}
              </h2>
              <p className="text-xs text-[#8a93a6]">
                {isAr
                  ? 'دروس تأسيسية مجانية في إدارة المخاطر وهيكل السوق وتوقيت الجلسات'
                  : 'Free foundational curriculum on risk management, market structure & sessions'}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#089981] px-3 py-1 rounded-lg bg-[#089981]/10 border border-[#089981]/30 whitespace-nowrap">
            {isAr ? 'متاح للباقة المجانية ($0)' : 'Included in Free Tier ($0)'}
          </span>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Lessons Sidebar */}
          <div className="lg:col-span-5 space-y-2.5">
            {ACADEMY_LESSONS.map((lesson, idx) => {
              const isSelected = lesson.id === activeLesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedId(lesson.id);
                  }}
                  className={`w-full text-start p-4 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1e222d] border-[#089981] text-white'
                      : 'bg-[#1e222d]/60 border-[#2a2e39] text-[#d1d4dc] hover:bg-[#1e222d]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#8a93a6] mb-1.5">
                    <span className="font-bold text-[#089981]">
                      0{idx + 1}. {isAr ? lesson.categoryAr : lesson.categoryEn}
                    </span>
                    <span className="font-mono">{isAr ? lesson.durationAr : lesson.durationEn}</span>
                  </div>
                  <div className="text-sm font-bold text-white leading-snug">
                    {isAr ? lesson.titleAr : lesson.titleEn}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Lesson Detail */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-[#1e222d] border border-[#2a2e39] space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#089981] font-bold">
              <BookOpen className="w-4 h-4" />
              <span>{isAr ? activeLesson.categoryAr : activeLesson.categoryEn}</span>
              <span aria-hidden="true">·</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{isAr ? activeLesson.durationAr : activeLesson.durationEn}</span>
            </div>

            <h3 className="text-lg font-extrabold text-white">
              {isAr ? activeLesson.titleAr : activeLesson.titleEn}
            </h3>

            <p className="text-xs sm:text-sm text-[#b2b5be] leading-relaxed">
              {isAr ? activeLesson.summaryAr : activeLesson.summaryEn}
            </p>

            <div className="pt-3 border-t border-[#2a2e39] space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#089981]" />
                <span>{isAr ? 'النقاط التطبيقية الأساسية:' : 'Key Execution Principles:'}</span>
              </div>
              {(isAr ? activeLesson.pointsAr : activeLesson.pointsEn).map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#131722] border border-[#2a2e39]">
                  <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0 mt-0.5" />
                  <span className="text-xs text-[#d1d4dc] leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {isAr
                  ? 'محتوى تعليمي للمساعدة في إدارة المخاطر ولا يُعد نصيحة استثمارية مخصصة.'
                  : 'Educational material for risk discipline; not personalized financial advice.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingAcademyPanel;
