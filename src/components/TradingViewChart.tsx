import React from 'react';
import { MarketSymbol, MarketTicker, TradeSignal } from '../types/trading';
import { X } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';

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
  const currentTickerInfo = TRADINGVIEW_TICKERS[symbol] || TRADINGVIEW_TICKERS.US100;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const toolbarBgParam = isLight ? 'F8FAFC' : '131722';

  const iframeSrc = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    currentTickerInfo.tvSymbol
  )}&interval=15&theme=${isLight ? 'light' : 'dark'}&style=1&timezone=Asia%2FRiyadh&toolbarbg=${toolbarBgParam}&hide_side_toolbar=0&allow_symbol_change=1&locale=ar&utm_source=mbktrading.live`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative select-none bg-[#131722]">
      {/* PURE 100% FULL HEIGHT CHART CONTAINER */}
      <div className="w-full h-full flex-1 relative overflow-hidden bg-[#131722]">
        <iframe
          title="TradingView Advanced Chart"
          src={iframeSrc}
          className="w-full h-full border-0 absolute inset-0 bg-[#131722]"
          allow="fullscreen"
        />

        {/* DYNAMIC SIGNAL HUD OVERLAY IF ACTIVE */}
        {activeSignal && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
            <div className="p-2.5 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#089981]/40 shadow-2xl text-xs text-slate-100 space-y-1.5">
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
