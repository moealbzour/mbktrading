import React, { useEffect, useId } from 'react';
import { MarketSymbol, MarketTicker, TradeSignal } from '../types/trading';
import { X, CheckCircle2 } from 'lucide-react';
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
    tvSymbol: 'NASDAQ:QQQ',
    label: 'NASDAQ:QQQ',
    nameAr: 'ناسداك 100 (US100)'
  },
  XAUUSD: {
    tvSymbol: 'OANDA:XAUUSD',
    label: 'OANDA:XAUUSD',
    nameAr: 'الذهب مقابل الدولار'
  },
  EURUSD: {
    tvSymbol: 'OANDA:EURUSD',
    label: 'OANDA:EURUSD',
    nameAr: 'اليورو مقابل الدولار'
  },
  BTCUSD: {
    tvSymbol: 'BINANCE:BTCUSDT',
    label: 'BINANCE:BTCUSDT',
    nameAr: 'البيتكوين'
  },
  WTI: {
    tvSymbol: 'TVC:USOIL',
    label: 'TVC:USOIL',
    nameAr: 'النفط الخام'
  },
  GBPUSD: {
    tvSymbol: 'OANDA:GBPUSD',
    label: 'OANDA:GBPUSD',
    nameAr: 'الجنيه الإسترليني'
  }
};

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  activeSignal,
  onClearSignal
}) => {
  const containerId = useId().replace(/:/g, '_') + '_tv_chart';
  const currentTickerInfo = TRADINGVIEW_TICKERS[symbol] || TRADINGVIEW_TICKERS.US100;

  // Load official TradingView tv.js script once
  useEffect(() => {
    if (window.TradingView) return;

    const existingScript = document.getElementById('tradingview-tv-js');
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = 'tradingview-tv-js';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Instantiate widget when symbol changes
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const initWidget = () => {
      if (!window.TradingView) return;
      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: currentTickerInfo.tvSymbol,
          interval: '15',
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
          studies: ['STD;RSI', 'STD;SMA', 'STD;Volume'],
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
    };

    if (window.TradingView) {
      initWidget();
    } else {
      const timer = setTimeout(initWidget, 500);
      return () => clearTimeout(timer);
    }
  }, [symbol, currentTickerInfo.tvSymbol, containerId]);

  // Fallback iframe URL if script load is pending
  const iframeSrc = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    currentTickerInfo.tvSymbol
  )}&interval=15&theme=dark&style=1&timezone=Asia%2FRiyadh&toolbarbg=06080C&hide_side_toolbar=0&allow_symbol_change=1&locale=ar&utm_source=mbktrading.live`;

  return (
    <div className="w-full h-full flex flex-col bg-[#06080C] overflow-hidden relative select-none">
      {/* PURE 100% FULL HEIGHT CHART CONTAINER */}
      <div className="w-full h-full flex-1 relative bg-[#06080C] overflow-hidden">
        {/* tv.js container */}
        <div id={containerId} className="w-full h-full" />

        {/* Fallback iframe */}
        <iframe
          title="TradingView Advanced Chart"
          src={iframeSrc}
          className="w-full h-full border-0 absolute inset-0 bg-[#06080C]"
          allow="fullscreen"
        />

        {/* DYNAMIC SIGNAL HUD OVERLAY IF ACTIVE */}
        {activeSignal && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
            <div className="p-2.5 rounded-xl bg-[#06080C]/90 backdrop-blur-md border border-cyan-500/40 shadow-2xl text-xs text-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      activeSignal.type === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {activeSignal.type}
                  </span>
                  <span className="font-bold text-sm text-white font-mono">{activeSignal.symbol}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">+{activeSignal.pips}p</span>
                  {onClearSignal && (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        onClearSignal();
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                <div className="p-1 rounded bg-[#0c1422] border border-cyan-500/30">
                  <span className="text-[8px] text-cyan-400 block">ENTRY</span>
                  <span className="font-bold text-white">{activeSignal.entryPrice}</span>
                </div>
                <div className="p-1 rounded bg-[#200e12] border border-rose-500/30">
                  <span className="text-[8px] text-rose-400 block">SL</span>
                  <span className="font-bold text-rose-300">{activeSignal.sl}</span>
                </div>
                <div className="p-1 rounded bg-[#0a1e17] border border-emerald-500/30">
                  <span className="text-[8px] text-emerald-400 block">TP1</span>
                  <span className="font-bold text-emerald-300">{activeSignal.tp1}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
