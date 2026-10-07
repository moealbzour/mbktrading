import React, { useState } from 'react';
import { MarketTicker } from '../types/trading';
import {
  TrendingUp,
  Activity,
  Maximize2,
  Sparkles,
  Zap,
  CheckCircle2,
  Cpu,
  BarChart3,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';

interface TerminalPreviewProps {
  tickers: MarketTicker[];
  onOpenAuth: (tab: 'login' | 'signup') => void;
}

export const TerminalPreview: React.FC<TerminalPreviewProps> = ({
  tickers,
  onOpenAuth
}) => {
  const [activeTab, setActiveTab] = useState<'US100' | 'XAUUSD'>('US100');

  const us100Candles = [
    { o: 20410, h: 20435, l: 20405, c: 20430, isUp: true },
    { o: 20430, h: 20455, l: 20425, c: 20450, isUp: true },
    { o: 20450, h: 20465, l: 20438, c: 20442, isUp: false },
    { o: 20442, h: 20470, l: 20440, c: 20468, isUp: true },
    { o: 20468, h: 20490, l: 20460, c: 20485, isUp: true },
    { o: 20485, h: 20510, l: 20480, c: 20505, isUp: true },
    { o: 20505, h: 20515, l: 20492, c: 20498, isUp: false },
    { o: 20498, h: 20540, l: 20495, c: 20535, isUp: true },
    { o: 20535, h: 20570, l: 20530, c: 20565, isUp: true }
  ];

  const xauusdCandles = [
    { o: 2652, h: 2656, l: 2651, c: 2655, isUp: true },
    { o: 2655, h: 2658, l: 2653, c: 2654, isUp: false },
    { o: 2654, h: 2662, l: 2653, c: 2660, isUp: true },
    { o: 2660, h: 2668, l: 2659, c: 2666, isUp: true },
    { o: 2666, h: 2671, l: 2664, c: 2670, isUp: true },
    { o: 2670, h: 2675, l: 2668, c: 2672, isUp: true },
    { o: 2672, h: 2686, l: 2671, c: 2684, isUp: true }
  ];

  const candles = activeTab === 'US100' ? us100Candles : xauusdCandles;
  const currentPrice = activeTab === 'US100' ? '20,565.40' : '2,684.20';
  const signalText = activeTab === 'US100' ? 'BUY US100 @ 20,442.00' : 'BUY XAUUSD @ 2,660.00';
  const gainText = activeTab === 'US100' ? '+123.4 Pips' : '+242 Pips';

  return (
    <div className="relative mx-auto max-w-5xl rounded-2xl bg-[#0d131f] border border-cyan-500/30 p-2 sm:p-4 shadow-2xl shadow-cyan-950/50 overflow-hidden">
      {/* Scanline sweep animation across terminal */}
      <div className="ticket-scanline" />

      {/* Terminal Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 px-2">
        <div className="flex items-center gap-3">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Symbol Switchers */}
          <div className="flex items-center gap-1 bg-[#141b29] p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('US100')}
              className={`px-3 py-1 rounded-md font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'US100'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              US100 (ناسداك)
            </button>
            <button
              onClick={() => setActiveTab('XAUUSD')}
              className={`px-3 py-1 rounded-md font-bold font-mono transition-all cursor-pointer ${
                activeTab === 'XAUUSD'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              XAUUSD (الذهب)
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            M5 Scalp Engine
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>0.9ms Latency</span>
          </div>

          <button
            onClick={() => onOpenAuth('signup')}
            className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>فتح المنصة الكاملة</span>
          </button>
        </div>
      </div>

      {/* Terminal Main Graphic Chart Area */}
      <div className="relative mt-3 h-64 sm:h-80 w-full rounded-xl bg-[#090d15] border border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden">
        {/* Dynamic Grid Overlay */}
        <div className="dynamic-grid-bg absolute inset-0 pointer-events-none" />

        {/* Current Quote Header */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100">
                {currentPrice}
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                +1.24%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مؤشر MBK Precision Ribbon v3.4 • تقاطع صاعد مؤكد
            </p>
          </div>

          {/* Active Signal Pill */}
          <div className="rounded-xl bg-[#141d2e] border border-emerald-500/40 p-2 text-right shadow-lg">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{signalText}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] font-mono mt-1 text-slate-300">
              <span>الهدف 2 محقق</span>
              <span className="text-emerald-400 font-bold">{gainText}</span>
            </div>
          </div>
        </div>

        {/* Candlestick Wave Graphics */}
        <div className="relative z-10 flex items-end justify-between h-40 px-2 sm:px-6 pt-4">
          {candles.map((c, i) => {
            const height = Math.max(24, Math.abs(c.c - c.o) * 1.8 + 20);
            return (
              <div key={i} className="flex flex-col items-center group relative cursor-pointer">
                {/* Candle Wick */}
                <div
                  className={`w-0.5 ${c.isUp ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  style={{ height: `${height + 25}px` }}
                />
                {/* Candle Body */}
                <div
                  className={`w-3.5 sm:w-6 rounded-xs absolute transition-transform group-hover:scale-110 ${
                    c.isUp
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(0,230,118,0.4)]'
                      : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  }`}
                  style={{
                    height: `${height}px`,
                    bottom: `${(i * 7) % 35 + 10}px`
                  }}
                />

                {/* Buy Trigger Label on Key Breakthrough Candle */}
                {i === 3 && (
                  <div className="absolute -bottom-8 whitespace-nowrap bg-emerald-500 text-slate-950 font-black text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                    ▲ MBK BUY
                  </div>
                )}
                {i === candles.length - 1 && (
                  <div className="absolute -top-7 whitespace-nowrap bg-cyan-500 text-slate-950 font-black text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg">
                    🎯 TP2 HIT
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Technical Indicators Sub-panel */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span>RSI(14): <strong className="text-emerald-400">63.8 (Bullish Momentum)</strong></span>
            <span className="hidden sm:inline">EMA(21/50): <strong className="text-cyan-400">Golden Cross</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Equinix LD4 Ultra-low Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
