import React, { useState, useEffect, useRef } from 'react';
import { MarketSymbol, MarketTicker } from '../../types/trading';
import { TradingIdeasFeed } from '../insights/TradingIdeasFeed';
import {
  Compass,
  Sparkles,
  Calendar,
  BarChart3
} from 'lucide-react';

interface MarketInsightsWidgetProps {
  selectedSymbol: MarketSymbol;
  onSymbolChange?: (sym: MarketSymbol) => void;
  lang?: 'ar' | 'en';
  activeTicker?: MarketTicker;
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
      className="w-full min-h-[420px] rounded-xl overflow-hidden bg-[#131722] border border-[#2a2e39] flex items-center justify-center relative shadow-md"
    />
  );
};

// Subcomponent for TradingView Timeline / Top Stories Widget
const TradingViewTimelineWidget: React.FC<{
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
      colorTheme: 'dark',
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
  }, [symbol, tvSymbol, lang]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[420px] rounded-xl overflow-hidden bg-[#131722] border border-[#2a2e39] flex items-center justify-center relative shadow-md"
    />
  );
};

// Live TradingView Economic Events Widget
const TradingViewLiveEventsPanel: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: lang === 'ar' ? 'ar' : 'en',
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
  }, [lang]);

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 min-h-[540px] rounded-xl overflow-hidden bg-[#131722] border border-[#2a2e39]"
    />
  );
};

export const MarketInsightsWidget: React.FC<MarketInsightsWidgetProps> = ({
  selectedSymbol = 'US100',
  onSymbolChange,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const activeAsset = selectedSymbol || 'US100';
  const availableAssets: MarketSymbol[] = ['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'];

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
        {/* REAL TRADINGVIEW SYMBOL INFO, TECHNICAL ANALYSIS GAUGES & TOP STORIES TIMELINE WIDGETS (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-[#131722] p-3 rounded-xl border border-[#2a2e39] flex flex-col space-y-3 shadow-xl group hover:border-[#089981]/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-[#2a2e39]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#089981]/20 border border-[#089981]/30 text-[#089981]">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">
                {isAr ? `مؤشرات التحليل الفني والقصص الرئيسية — ${activeAsset}` : `Technical Analysis & Top Stories — ${activeAsset}`}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
              {TRADINGVIEW_TICKERS[activeAsset] || activeAsset}
            </span>
          </div>

          {/* 1. TRADINGVIEW SYMBOL INFO WIDGET */}
          <TradingViewSymbolInfoWidget symbol={activeAsset} lang={lang} />

          {/* 2. SIDE-BY-SIDE FLEX/GRID: TECHNICAL ANALYSIS GAUGES + TOP STORIES TIMELINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-amber-400 font-mono flex items-center gap-1">
                  <span>🎯</span>
                  <span>{isAr ? 'مؤشرات الشراء والبيع (Buy/Sell Gauges)' : 'Buy/Sell Gauge Indicators'}</span>
                </span>
                <span className="text-[9px] text-[#787b86] font-mono">15m • 1h • 4h • 1D</span>
              </div>
              <TradingViewTechnicalAnalysisWidget symbol={activeAsset} lang={lang} />
            </div>

            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-blue-400 font-mono flex items-center gap-1">
                  <span>📰</span>
                  <span>{isAr ? 'القصص الرئيسية والأخبار (Top Stories Timeline)' : 'Top Stories & Timeline'}</span>
                </span>
                <span className="text-[9px] text-[#787b86] font-mono">LIVE FEED</span>
              </div>
              <TradingViewTimelineWidget symbol={activeAsset} lang={lang} />
            </div>
          </div>

          {/* 3. TRADINGVIEW COMMUNITY IDEAS RSS FEED */}
          <TradingIdeasFeed symbol={activeAsset} lang={lang} />
        </div>

        {/* LIVE ECONOMIC CALENDAR (1 Column - Official TradingView Widget) */}
        <div className="lg:col-span-1 bg-[#131722]/80 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col space-y-2 shadow-lg group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-white">{isAr ? 'الأجندة الاقتصادية' : 'Economic Calendar'}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
              LIVE FEED
            </span>
          </div>

          <TradingViewLiveEventsPanel lang={lang} />
        </div>
      </div>
    </div>
  );
};
