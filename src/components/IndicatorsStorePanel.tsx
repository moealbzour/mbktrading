import React, { useState } from 'react';
import { MBKIndicator } from '../types/trading';
import {
  Boxes,
  Sparkles,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Star,
  Code,
  Zap,
  Play
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  indicators: MBKIndicator[];
  onOpenBrokerModal: () => void;
}

export const IndicatorsStorePanel: React.FC<Props> = ({
  indicators,
  onOpenBrokerModal
}) => {
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const [tvUsername, setTvUsername] = useState('');
  const [activatedSuccess, setActivatedSuccess] = useState<string | null>(null);

  const handleActivate = (indId: string) => {
    if (!tvUsername.trim()) {
      alert('يرجى إدخال اسم مستخدم TradingView الخاص بك لإرسال الصلاحية');
      return;
    }
    soundManager.playProfitChime();
    setActivatedSuccess(indId);
    setTimeout(() => setActivatedSuccess(null), 4000);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>متجر مؤشرات وخوارزميات MBK الخاصة (Pine Script v5)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                TradingView Invite-Only
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              خوارزميات برمجية حصرية طورها فريق أبحاث MBK لفلترة الضوضاء ورصد نقاط الدخول الصفرية
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBrokerModal}
          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>احصل على جميع المؤشرات مجاناً مع الوسيط المعتمد</span>
        </button>
      </div>

      {/* Global TradingView Activation Bar */}
      <div className="p-4 bg-[#0a0f18] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Code className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold">بوابة تفعيل الحسابات على تريدنج فيو:</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            (أدخل اسم حسابك ليتم إضافتك تلقائياً إلى قائمة Invite-Only Scripts)
          </span>
        </div>

        <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
          <input
            type="text"
            placeholder="TradingView Username (مثال: mohammad_trader)"
            value={tvUsername}
            onChange={(e) => setTvUsername(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {indicators.map((ind) => {
          const isActivated = activatedSuccess === ind.id;
          return (
            <div
              key={ind.id}
              className="bg-[#151c2a] border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-cyan-500/5 group"
            >
              <div>
                {/* Badge & Rating */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {ind.badge}
                  </span>

                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold font-mono">{ind.rating}</span>
                    <span className="text-slate-400 text-[10px]">({ind.reviewCount} تقييم)</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-black text-slate-100 mb-1 leading-snug group-hover:text-cyan-300 transition-colors">
                  {ind.nameAr}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono block mb-2">{ind.name}</span>

                {/* Summary */}
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{ind.summaryAr}</p>

                {/* Features list */}
                <div className="space-y-2 mb-4 bg-[#0d131f] p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    المميزات التقنية:
                  </span>
                  {ind.featuresAr.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px]">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Pine Script snippet preview toggle */}
                <div className="mb-4">
                  <button
                    onClick={() => setActiveSnippetId(activeSnippetId === ind.id ? null : ind.id)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{activeSnippetId === ind.id ? 'إخفاء معاينة الكود' : 'معاينة ترويسة Pine Script'}</span>
                  </button>

                  {activeSnippetId === ind.id && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-[#070b12] border border-slate-800 text-[10px] text-emerald-400 font-mono overflow-x-auto leading-relaxed">
                      {ind.pineScriptSnippet}
                    </pre>
                  )}
                </div>
              </div>

              {/* Action bottom section */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">السعر المستقل:</span>
                    <span className="text-lg font-black text-slate-100 font-mono">
                      ${ind.priceUsd} USD
                    </span>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    مجاني 100% للوسيط المعتمد
                  </span>
                </div>

                {/* Activation status / button */}
                {isActivated ? (
                  <div className="w-full py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                    تم إرسال دعوة التفعيل لحساب تريدنج فيو بنجاح! ✓
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleActivate(ind.id)}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs transition-colors shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>تفعيل المؤشر فوراً على TradingView</span>
                    </button>

                    <button
                      onClick={onOpenBrokerModal}
                      className="w-full py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[11px] transition-colors border border-amber-500/30 flex items-center justify-center gap-1"
                    >
                      <span>تفعيل مجاني مدى الحياة عبر شريك الوساطة</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
