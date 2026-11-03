import React, { useState, useEffect, useRef } from 'react';
import { Gauge, Newspaper, Radio, Sparkles, TrendingUp, BarChart2 } from 'lucide-react';
import { MarketSymbol } from '../../types/trading';

interface Props {
  lang?: 'ar' | 'en';
}

const SYMBOL_MAP: Record<string, string> = {
  US100: 'NASDAQ:NDX',
  XAUUSD: 'OANDA:XAUUSD',
  EURUSD: 'FX:EURUSD',
  BTCUSD: 'BITSTAMP:BTCUSD'
};

export const TradingViewAnalysisWidgets: React.FC<Props> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [selectedPair, setSelectedPair] = useState<MarketSymbol>('US100');
  const [activeWidgetTab, setActiveWidgetTab] = useState<'gauge' | 'timeline'>('gauge');

  const gaugeContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // 1. Embed TradingView Technical Analysis Gauge Meter
  useEffect(() => {
    if (activeWidgetTab !== 'gauge') return;
    const container = gaugeContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '15m',
      width: '100%',
      isTransparent: true,
      height: '100%',
      symbol: SYMBOL_MAP[selectedPair] || 'NASDAQ:NDX',
      showIntervalTabs: true,
      displayMode: 'single',
      locale: isAr ? 'ar' : 'en',
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
      if (container) container.innerHTML = '';
    };
  }, [selectedPair, activeWidgetTab, isAr]);

  // 2. Embed TradingView Timeline / Top Stories Widget
  useEffect(() => {
    if (activeWidgetTab !== 'timeline') return;
    const container = timelineContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
      colorTheme: 'dark',
      locale: isAr ? 'ar' : 'en'
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.appendChild(widgetContainer);
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [activeWidgetTab, isAr]);

  return (
    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 shadow-2xl flex flex-col space-y-4">
      {/* Widget Header & Switchers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2a2e39] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#089981]/20 border border-[#089981]/40 text-[#089981]">
            <Gauge className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'مقياس التحليل الفني والأخبار المباشرة' : 'Live Technical Gauge & Timeline'}</span>
              <span className="px-2 py-0.2 rounded text-[9px] font-mono bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                TRADINGVIEW LIVE
              </span>
            </h3>
            <p className="text-[11px] text-[#787b86]">
              {isAr ? 'مؤشرات الشراء والبيع والأنباء العالمية المباشرة للأزواج الرئيسية' : 'Real-time Oscillators, Moving Averages gauge, and global story stream'}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Gauge Meter vs Timeline */}
        <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
          <button
            onClick={() => setActiveWidgetTab('gauge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeWidgetTab === 'gauge' ? 'bg-[#089981] text-white shadow-md' : 'text-[#787b86] hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'مؤشر الفنيات (Meter)' : 'Technical Gauge'}</span>
          </button>

          <button
            onClick={() => setActiveWidgetTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeWidgetTab === 'timeline' ? 'bg-[#089981] text-white shadow-md' : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>{isAr ? 'بث الأخبار والتوب ستوريز' : 'Top Stories Stream'}</span>
          </button>
        </div>
      </div>

      {/* Pair Switcher Bar for Technical Gauge */}
      {activeWidgetTab === 'gauge' && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#787b86] font-bold me-1">{isAr ? 'اختر الزوج:' : 'Select Pair:'}</span>
            {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((pair) => (
              <button
                key={pair}
                onClick={() => setSelectedPair(pair)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                  selectedPair === pair
                    ? 'bg-white text-[#131722] border-white font-extrabold shadow-sm'
                    : 'bg-[#131722] text-[#787b86] hover:text-white border-[#2a2e39]'
                }`}
              >
                ${pair}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-[#089981] font-bold hidden sm:inline">
            15-MIN REALTIME OSCILLATORS
          </span>
        </div>
      )}

      {/* Widget Container Area */}
      <div className="min-h-[380px] sm:min-h-[420px] w-full rounded-xl overflow-hidden bg-[#0c0f17]/90 border border-[#2a2e39] relative">
        {activeWidgetTab === 'gauge' ? (
          <div ref={gaugeContainerRef} className="w-full h-full min-h-[380px] sm:min-h-[420px]" />
        ) : (
          <div ref={timelineContainerRef} className="w-full h-full min-h-[380px] sm:min-h-[420px]" />
        )}
      </div>
    </div>
  );
};
