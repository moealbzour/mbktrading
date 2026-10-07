import React, { useEffect, useRef, useState, useId } from 'react';
import { MarketSymbol, MarketTicker, TradeSignal } from '../types/trading';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  Layers,
  BarChart2,
  Activity,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { soundManager } from '../utils/audio';

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: any) => any;
    };
  }
}

export interface TradingViewChartProps {
  symbol: MarketSymbol;
  onSymbolChange: (sym: MarketSymbol) => void;
  tickers: MarketTicker[];
  fullHeightOnMobile?: boolean;
  activeSignal?: TradeSignal | null;
  onClearSignal?: () => void;
}

// Official TradingView Tickers Mapping
export const TRADINGVIEW_TICKERS: Record<
  MarketSymbol,
  { tvSymbol: string; label: string; nameAr: string }
> = {
  US100: {
    tvSymbol: 'NASDAQ:NDX',
    label: 'NASDAQ:NDX',
    nameAr: 'ناسداك 100 (US100)'
  },
  XAUUSD: {
    tvSymbol: 'OANDA:XAUUSD',
    label: 'OANDA:XAUUSD',
    nameAr: 'الذهب مقابل الدولار'
  },
  EURUSD: {
    tvSymbol: 'FX:EURUSD',
    label: 'EURUSD',
    nameAr: 'اليورو مقابل الدولار'
  },
  BTCUSD: {
    tvSymbol: 'BINANCE:BTCUSDT',
    label: 'BTCUSD',
    nameAr: 'البيتكوين'
  },
  WTI: {
    tvSymbol: 'TVC:USOIL',
    label: 'USOIL',
    nameAr: 'النفط الخام'
  },
  GBPUSD: {
    tvSymbol: 'FX:GBPUSD',
    label: 'GBPUSD',
    nameAr: 'الجنيه الإسترليني'
  }
};

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  onSymbolChange,
  tickers,
  fullHeightOnMobile = true,
  activeSignal,
  onClearSignal
}) => {
  const containerId = useId().replace(/:/g, '_') + '_tv_chart';
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');
  const [showRsi, setShowRsi] = useState(true);
  const [showMa, setShowMa] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showOverlayBadges, setShowOverlayBadges] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);

  const currentTickerInfo = TRADINGVIEW_TICKERS[symbol] || TRADINGVIEW_TICKERS.US100;
  const currentTicker = tickers.find((t) => t.symbol === symbol) || tickers[0];

  // Map timeframe to TradingView interval string
  const getIntervalString = (tf: '1m' | '5m' | '15m' | '1h' | '4h' | '1D'): string => {
    switch (tf) {
      case '1m':
        return '1';
      case '5m':
        return '5';
      case '15m':
        return '15';
      case '1h':
        return '60';
      case '4h':
        return '240';
      case '1D':
        return 'D';
      default:
        return '15';
    }
  };

  // Compile studies list
  const getStudiesList = () => {
    const list: string[] = [];
    if (showRsi) list.push('STD;RSI');
    if (showMa) {
      list.push('STD;SMA');
      list.push('STD;EMA');
    }
    if (showVolume) list.push('STD;Volume');
    return list;
  };

  // Load official TradingView tv.js script once
  useEffect(() => {
    if (window.TradingView) {
      setIsScriptReady(true);
      return;
    }

    const existingScript = document.getElementById('tradingview-tv-js');
    if (existingScript) {
      const handleLoad = () => setIsScriptReady(true);
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    const script = document.createElement('script');
    script.id = 'tradingview-tv-js';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      setIsScriptReady(true);
    };
    script.onerror = () => {
      console.warn('TradingView tv.js script loading failed, relying on iframe fallback');
      setIsScriptReady(false);
    };
    document.head.appendChild(script);
  }, []);

  // Instantiate or re-initialize widget when parameters change
  useEffect(() => {
    if (!isScriptReady || !window.TradingView) return;

    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const studies = getStudiesList();
    const intervalVal = getIntervalString(timeframe);

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol: currentTickerInfo.tvSymbol,
        interval: intervalVal,
        timezone: 'Asia/Riyadh',
        theme: 'dark',
        style: '1',
        locale: 'ar',
        toolbar_bg: '#06080C',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        container_id: containerId,
        studies: studies,
        overrides: {
          'paneProperties.background': '#06080C',
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': 'rgba(30, 38, 56, 0.45)',
          'paneProperties.horzGridProperties.color': 'rgba(30, 38, 56, 0.45)',
          'scalesProperties.backgroundColor': '#06080C',
          'scalesProperties.textColor': '#94a3b8',
          'scalesProperties.lineColor': 'rgba(30, 38, 56, 0.8)',
          'mainSeriesProperties.candleStyle.upColor': '#00E676',
          'mainSeriesProperties.candleStyle.downColor': '#EF4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#00E676',
          'mainSeriesProperties.candleStyle.borderDownColor': '#EF4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#00E676',
          'mainSeriesProperties.candleStyle.wickDownColor': '#EF4444'
        }
      });
    } catch (err) {
      console.warn('TradingView widget initialization error:', err);
    }
  }, [isScriptReady, symbol, timeframe, showRsi, showMa, showVolume, currentTickerInfo.tvSymbol, containerId]);

  // Touch Swipe Gesture for switching active assets (US100 / XAUUSD / EURUSD)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartXRef.current;
    const dy = touchEndY - touchStartYRef.current;

    // Detect horizontal swipe (dx > 45px, dy < 65px)
    if (Math.abs(dx) > 45 && Math.abs(dy) < 65) {
      const symbols: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'];
      const currentIndex = symbols.indexOf(symbol);
      if (currentIndex !== -1) {
        if (dx < 0) {
          // Swipe Left -> Next asset
          const nextIndex = (currentIndex + 1) % symbols.length;
          soundManager.playClick();
          onSymbolChange(symbols[nextIndex]);
        } else {
          // Swipe Right -> Previous asset
          const prevIndex = (currentIndex - 1 + symbols.length) % symbols.length;
          soundManager.playClick();
          onSymbolChange(symbols[prevIndex]);
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Primary toggle symbols
  const primarySymbols: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'];
  const timeframesList: Array<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'> = ['1m', '5m', '15m', '1h', '4h', '1D'];

  // Fallback iframe URL in case script is pending or blocked
  const intervalVal = getIntervalString(timeframe);
  const studiesArray = getStudiesList();
  const iframeSrc = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    currentTickerInfo.tvSymbol
  )}&interval=${intervalVal}&theme=dark&style=1&timezone=Asia%2FRiyadh&toolbarbg=06080C&studies=${encodeURIComponent(
    JSON.stringify(studiesArray)
  )}&locale=ar&utm_source=mbktrading.live`;

  return (
    <div
      className={`flex flex-col bg-[#06080C] border border-[#1E2638] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative ${
        isFullscreen
          ? 'fixed inset-2 md:inset-4 z-50 bg-[#06080C] border-cyan-500/60 shadow-[0_0_50px_rgba(0,0,0,0.9)]'
          : 'shadow-[0_10px_35px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* 1. OBSIDIAN CHARCOAL CUSTOM TOP TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 bg-[#06080C] border-b border-[#1E2638]">
        {/* Left: Quick Ticker Toggle Chips (NASDAQ:NDX, OANDA:XAUUSD, EURUSD) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {primarySymbols.map((sym) => {
            const symTicker = tickers.find((t) => t.symbol === sym);
            const isSelected = sym === symbol;
            const itemConfig = TRADINGVIEW_TICKERS[sym];

            return (
              <button
                key={sym}
                onClick={() => {
                  soundManager.playClick();
                  onSymbolChange(sym);
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/25 ring-1 ring-cyan-500/30'
                    : 'bg-[#0d131f] text-slate-400 hover:text-slate-200 hover:bg-[#131c2c] border border-slate-800/80'
                }`}
              >
                <span className="font-mono">{itemConfig.label}</span>
                {symTicker && (
                  <span
                    className={`tabular-nums text-[11px] font-mono font-semibold ${
                      symTicker.isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {symTicker.price.toLocaleString(undefined, { minimumFractionDigits: symTicker.digits })}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Timeframes & Technical Indicator Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Timeframe Selector Buttons */}
          <div className="flex items-center bg-[#0d131f] p-0.5 rounded-xl border border-slate-800">
            {timeframesList.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  soundManager.playClick();
                  setTimeframe(tf);
                }}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowRsi(!showRsi);
              }}
              title="تفعيل/تعطيل مؤشر القوة النسبية (RSI)"
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                showRsi
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-[#0d131f] border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              RSI
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setShowMa(!showMa);
              }}
              title="تفعيل/تعطيل المتوسطات المتحركة (MA / EMA)"
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                showMa
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-[#0d131f] border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              MA
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setShowVolume(!showVolume);
              }}
              title="تفعيل/تعطيل الفوليوم (Volume)"
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                showVolume
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-[#0d131f] border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              VOL
            </button>
          </div>

          {/* Toggle Signal Targets Overlay */}
          {activeSignal && (
            <button
              onClick={() => setShowOverlayBadges(!showOverlayBadges)}
              title="إظهار أو إخفاء أهداف الصفقة"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                showOverlayBadges
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
                  : 'bg-[#0d131f] border-slate-800 text-slate-400'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">أهداف الصفقة</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#0d131f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. SUB-BAR: LIVE TICKER DATA & ASSET DETAILS */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2 bg-[#06080C]/95 border-b border-[#1E2638] text-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-slate-100 text-sm font-sans">{currentTickerInfo.nameAr}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono font-bold">
              {currentTickerInfo.tvSymbol}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400 text-[11px] hidden sm:inline">السعر اللحظي:</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                currentTicker.isUp ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currentTicker.price.toLocaleString(undefined, {
                minimumFractionDigits: currentTicker.digits
              })}
            </span>
            <span
              className={`flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                currentTicker.isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {currentTicker.isUp ? <TrendingUp className="w-3 h-3 ml-0.5 inline" /> : <TrendingDown className="w-3 h-3 ml-0.5 inline" />}
              {currentTicker.changePercent > 0 ? '+' : ''}
              {currentTicker.changePercent}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <div className="hidden sm:block">
            <span>أعلى: </span>
            <span className="text-slate-200">{currentTicker.high.toLocaleString()}</span>
          </div>
          <div className="hidden sm:block">
            <span>أدنى: </span>
            <span className="text-slate-200">{currentTicker.low.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-sans text-[10px]">
            <Radio className="w-2.5 h-2.5 animate-ping text-cyan-400" />
            <span>بث TradingView المباشر</span>
          </div>
        </div>
      </div>

      {/* 3. MOBILE SWIPE HELPER BAR */}
      <div className="md:hidden flex items-center justify-between px-3 py-1 bg-[#06080C] border-b border-[#1E2638] text-[10px] text-slate-400 select-none">
        <span className="flex items-center gap-1 text-cyan-400 font-bold">
          <span>👈 اسحب للتنقل بين (NASDAQ:NDX / XAUUSD / EURUSD) 👉</span>
        </span>
        <span className="text-emerald-400 font-mono font-bold shrink-0">نشط</span>
      </div>

      {/* 4. MAIN CHART CONTAINER WITH OFFICIAL TRADINGVIEW WIDGET */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full relative bg-[#06080C] transition-all duration-300 overflow-hidden ${
          isFullscreen
            ? 'h-[calc(100vh-140px)]'
            : fullHeightOnMobile
            ? 'h-[calc(100vh-230px)] min-h-[420px] md:h-[500px]'
            : 'h-[460px]'
        }`}
      >
        {/* Primary Container for tv.js widget */}
        <div id={containerId} className="w-full h-full" />

        {/* Resilient Iframe Fallback (mounted if tv.js script is pending or blocked) */}
        {!isScriptReady && (
          <iframe
            title="TradingView Advanced Real-Time Chart"
            src={iframeSrc}
            className="w-full h-full border-0 absolute inset-0 bg-[#06080C]"
            allow="fullscreen"
          />
        )}

        {/* 5. DYNAMIC SIGNAL ENTRY & TARGET BADGES OVERLAY (Requirement 4) */}
        {activeSignal && showOverlayBadges && (
          <>
            {/* A. Top-Floating Institutional Signal HUD */}
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
              <div className="p-3 rounded-2xl bg-[#06080C]/90 backdrop-blur-md border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-xs text-slate-100 font-['Cairo',sans-serif] space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg font-black text-[10px] font-mono tracking-wider ${
                        activeSignal.type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {activeSignal.type === 'BUY' ? '🟢 شراء BUY' : '🔴 بيع SELL'}
                    </span>
                    <span className="font-extrabold text-sm text-slate-100 font-mono">
                      {activeSignal.symbol}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {activeSignal.strategyName || 'MBK Strategy'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">
                      +{activeSignal.pips} Pip
                    </span>
                    {onClearSignal && (
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          onClearSignal();
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
                        title="إلغاء تثبيت الإشارة من الشارت"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Core Levels Badges Grid: Entry, TP1, TP2, SL */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {/* Entry Badge */}
                  <div className="p-1.5 rounded-xl bg-[#0c1422] border border-cyan-500/30 flex flex-col">
                    <span className="text-[9px] text-cyan-400 font-sans block mb-0.5 font-bold">
                      🎯 نقطة الدخول
                    </span>
                    <span className="font-extrabold text-cyan-200 tabular-nums text-xs">
                      {activeSignal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* TP1 Badge */}
                  <div className="p-1.5 rounded-xl bg-[#0a1e17] border border-emerald-500/40 flex flex-col">
                    <span className="text-[9px] text-emerald-400 font-sans block mb-0.5 font-bold">
                      🏆 الهدف 1 (TP1)
                    </span>
                    <span className="font-extrabold text-emerald-300 tabular-nums text-xs">
                      {activeSignal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* TP2 Badge */}
                  <div className="p-1.5 rounded-xl bg-[#092224] border border-sky-500/40 flex flex-col">
                    <span className="text-[9px] text-sky-400 font-sans block mb-0.5 font-bold">
                      🚀 الهدف 2 (TP2)
                    </span>
                    <span className="font-extrabold text-sky-300 tabular-nums text-xs">
                      {activeSignal.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* SL Badge */}
                  <div className="p-1.5 rounded-xl bg-[#200e12] border border-rose-500/40 flex flex-col">
                    <span className="text-[9px] text-rose-400 font-sans block mb-0.5 font-bold">
                      🛑 وقف الخسارة (SL)
                    </span>
                    <span className="font-extrabold text-rose-300 tabular-nums text-xs">
                      {activeSignal.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Subfooter: Risk Reward & Note */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="font-mono text-cyan-400">
                    نسبة العائد للمخاطر: {activeSignal.riskReward || '1:2.4'}
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>إشارة Pine Script معتمدة</span>
                  </span>
                </div>
              </div>
            </div>

            {/* B. Floating Right Price Scale Target Badges (Pinned along the vertical scale) */}
            <div className="absolute right-2 top-16 bottom-16 hidden sm:flex flex-col justify-around pointer-events-none z-20">
              {/* TP2 Badge */}
              <div className="pointer-events-auto bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-l-lg shadow-lg border border-sky-400/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>TP2: {activeSignal.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* TP1 Badge */}
              <div className="pointer-events-auto bg-gradient-to-r from-emerald-600 to-green-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-l-lg shadow-lg border border-emerald-400/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>TP1: {activeSignal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Entry Badge */}
              <div className="pointer-events-auto bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-l-lg shadow-lg border border-cyan-400/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>ENTRY: {activeSignal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* SL Badge */}
              <div className="pointer-events-auto bg-gradient-to-r from-rose-700 to-red-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-l-lg shadow-lg border border-rose-400/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>SL: {activeSignal.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 6. BOTTOM BRAND WATERMARK FOOTER */}
      <div className="flex items-center justify-between px-3 py-1.5 sm:px-4 bg-[#06080C] border-t border-[#1E2638] text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">MBK Institutional Engine:</span>
          <span className="text-cyan-400 font-mono font-bold">TradingView Advanced Core</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-amber-400 hidden sm:inline">خوادم Pine Script المشفرة</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline">London LD4 (0.8ms)</span>
          <span className="text-slate-400 font-mono">UTC+3 (توقيت مكة)</span>
        </div>
      </div>
    </div>
  );
};
