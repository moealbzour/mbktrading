import React, { useState, useEffect, useRef } from 'react';
import { MarketSymbol, MarketTicker } from '../../types/trading';
import { TradingIdeasFeed } from '../insights/TradingIdeasFeed';
import {
  Compass,
  Sparkles,
  Calendar,
  Timer,
  Activity,
  BarChart3,
  Info
} from 'lucide-react';

interface MarketInsightsWidgetProps {
  selectedSymbol: MarketSymbol;
  onSymbolChange?: (sym: MarketSymbol) => void;
  lang?: 'ar' | 'en';
  activeTicker?: MarketTicker;
}

interface EconomicEvent {
  id: number;
  titleAr: string;
  titleEn: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  impactLabelAr: string;
  targetTime: Date;
  actual: string;
  forecast: string;
  previous: string;
}

// Broker-prefixed symbols for TradingView widgets
const TRADINGVIEW_TICKERS: Record<MarketSymbol, string> = {
  US100: 'NASDAQ:QQQ',
  XAUUSD: 'OANDA:XAUUSD',
  EURUSD: 'OANDA:EURUSD',
  BTCUSD: 'BINANCE:BTCUSDT',
  WTI: 'TVC:USOIL',
  GBPUSD: 'OANDA:GBPUSD'
};

const getTVSymbol = (sym: MarketSymbol | string): string => {
  if (!sym) return 'NASDAQ:QQQ';
  const clean = String(sym).toUpperCase().trim();
  if (clean === 'US100' || clean.includes('US100') || clean.includes('NAS100') || clean.includes('NDX') || clean.includes('QQQ')) {
    return 'NASDAQ:QQQ';
  }
  if (clean === 'XAUUSD' || clean.includes('XAU') || clean.includes('GOLD')) {
    return 'OANDA:XAUUSD';
  }
  if (clean === 'EURUSD' || clean.includes('EURUSD')) {
    return 'OANDA:EURUSD';
  }
  if (clean === 'BTCUSD' || clean.includes('BTC')) {
    return 'BINANCE:BTCUSDT';
  }
  if (clean === 'WTI' || clean.includes('OIL')) {
    return 'TVC:USOIL';
  }
  if (clean === 'GBPUSD' || clean.includes('GBP')) {
    return 'OANDA:GBPUSD';
  }
  return TRADINGVIEW_TICKERS[clean as MarketSymbol] || clean || 'NASDAQ:QQQ';
};

// Subcomponent for TradingView Symbol Info Widget with Dynamic Injection
const TradingViewSymbolInfoWidget: React.FC<{
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}> = ({ symbol, lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: '100%',
      locale: lang === 'ar' ? 'ar' : 'en',
      colorTheme: 'dark',
      isTransparent: true
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.appendChild(widgetContainer);
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, tvSymbol, lang]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden bg-[#06080C]/40 border border-white/5 relative min-h-[90px]"
    />
  );
};

// Subcomponent for TradingView Technical Analysis Widget with Dynamic Injection
const TradingViewTechnicalAnalysisWidget: React.FC<{
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}> = ({ symbol, lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '15m',
      width: '100%',
      isTransparent: true,
      height: 420,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: 'single',
      locale: lang === 'ar' ? 'ar' : 'en',
      colorTheme: 'dark'
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.appendChild(widgetContainer);
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, tvSymbol, lang]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[420px] rounded-xl overflow-hidden bg-[#06080C]/60 border border-white/5 flex items-center justify-center relative"
    />
  );
};

