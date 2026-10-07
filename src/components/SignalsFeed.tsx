import React, { useState } from 'react';
import { TradeSignal, MarketSymbol, SignalStatus } from '../types/trading';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  PlusCircle,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface Props {
  signals: TradeSignal[];
  onOpenNewSignalModal: () => void;
  onCopySignalToAccount: (signal: TradeSignal) => void;
}

export const SignalsFeed: React.FC<Props> = ({
  signals,
  onOpenNewSignalModal,
  onCopySignalToAccount
}) => {
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSignals = signals.filter((sig) => {
    if (filterSymbol !== 'ALL' && sig.symbol !== filterSymbol) return false;
    if (filterStatus === 'ACTIVE' && sig.status !== 'ACTIVE') return false;
    if (filterStatus === 'TP_HIT' && !['TP1_HIT', 'TP2_HIT'].includes(sig.status)) return false;
    return true;
  });

  const handleCopy = (sig: TradeSignal) => {
    soundManager.playClick();
    onCopySignalToAccount(sig);
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2500);

    if (sig.status === 'TP1_HIT' || sig.status === 'TP2_HIT') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const getStatusBadge = (status: SignalStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>نشطة وقيد المتابعة</span>
          </span>
        );
      case 'TP1_HIT':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم تحقيق الهدف الأول (TP1) ✓</span>
          </span>
        );
      case 'TP2_HIT':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم ضرب جميع الأهداف بالكامل (TP2) 🎯</span>
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ضرب وقف الخسارة (SL)</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            مغلقة
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>إشارات التداول الحية المعتمدة</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TradingView Webhook Verified
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              إشارات فورية على مؤشر ناسداك والذهب بأمر من الخوارزميات وتحليل فريق أبحاث MBK والمحللين المعتمدين
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewSignalModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-sm shadow-cyan-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>نشر إشارة جديدة (Admin)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2.5 bg-[#0b0f17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Symbol filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-medium ml-1">الأصل:</span>
          {['ALL', 'US100', 'XAUUSD', 'EURUSD'].map((sym) => (
            <button
              key={sym}
              onClick={() => setFilterSymbol(sym)}
              className={`px-2.5 py-1 rounded-md transition-all font-mono font-medium ${
                filterSymbol === sym
                  ? 'bg-slate-700 text-cyan-300 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sym === 'ALL' ? 'جميع الأصول' : sym}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium ml-1">الحالة:</span>
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'ACTIVE', label: 'النشطة فقط' },
            { id: 'TP_HIT', label: 'محققة الأهداف' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filterStatus === st.id
                  ? 'bg-slate-700 text-slate-100 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Signals List Cards */}
      <div className="p-4 space-y-3.5 max-h-[640px] overflow-y-auto">
        {filteredSignals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">لا توجد إشارات مطابقة للفلاتر المحددة حالياً.</p>
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isBuy = signal.type === 'BUY';
            const isCopied = copiedId === signal.id;

            return (
              <div
                key={signal.id}
                className="bg-[#161f30] hover:bg-[#1a253a] border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md group relative overflow-hidden"
              >
                {/* Decorative border accent */}
                <div
                  className={`absolute top-0 right-0 bottom-0 w-1.5 ${
                    isBuy ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />

                {/* Top card row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg font-black text-xs font-mono tracking-wider ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isBuy ? 'شراء BUY' : 'بيع SELL'}</span>
                    </span>

                    <span className="font-extrabold text-base text-slate-100 font-mono tracking-wide">
                      {signal.symbol}
                    </span>

                    <span className="text-xs text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                      {signal.timeframe}
                    </span>

                    <span className="text-[11px] text-cyan-400/90 font-medium hidden sm:inline">
                      {signal.strategyName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{signal.createdAt}</span>
                    </div>
                    {getStatusBadge(signal.status)}
                  </div>
                </div>

                {/* Key Price Levels Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[#0c121d] border border-slate-800/80 mb-3 text-xs font-mono">
                  {/* Entry */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">
                      نقطة الدخول (Entry):
                    </span>
                    <span className="text-sm font-bold text-slate-200 tabular-nums">
                      {signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* TP1 */}
                  <div>
                    <span className="text-[10px] text-emerald-400 block mb-0.5 font-sans">
                      الهدف الأول (TP1):
                    </span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums flex items-center gap-1">
                      {signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {signal.status === 'TP1_HIT' || signal.status === 'TP2_HIT' ? '✓' : ''}
                    </span>
                  </div>

                  {/* TP2 */}
                  <div>
                    <span className="text-[10px] text-cyan-400 block mb-0.5 font-sans">
                      الهدف الثاني (TP2):
                    </span>
                    <span className="text-sm font-bold text-cyan-300 tabular-nums flex items-center gap-1">
                      {signal.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {signal.status === 'TP2_HIT' ? '🎯' : ''}
                    </span>
                  </div>

                  {/* SL */}
                  <div>
                    <span className="text-[10px] text-rose-400 block mb-0.5 font-sans">
                      وقف الخسارة (SL):
                    </span>
                    <span className="text-sm font-bold text-rose-400 tabular-nums">
                      {signal.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Analysis Notes & Risk to Reward */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <p className="text-slate-300 text-xs flex-1 leading-relaxed">
                    <strong className="text-slate-400 font-semibold ml-1">الملاحظة الفنية:</strong>
                    {signal.notesAr}
                  </p>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                      <span>العائد/المخاطرة:</span>
                      <span className="font-bold text-amber-300">{signal.riskReward}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                      <span>الأرباح المحققة:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        +{signal.pips} Pip
                      </span>
                    </div>

                    {/* Instant Copy Button */}
                    <button
                      onClick={() => handleCopy(signal)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-sm shadow-cyan-600/30'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم نسخ الصفقة للميتاتريدر!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الصفقة لحسابي</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
