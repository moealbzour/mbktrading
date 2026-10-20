import React, { useState, useEffect } from 'react';
import { MarketSymbol, MarketTicker } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface HeaderTickerProps {
  tickers?: MarketTicker[];
  onSelectSymbol?: (symbol: MarketSymbol) => void;
  className?: string;
  lang?: 'ar' | 'en';
}

interface TickerDisplayItem {
  symbol: MarketSymbol;
  nameAr: string;
  nameEn: string;
  price: number;
  change: string;
  isUp: boolean;
  digits: number;
}

const DEFAULT_REAL_TICKERS: TickerDisplayItem[] = [
  { symbol: 'US100', nameAr: 'ناسداك 100', nameEn: 'US100', price: 29646.25, change: '-0.26%', isUp: false, digits: 2 },
  { symbol: 'XAUUSD', nameAr: 'الذهب', nameEn: 'XAUUSD', price: 4154.20, change: '-0.14%', isUp: false, digits: 2 },
  { symbol: 'EURUSD', nameAr: 'اليورو/دولار', nameEn: 'EURUSD', price: 1.1221, change: '+0.04%', isUp: true, digits: 4 },
  { symbol: 'BTCUSD', nameAr: 'البيتكوين', nameEn: 'BTCUSD', price: 81598.06, change: '-0.30%', isUp: false, digits: 2 },
  { symbol: 'US100', nameAr: 'مؤشر الدولار', nameEn: 'DXY', price: 101.94, change: '-0.04%', isUp: false, digits: 2 },
  { symbol: 'US100', nameAr: 'S&P 500', nameEn: 'SPX500', price: 7690.73, change: '+0.41%', isUp: true, digits: 2 },
  { symbol: 'WTI', nameAr: 'نفط تكساس', nameEn: 'WTI', price: 98.53, change: '-0.01%', isUp: false, digits: 2 },
  { symbol: 'GBPUSD', nameAr: 'الإسترليني/دولار', nameEn: 'GBPUSD', price: 1.3316, change: '+0.07%', isUp: true, digits: 4 }
];

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  tickers: propTickers,
  onSelectSymbol,
  className = '',
  lang = 'ar'
}) => {
  const [tickerList, setTickerList] = useState<TickerDisplayItem[]>(() => {
    if (propTickers && propTickers.length > 0) {
      return propTickers.map((t) => ({
        symbol: t.symbol,
        nameAr: t.nameAr.split(' ')[0] || t.symbol,
        nameEn: t.symbol,
        price: t.price,
        change: `${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(2)}%`,
        isUp: t.isUp,
        digits: t.digits > 4 ? 4 : t.digits
      }));
    }
    return DEFAULT_REAL_TICKERS;
  });

  const isAr = lang === 'ar';

  // Sync when propTickers changes
  useEffect(() => {
    if (propTickers && propTickers.length > 0) {
      setTickerList(
        propTickers.map((t) => ({
          symbol: t.symbol,
          nameAr: t.nameAr.split(' ')[0] || t.symbol,
          nameEn: t.symbol,
          price: t.price,
          change: `${t.changePercent >= 0 ? '+' : ''}${t.changePercent.toFixed(2)}%`,
          isUp: t.isUp,
          digits: t.digits > 4 ? 4 : t.digits
        }))
      );
    }
  }, [propTickers]);

  // Direct fetch from real market quotes endpoint every 4 seconds for continuous real prices
  useEffect(() => {
    let isMounted = true;

    const fetchRealFeed = async () => {
      try {
        const res = await fetch('/api/market/real-prices');
        if (res.ok) {
          const data = await res.json();
          if (data.tickers && Array.isArray(data.tickers) && data.tickers.length > 0 && isMounted) {
            setTickerList(
              data.tickers.map((t: any) => ({
                symbol: t.symbol as MarketSymbol,
                nameAr: t.nameAr?.split(' ')[0] || t.symbol,
                nameEn: t.nameEn || t.symbol,
                price: Number(t.price),
                change: `${t.changePercent >= 0 ? '+' : ''}${Number(t.changePercent).toFixed(2)}%`,
                isUp: Boolean(t.isUp),
                digits: t.digits > 4 ? 4 : t.digits
              }))
            );
          }
        }
      } catch {
        // Silent recovery
      }
    };

    const interval = setInterval(fetchRealFeed, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`w-full bg-[#131722] border-b border-[#2a2e39] relative overflow-hidden transition-all text-[11px] sm:text-xs font-mono select-none h-8 sm:h-9 flex items-center z-30 ${className}`}
    >
      {/* Live Market Pulse Dot on the start (Selector 3 & 2) */}
      <div
        title={isAr ? 'تغذية الأسعار الحقيقية المباشرة من الأسواق العالمية' : 'Real-time global market feeds'}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-[#1e222d] border-inline-end border-[#2a2e39] shrink-0 z-20 cursor-default"
      >
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[#089981]"></span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-wider font-mono flex items-center gap-1">
          <span>{isAr ? 'أسعار حية حقيقية' : 'LIVE REAL FEED'}</span>
        </span>
      </div>

      {/* Single Smooth Continuous Ticker Marquee (Selector 4 & 1) */}
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
              className="inline-flex items-center gap-2 hover:bg-[#1e222d] px-2.5 py-1 rounded transition-colors cursor-pointer text-xs group"
            >
              <span className="text-[#d1d4dc] font-bold group-hover:text-white transition-colors">
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
                className={`font-mono text-[11px] font-bold inline-block tabular-nums px-1 py-0.2 rounded ${
                  t.isUp ? 'text-[#089981] bg-[#089981]/10' : 'text-[#f23645] bg-[#f23645]/10'
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
