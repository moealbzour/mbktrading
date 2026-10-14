import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  Award,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Zap,
  Target,
  ArrowUpRight,
  ShieldCheck,
  Bot,
  MessageSquare
} from 'lucide-react';
import { AITraderChatbot } from '../AITraderChatbot';
import { MarketTicker, MarketSymbol } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface Props {
  activeSymbol: MarketSymbol;
  tickers: MarketTicker[];
  onSelectSymbol?: (symbol: MarketSymbol) => void;
}

export const AICoachReview: React.FC<Props> = ({ activeSymbol, tickers, onSelectSymbol }) => {
  const [reviewPeriod, setReviewPeriod] = useState<30 | 60 | 90>(30);
  const [subTab, setSubTab] = useState<'audit' | 'coach' | 'advisor'>('audit');

  const currentPrice = tickers.find((t) => t.symbol === activeSymbol)?.price;

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/95 via-[#0e1424] to-slate-900/95 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-600 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK AI COACH & REVIEW • الموجّه الذكي ومراجعة الصفقات
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Elite Behavioral AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تحليل عادات التداول النفسية (30/60/90 يوماً)، كشف التداول الانتقامي والفومو، ومستشار الشارت الذكي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                setSubTab('audit');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                subTab === 'audit'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مراجعة الصفقات (Trade Review)
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setSubTab('coach');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                subTab === 'coach'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              المدرب الأسبوعي (Weekly Coach)
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setSubTab('advisor');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                subTab === 'advisor'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>مستشار الشارت (Chart Vision)</span>
            </button>
          </div>
        </div>

        {/* PERIOD SELECTOR CHIPS */}
        {subTab === 'audit' && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">نطاق الفحص الزمني:</span>
              {[30, 60, 90].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    soundManager.playClick();
                    setReviewPeriod(period as any);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    reviewPeriod === period
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  آخر {period} يوماً
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">درجة الانضباط النفسي:</span>
              <span className="text-base font-black font-mono text-emerald-400">88 / 100 (ممتاز)</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUBTAB 1: 30/60/90 DAYS AUDIT */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          {/* TOP 3 HEADLINE BEHAVIORAL INSIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#101624] border border-emerald-500/40 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  نقطة القوة الكبرى (Peak Edge)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">جلسة افتتاح لندن تحقق 81% نسبة نجاح</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                عند التزامك بنموذج سحب سيولة آسيا (London Open Sweep) حققت أفضل معامل ربحية بمعدل 3.4R لكل صفقة.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#101624] border border-amber-500/40 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  تسريب نفسي مكتشف (Behavioral Leak)
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">تداول مفرط بعد الخسارة (Revenge Reflex)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                تم رصد 4 صفقات تم فتحها خلال 10 دقائق من خسارة سابقة؛ 75% منها أغلقت بخسارة إضافية.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#101624] border border-rose-500/40 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/30">
                  تعديل وقف الخسارة (Moving SL)
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">تكبير الخسارة بتوسيع الوقف</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                قمت بتحريك وقف الخسارة إلى الوراء في صفقتين على الذهب، مما رفع معدل الخسارة الدولارية بنسبة 35%.
              </p>
            </div>
          </div>

          {/* DETAILED RECOMMENDATIONS TABLE */}
          <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  خارطة عمل الذكاء الاصطناعي للأسبوع القادم (Actionable Directives)
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">MBK AI Intelligence Engine</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  01
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 mb-0.5">
                    تطبيق قاعدة الاستراحة الإلزامية (30-Minute Cooldown)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    بعد أي صفقة خاسرة، ابتعد عن الشاشات لمدة 30 دقيقة كاملة لإعادة ضبط الحالة الذهنية وتفادي التداول الانتقامي.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  02
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 mb-0.5">
                    حصر التداول في نموذجين معتمدين فقط (Two Playbooks Max)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ركز حصرياً على نموذجي: "London Open Liquidity Sweep" و "ICT Silver Bullet". تجنب أي فرصة عشوائية خارج هذين النموذجين.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  03
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 mb-0.5">
                    تأمين الأرباح برفع الوقف إلى نقطة الدخول عند 1:2 R:R
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    بمجرد وصول السعر لضعف المخاطرة، اغلق 50% من حجم العقد وانقل الوقف لنقطة الدخول فوراً لحماية رأس المال.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBTAB 2: WEEKLY COACH REPORT */}
      {subTab === 'coach' && (
        <div className="bg-[#101624] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">تقرير المدرب الأسبوعي (Weekly Coaching Audit)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تقييم سلوكي شامل للأسبوع الجاري مع تحديد مجالات التطوير للأسبوع القادم
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              الأسبوع رقم 41 • 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">تقييم الانضباط الصارم</span>
              <div className="text-2xl font-black font-mono text-emerald-400">A- (ممتاز)</div>
              <span className="text-[11px] text-slate-500">التزام بالوقف في 92% من الصفقات</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">نسبة الصفقات الرابحة</span>
              <div className="text-2xl font-black font-mono text-cyan-400">75.0%</div>
              <span className="text-[11px] text-slate-500">6 صفقات رابحة من أصل 8</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">صافي العائد المحقق</span>
              <div className="text-2xl font-black font-mono text-amber-400">+6.8R</div>
              <span className="text-[11px] text-slate-500">نمو المحفظة بنسبة +6.8%</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-slate-300 leading-relaxed space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>رسالة المدرب الشخصي لك:</span>
            </h4>
            <p>
              "أداؤك هذا الأسبوع كان نموذجياً على مؤشر ناسداك. دخولك المنضبط مع افتتاح نيويورك بعد سحب سيولة آسيا حقق أعلى
              عائد بمخاطرة مدروسة. التحدي الأكبر لديك هو الصبر يوم الجمعة؛ تذكر دائماً أن عدم التداول هو في حد ذاته تداول
              وقرار استثماري ناجح. استمر بنفس الانضباط وسنحقق أهداف الربع الرابع بسهولة."
            </p>
          </div>
        </div>
      )}

      {/* 4. SUBTAB 3: AI ADVISOR & CHART VISION */}
      {subTab === 'advisor' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-cyan-300">مستشار التداول الذكي متصل بالسعر اللحظي: </span>
                <span className="font-mono text-white font-bold">{activeSymbol} @ {currentPrice}</span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 font-bold">
              Gemini 3.8 Flash • Real-Time SMC Directive
            </span>
          </div>

          <AITraderChatbot
            activeSymbol={activeSymbol}
            currentPrice={currentPrice}
            tickers={tickers}
            onSelectSymbol={onSelectSymbol}
          />
        </div>
      )}
    </div>
  );
};
