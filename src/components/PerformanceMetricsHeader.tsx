import React from 'react';
import {
  TrendingUp,
  Award,
  Bot,
  Zap,
  Sparkles,
  Users,
  Target,
  ArrowUpRight
} from 'lucide-react';

interface Props {
  todaySignalsTotal: number;
  todayWins: number;
  todayLosses: number;
  botPnL: number;
  botWinRate: number;
  monthlyWinRate: number;
  monthlyPips: number;
  aiSentimentSummary: string;
  onlineTraders: number;
  onOpenAISentiment: () => void;
  onOpenBot: () => void;
  onOpenSignals: () => void;
}

export const PerformanceMetricsHeader: React.FC<Props> = ({
  todaySignalsTotal,
  todayWins,
  todayLosses,
  botPnL,
  botWinRate,
  monthlyWinRate,
  monthlyPips,
  aiSentimentSummary,
  onlineTraders,
  onOpenAISentiment,
  onOpenBot,
  onOpenSignals
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
      {/* 1. Today's Signals */}
      <div
        onClick={onOpenSignals}
        className="bg-[#111827] hover:bg-[#161f33] border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">إشارات اليوم</span>
          <Target className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-slate-100 font-mono tabular-nums">
            {todaySignalsTotal}
          </span>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {todayWins} رابحة / {todayLosses} خاسرة
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>دقة الإشارات اليومية</span>
          <span className="text-emerald-400 font-mono font-bold">
            {((todayWins / (todaySignalsTotal || 1)) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 2. Bot P&L Today */}
      <div
        onClick={onOpenBot}
        className="bg-[#111827] hover:bg-[#161f33] border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">أداء البوت الآلي اليوم</span>
          <Bot className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            +${botPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>نسبة فوز البوت</span>
          <span className="text-cyan-400 font-mono font-bold">{botWinRate}%</span>
        </div>
      </div>

      {/* 3. Monthly Win Rate */}
      <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">نسبة نجاح الشهر</span>
          <Award className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-amber-300 font-mono tabular-nums">
            {monthlyWinRate}%
          </span>
          <span className="text-[11px] font-bold text-amber-400/80">محققة</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>توثيق Myfxbook</span>
          <span className="text-emerald-400 font-mono">حقيقي معتمد ✓</span>
        </div>
      </div>

      {/* 4. Pips Gained */}
      <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">أرباح الشهر (النقاط)</span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            +{monthlyPips.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">نقطة (Pip)</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>متوسط المخاطرة</span>
          <span className="text-cyan-400 font-mono">1:2.4 R:R</span>
        </div>
      </div>

      {/* 5. AI Sentiment */}
      <div
        onClick={onOpenAISentiment}
        className="bg-[#111827] hover:bg-[#161f33] border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl transition-all cursor-pointer group shadow-sm col-span-2 md:col-span-1 xl:col-span-1"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">معنويات الذكاء الاصطناعي</span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-xs font-bold text-slate-200 truncate leading-snug">
          {aiSentimentSummary}
        </div>
        <div className="text-[10px] text-indigo-400 mt-1 flex items-center justify-between">
          <span>تحديث دفعة الجلسة</span>
          <span className="font-mono flex items-center gap-0.5">
            عرض التقرير <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 6. Online Members */}
      <div className="bg-[#111827] border border-slate-800 p-3.5 rounded-xl shadow-sm col-span-2 md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
          <span className="font-medium">المتداولون المتواجدون</span>
          <Users className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-slate-100 font-mono tabular-nums">
            {onlineTraders}
          </span>
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            متصل الآن
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>إجمالي أعضاء VIP</span>
          <span className="text-slate-300 font-mono">1,048 متداول</span>
        </div>
      </div>
    </div>
  );
};
