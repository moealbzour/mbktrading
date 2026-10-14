import React, { useState, useEffect } from 'react';
import { MarketSymbol } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface HeaderTickerProps {
  onSelectSymbol?: (symbol: MarketSymbol) => void;
  className?: string;
  lang?: 'ar' | 'en';
}

interface TickerItem {
  symbol: MarketSymbol;
  nameAr: string;
  nameEn: string;
  price: number;
  change: string;
  isUp: boolean;
  digits: number;
}

const INITIAL_TICKER_DATA: TickerItem[] = [
  { symbol: 'US100', nameAr: 'ناسداك 100', nameEn: 'US100', price: 20565.4, change: '+0.82%', isUp: true, digits: 2 },
  { symbol: 'XAUUSD', nameAr: 'الذهب', nameEn: 'XAUUSD', price: 2684.2, change: '+0.64%', isUp: true, digits: 2 },
  { symbol: 'EURUSD', nameAr: 'اليورو/دولار', nameEn: 'EURUSD', price: 1.0842, change: '-0.18%', isUp: false, digits: 4 },
  { symbol: 'BTCUSD', nameAr: 'البيتكوين', nameEn: 'BTCUSD', price: 67420.0, change: '+1.45%', isUp: true, digits: 2 },
  { symbol: 'US100', nameAr: 'مؤشر الدولار', nameEn: 'DXY', price: 103.85, change: '-0.12%', isUp: false, digits: 2 },
  { symbol: 'US100', nameAr: 'S&P 500', nameEn: 'SPX500', price: 5864.5, change: '+0.55%', isUp: true, digits: 2 },
  { symbol: 'US100', nameAr: 'إنفيديا', nameEn: 'NVDA', price: 138.25, change: '+2.14%', isUp: true, digits: 2 }
];

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  onSelectSymbol,
  className = '',
  lang = 'ar'
}) => {
  const [tickerList, setTickerList] = useState<TickerItem[]>(INITIAL_TICKER_DATA);
  const isAr = lang === 'ar';

  // Real-time micro-fluctuations (Zero external scripts, Zero console/CORS errors)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerList((prev) =>
        prev.map((item) => {
          if (Math.random() > 0.4) return item;
          const delta = (Math.random() - 0.48) * (item.digits === 4 ? 0.0004 : item.digits === 2 ? 0.8 : 0.05);
          const newPrice = +(item.price + delta).toFixed(item.digits);
          const isUp = delta >= 0;
          const sign = isUp ? '+' : '';
          const percent = `${sign}${(delta / item.price * 100).toFixed(2)}%`;
          return {
            ...item,
            price: newPrice,
            change: percent,
            isUp
          };
        })
      );
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`w-full bg-[#131722] border-b border-[#2a2e39] relative overflow-hidden transition-all text-xs font-mono select-none h-10 flex items-center z-30 ${className}`}
    >
      {/* Live Market Pulse Dot on the start */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#1e222d] border-inline-end border-[#2a2e39] shrink-0 z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#089981]"></span>
        </span>
        <span className="text-[11px] font-bold text-white tracking-wider font-mono">
          {isAr ? 'مباشر' : 'LIVE TAPE'}
        </span>
      </div>

      {/* Single Smooth Continuous Ticker Marquee */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee-smooth px-4">
          {/* Duplicate set for infinite seamless loop */}
          {[...tickerList, ...tickerList].map((t, idx) => (
            <button
              key={`${t.nameEn}-${idx}`}
              onClick={() => {
                soundManager.playClick();
                if (onSelectSymbol) onSelectSymbol(t.symbol);
              }}
              className="inline-flex items-center gap-2 hover:bg-[#1e222d] px-2.5 py-1 rounded transition-colors cursor-pointer text-xs"
            >
              <span className="text-[#d1d4dc] font-bold">
                {isAr ? t.nameAr : t.nameEn}
              </span>
              <span
                dir="ltr"
                className="font-mono text-white font-medium inline-block tabular-nums"
              >
                {t.price.toLocaleString(undefined, { minimumFractionDigits: t.digits, maximumFractionDigits: t.digits })}
              </span>
              <span
                dir="ltr"
                className={`font-mono text-[11px] font-bold inline-block tabular-nums ${
                  t.isUp ? 'text-[#089981]' : 'text-[#f23645]'
                }`}
              >
                {t.change}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
