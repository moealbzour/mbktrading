import React, { useState, useEffect, useRef } from 'react';
import { MarketSymbol, MarketTicker } from '../../types/trading';
import { TradingIdeasFeed } from '../insights/TradingIdeasFeed';
import {
  Compass,
  Sparkles,
  Calendar,
  BarChart3,
  Flame
} from 'lucide-react';
import { getUpcomingMacroEvents } from '../../services/macroEventsAndAnnouncementsService';
import { useTheme } from '../../context/ThemeContext';

interface MarketInsightsWidgetProps {
  selectedSymbol: MarketSymbol;
  onSymbolChange?: (sym: MarketSymbol) => void;
  lang?: 'ar' | 'en';
  activeTicker?: MarketTicker;
}

// Broker-prefixed symbols for TradingView widgets
const TRADINGVIEW_TICKERS: Record<MarketSymbol, string> = {
  US100: 'CAPITALCOM:US100',
  XAUUSD: 'OANDA:XAUUSD',
  EURUSD: 'FX:EURUSD',
  BTCUSD: 'BINANCE:BTCUSDT',
  WTI: 'TVC:USOIL',
  GBPUSD: 'FX:GBPUSD'
};

const getTVSymbol = (sym: MarketSymbol | string): string => {
  if (!sym) return 'CAPITALCOM:US100';
  const clean = String(sym).toUpperCase().trim();
  if (clean === 'US100' || clean.includes('US100') || clean.includes('NAS100') || clean.includes('NDX')) {
    return 'CAPITALCOM:US100';
  }
  if (clean === 'XAUUSD' || clean.includes('XAU') || clean.includes('GOLD')) {
    return 'OANDA:XAUUSD';
  }
  if (clean === 'EURUSD' || clean.includes('EURUSD')) {
    return 'FX:EURUSD';
  }
  if (clean === 'BTCUSD' || clean.includes('BTC')) {
    return 'BINANCE:BTCUSDT';
  }
  if (clean === 'WTI' || clean.includes('OIL')) {
    return 'TVC:USOIL';
  }
  if (clean === 'GBPUSD' || clean.includes('GBP')) {
    return 'FX:GBPUSD';
  }
  return TRADINGVIEW_TICKERS[clean as MarketSymbol] || clean || 'CAPITALCOM:US100';
};

// Shared hook to lazy-load heavy TradingView embeds only when scrolled within 200px of viewport
const useLazyWidgetVisible = (ref: React.RefObject<HTMLDivElement | null>): boolean => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [ref, isVisible]);

  return isVisible;
};

// Subcomponent for TradingView Symbol Info Widget with Dynamic Lazy Injection
const TradingViewSymbolInfoWidget: React.FC<{
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}> = ({ symbol, lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyWidgetVisible(containerRef);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible) return;
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
      colorTheme: isLight ? 'light' : 'dark',
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
  }, [symbol, tvSymbol, lang, isVisible, isLight]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden bg-[#F8F9FD] dark:bg-[#06080C]/40 border border-[#E0E3EB] dark:border-white/5 relative min-h-[90px]"
    />
  );
};

// Subcomponent for TradingView Technical Analysis Widget with Dynamic Lazy Injection
const TradingViewTechnicalAnalysisWidget: React.FC<{
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}> = ({ symbol, lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyWidgetVisible(containerRef);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible) return;
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
      colorTheme: isLight ? 'light' : 'dark'
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
  }, [symbol, tvSymbol, lang, isVisible, isLight]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[420px] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-center relative shadow-md"
    />
  );
};

// Subcomponent for TradingView Timeline / Top Stories Widget with Dynamic Lazy Injection
const TradingViewTimelineWidget: React.FC<{
  symbol: MarketSymbol;
  lang?: 'ar' | 'en';
}> = ({ symbol, lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyWidgetVisible(containerRef);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      symbol: tvSymbol,
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: 420,
      colorTheme: isLight ? 'light' : 'dark',
      locale: lang === 'ar' ? 'ar' : 'en'
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
  }, [symbol, tvSymbol, lang, isVisible, isLight]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[420px] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-center relative shadow-md"
    />
  );
};

// Live TradingView Economic Events Widget with Dynamic Lazy Injection
const TradingViewLiveEventsPanel: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyWidgetVisible(containerRef);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: isLight ? 'light' : 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: lang === 'ar' ? 'ar_AE' : 'en',
      importanceFilter: '0,1',
      currencyFilter: 'USD,EUR,GBP,JPY,CAD,AUD,CHF'
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
  }, [lang, isVisible, isLight]);

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 min-h-[540px] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39]"
    />
  );
};

