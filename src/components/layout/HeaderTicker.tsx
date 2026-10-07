import React, { useEffect, useRef, useState } from 'react';
import { MarketSymbol } from '../../types/trading';
import { Radio, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface HeaderTickerProps {
  onSelectSymbol?: (symbol: MarketSymbol) => void;
  className?: string;
}

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  onSelectSymbol,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up previous widgets inside container
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;

    const widgetConfig = {
      symbols: [
        {
          proName: 'NASDAQ:NDX',
          title: 'US100 (ناسداك)'
        },
        {
          proName: 'OANDA:XAUUSD',
          title: 'XAUUSD (الذهب)'
        },
        {
          proName: 'FX:EURUSD',
          title: 'EURUSD (اليورو)'
        },
        {
          proName: 'BINANCE:BTCUSDT',
          title: 'BTCUSD (البيتكوين)'
        },
        {
          proName: 'TVC:DXY',
          title: 'DXY (مؤشر الدولار)'
        }
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'ar'
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    script.onload = () => {
      setWidgetLoaded(true);
    };

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // Quick fallback prices if user clicks on quick chips
  const quickChips: Array<{ symbol: MarketSymbol; label: string; nameAr: string }> = [
    { symbol: 'US100', label: 'NASDAQ:NDX', nameAr: 'ناسداك 100' },
    { symbol: 'XAUUSD', label: 'OANDA:XAUUSD', nameAr: 'الذهب' },
    { symbol: 'EURUSD', label: 'FX:EURUSD', nameAr: 'اليورو/دولار' },
    { symbol: 'BTCUSD', label: 'BINANCE:BTCUSDT', nameAr: 'البيتكوين' }
  ];

  return (
    <div
      className={`w-full bg-[#06080C] border-b border-[#1E2638] relative overflow-hidden transition-all shadow-[0_4px_25px_rgba(0,0,0,0.8)] font-['Cairo',sans-serif] ${className}`}
      style={{ backgroundColor: '#06080C' }}
    >
      {/* Top Gold Accent Micro-Border */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/80 to-transparent shadow-[0_0_8px_rgba(245,158,11,0.6)]" />

      <div className="flex items-center w-full min-h-[46px]">
        {/* Left Institutional Badge with Gold Accents */}
        <div className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#06080C] via-[#0b101a] to-[#06080C] border-l border-amber-500/30 shrink-0 z-10 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[11px] font-black tracking-wider text-amber-300 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>LIVE TAPE</span>
            </span>
          </div>

          <div className="h-3 w-[1px] bg-amber-500/40 mx-1" />

          {/* Quick interactive toggles */}
          {onSelectSymbol && (
            <div className="hidden md:flex items-center gap-1">
              {quickChips.map((chip) => (
                <button
                  key={chip.symbol}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectSymbol(chip.symbol);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0d131f] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer"
                  title={`عرض شارت ${chip.nameAr}`}
                >
                  {chip.symbol}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Official TradingView Ticker Tape Widget Container */}
        <div className="flex-1 overflow-hidden relative min-h-[46px] bg-[#06080C]">
          <div
            ref={containerRef}
            className="tradingview-widget-container w-full h-full min-h-[46px] [&_iframe]:bg-[#06080C]"
          />
        </div>

        {/* Right Status Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-2 bg-[#06080C] border-r border-amber-500/20 shrink-0 z-10 text-[10px] text-slate-400 font-mono">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">Equinix LD4</span>
          <span className="text-amber-400/90 font-bold">0.8ms</span>
        </div>
      </div>
    </div>
  );
};

export default HeaderTicker;