export const MarketInsightsWidget: React.FC<MarketInsightsWidgetProps> = ({
  selectedSymbol = 'US100',
  onSymbolChange,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';

  // Active symbol tracked directly via props and synchronized
  const activeAsset = selectedSymbol || 'US100';

  // Live clock tick state for 1-second interval countdown
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second countdown clock interval
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const availableAssets: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'];

  // High-Impact Economic Calendar Events
  const economicEvents: EconomicEvent[] = [
    {
      id: 1,
      titleAr: 'قرار الفائدة الفيدرالي الأمريكي (FOMC)',
      titleEn: 'US FOMC Interest Rate Decision',
      currency: 'USD',
      impact: 'HIGH',
      impactLabelAr: 'قوي جداً',
      targetTime: new Date(Date.now() + (2 * 3600 + 14 * 60 + 35) * 1000),
      actual: '5.25%',
      forecast: '5.25%',
      previous: '5.50%'
    },
    {
      id: 2,
      titleAr: 'مؤشر أسعار المستهلكين والتضخم (CPI)',
      titleEn: 'US CPI Inflation Rate (MoM)',
      currency: 'USD',
      impact: 'HIGH',
      impactLabelAr: 'تأثير مرتفع',
      targetTime: new Date(Date.now() + (5 * 3600 + 45 * 60 + 10) * 1000),
      actual: '3.1%',
      forecast: '3.1%',
      previous: '3.3%'
    },
    {
      id: 3,
      titleAr: 'تقرير الوظائف غير الزراعية (NFP)',
      titleEn: 'US Non-Farm Payrolls (NFP)',
      currency: 'USD',
      impact: 'HIGH',
      impactLabelAr: 'تأثير حاسم',
      targetTime: new Date(Date.now() + (18 * 3600 + 30 * 60) * 1000),
      actual: '---',
      forecast: '185K',
      previous: '142K'
    }
  ];

  // Helper function to format countdown timer (HH:MM:SS)
  const formatCountdown = (targetTime: Date, nowMs: number) => {
    const diffMs = targetTime.getTime() - nowMs;
    if (diffMs <= 0) {
      return {
        text: isAr ? 'صدور الآن / جاري التجميع' : 'Released / Active',
        isPast: true
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return {
      text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      isPast: false
    };
  };

  const isSameDayEvent = (targetTime: Date, nowMs: number) => {
    const diffMs = targetTime.getTime() - nowMs;
    return diffMs > 0 && diffMs <= 24 * 3600 * 1000;
  };

  const handleSelectAsset = (sym: MarketSymbol) => {
    if (onSymbolChange) {
      onSymbolChange(sym);
    }
  };

  return (
    <div className="w-full space-y-3 p-2.5 sm:p-3 bg-[#0c0f17]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl text-[#d1d4dc] transition-all">
      {/* Container Header with Title & Linked Asset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#089981]/20 border border-[#089981]/40 text-[#089981] shrink-0">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <span>{isAr ? 'تحليلات ورؤى السوق اللحظية' : 'Live Market Insights'}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                <span>TRADINGVIEW ANALYTICS</span>
              </span>
            </h3>
            {/* Dynamic Subtitle reflecting activeAsset */}
            <p className="text-[10px] text-[#787b86] truncate">
              {isAr ? `التحليل الفني ومعلومات الرمز المباشرة لـ ${activeAsset}` : `Live Technical Analysis & Symbol Info for ${activeAsset}`}
            </p>
          </div>
        </div>

        {/* Linked Asset Selector (Badge Buttons connected to global chart state) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none shrink-0">
          {availableAssets.map((sym) => {
            const isActive = activeAsset === sym;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => handleSelectAsset(sym)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#089981] text-white shadow-md shadow-[#089981]/30 ring-1 ring-[#089981]/50 scale-105'
                    : 'text-[#787b86] hover:text-white hover:bg-white/10'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* REAL TRADINGVIEW SYMBOL INFO & TECHNICAL ANALYSIS WIDGETS (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-[#131722]/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col space-y-3 shadow-lg group hover:border-[#089981]/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">
                {isAr ? `مؤشرات وتحليل الرمز المباشر — ${activeAsset}` : `Live Symbol Info & Technical Analysis — ${activeAsset}`}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
              {TRADINGVIEW_TICKERS[activeAsset] || activeAsset}
            </span>
          </div>

          {/* 1. TRADINGVIEW SYMBOL INFO WIDGET */}
          <TradingViewSymbolInfoWidget symbol={activeAsset} lang={lang} />

          {/* 2. TRADINGVIEW TECHNICAL ANALYSIS WIDGET */}
          <TradingViewTechnicalAnalysisWidget symbol={activeAsset} lang={lang} />

          {/* 3. TRADINGVIEW COMMUNITY IDEAS RSS FEED */}
          <TradingIdeasFeed symbol={activeAsset} lang={lang} />
        </div>

        {/* LIVE ECONOMIC CALENDAR (1 Column) */}
        <div className="lg:col-span-1 bg-[#131722]/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col justify-between space-y-2 shadow-lg group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-white">{isAr ? 'الأجندة الاقتصادية' : 'Economic Calendar'}</span>
            </div>
            <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{isAr ? 'أحداث اليوم' : 'TODAY'}</span>
            </span>
          </div>

          <div className="space-y-2">
            {economicEvents.map((event) => {
              const countdown = formatCountdown(event.targetTime, currentTime);
              const isToday = isSameDayEvent(event.targetTime, currentTime);

              return (
                <div
                  key={event.id}
                  className={`p-2.5 rounded-xl border transition-all space-y-1.5 ${
                    isToday
                      ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono font-black bg-white/10 text-white shrink-0">
                        {event.currency}
                      </span>
                      <p className={`text-[11px] font-bold line-clamp-1 ${isToday ? 'text-red-400' : 'text-white'}`}>
                        {isAr ? event.titleAr : event.titleEn}
                      </p>
                    </div>

                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold shrink-0 ${
                      event.impact === 'HIGH'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isAr ? event.impactLabelAr : event.impact}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-[#787b86]">
                      <span>{isAr ? 'الفعلي:' : 'Act:'} <strong className={isToday ? 'text-red-400 font-black' : 'text-white'}>{event.actual}</strong></span>
                      <span>{isAr ? 'المتوقع:' : 'FC:'} <strong className="text-amber-400">{event.forecast}</strong></span>
                      <span>{isAr ? 'السابق:' : 'Prev:'} <strong>{event.previous}</strong></span>
                    </div>

                    <div className={`flex items-center gap-1 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                      isToday
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse shadow-sm'
                        : 'bg-white/5 text-amber-400'
                    }`}>
                      <Timer className={`w-3 h-3 ${isToday ? 'text-red-400 animate-spin-slow' : 'text-amber-400'}`} />
                      <span>{countdown.text}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