export const MarketInsightsWidget: React.FC<MarketInsightsWidgetProps> = ({
  selectedSymbol = 'XAUUSD',
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const activeAsset = selectedSymbol || 'XAUUSD';

  return (
    <div className="w-full space-y-3 p-2.5 sm:p-3 bg-[#FFFFFF] dark:bg-[#0c0f17]/80 dark:backdrop-blur-md rounded-2xl border border-[#E0E3EB] dark:border-white/10 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl text-[#131722] dark:text-[#d1d4dc] transition-all">
      {/* Container Header with Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0E3EB] dark:border-white/10 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/40 text-[#089981] shrink-0">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-white flex items-center gap-1.5 truncate">
              <span>{isAr ? 'تحليلات السوق' : 'Market Insights'}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-400 border border-[#EFE0B4] dark:border-amber-500/30 flex items-center gap-1 shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                <span>MBK</span>
              </span>
            </h3>
            <p className="text-[10px] text-[#787b86] truncate">
              {activeAsset}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40">
          {activeAsset}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* REAL TRADINGVIEW SYMBOL INFO, TECHNICAL ANALYSIS GAUGES & TOP STORIES TIMELINE WIDGETS (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] dark:bg-[#131722] p-3 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39] flex flex-col space-y-3 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl group hover:border-[#089981]/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#E6F5F2] dark:bg-[#089981]/20 border border-[#B3E2D9] dark:border-[#089981]/30 text-[#089981]">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[#131722] dark:text-white">
                {isAr ? `مؤشرات التحليل الفني والقصص الرئيسية — ${activeAsset}` : `Technical Analysis & Top Stories — ${activeAsset}`}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/30">
              {TRADINGVIEW_TICKERS[activeAsset] || activeAsset}
            </span>
          </div>

          {/* 1. TRADINGVIEW SYMBOL INFO WIDGET */}
          <TradingViewSymbolInfoWidget symbol={activeAsset} lang={lang} />

          {/* 2. SIDE-BY-SIDE FLEX/GRID: TECHNICAL ANALYSIS GAUGES + TOP STORIES TIMELINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-[#9A6700] dark:text-amber-400 font-mono flex items-center gap-1">
                  <span>🎯</span>
                  <span>{isAr ? 'مؤشرات الشراء والبيع' : 'Buy/Sell Gauges'}</span>
                </span>
                <span className="text-[9px] text-[#787b86] font-mono">15m • 1h • 4h • 1D</span>
              </div>
              <TradingViewTechnicalAnalysisWidget symbol={activeAsset} lang={lang} />
            </div>

            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-[#1E53E5] dark:text-blue-400 font-mono flex items-center gap-1">
                  <span>📰</span>
                  <span>{isAr ? 'أخبار MBK' : 'MBK News'}</span>
                </span>
                <span className="text-[9px] text-[#787b86] font-mono">LIVE</span>
              </div>
              <TradingViewTimelineWidget symbol={activeAsset} lang={lang} />
            </div>
          </div>

          {/* 3. TRADINGVIEW COMMUNITY IDEAS RSS FEED */}
          <TradingIdeasFeed symbol={activeAsset} lang={lang} />
        </div>

        {/* LIVE ECONOMIC CALENDAR (1 Column - Arabic/English Upcoming Events + Official TradingView Widget) */}
        <div className="lg:col-span-1 bg-[#FFFFFF]/95 dark:bg-[#131722]/80 dark:backdrop-blur-md p-3 rounded-xl border border-[#E0E3EB] dark:border-white/10 flex flex-col space-y-2.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-[#E0E3EB] dark:border-white/5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#D93848] dark:text-red-500" />
              <span className="text-xs font-bold text-[#131722] dark:text-white">
                {isAr ? 'التقويم الاقتصادي' : 'Economic Calendar'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#089981] dark:text-emerald-400 bg-[#E6F5F2] dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-[#B3E2D9] dark:border-emerald-500/30">
              {isAr ? 'تنبيه قبل ساعة' : 'LIVE FEED'}
            </span>
          </div>

          <div className="space-y-1.5">
            {getUpcomingMacroEvents().slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                className="p-2 rounded-lg bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-between gap-2 text-start"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-[#D93848] dark:text-rose-400 shrink-0" />
                    <span className="px-1.5 py-0.2 rounded bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-400 text-[9px] font-mono font-bold">
                      {ev.code}
                    </span>
                    <span className="text-[11px] font-bold text-[#131722] dark:text-white truncate">
                      {isAr ? ev.titleAr : ev.titleEn}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-[#787b86] font-mono block mt-0.5">
                    {isAr
                      ? `المتوقع: ${ev.forecast} • السابق: ${ev.previous}`
                      : `Forecast: ${ev.forecast} • Prev: ${ev.previous}`}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30 text-[9.5px] font-mono font-bold shrink-0">
                  {new Date(ev.releaseTimeMs).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>

          <TradingViewLiveEventsPanel lang={lang} />
        </div>
      </div>
    </div>
  );
};
