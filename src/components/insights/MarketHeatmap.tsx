import React, { useState, useEffect, useRef } from 'react';
import { Flame, Globe, Coins, TrendingUp } from 'lucide-react';

interface MarketHeatmapProps {
  lang?: 'ar' | 'en';
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [activeType, setActiveType] = useState<'forex' | 'crypto' | 'stock'>('forex');
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
    script.type = 'text/javascript';
    script.async = true;

    if (activeType === 'forex') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js';
      script.innerHTML = JSON.stringify({
        width: '100%',
        height: '100%',
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'],
        isTransparent: true,
        colorTheme: 'dark',
        locale: isAr ? 'ar' : 'en'
      });
    } else if (activeType === 'crypto') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
      script.innerHTML = JSON.stringify({
        dataSource: 'Crypto',
        blockSize: 'market_cap_calc',
        blockColor: 'change',
        locale: isAr ? 'ar' : 'en',
        symbolUrl: '',
        colorTheme: 'dark',
        hasTopBar: false,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isTransparent: true,
        width: '100%',
        height: '100%'
      });
    } else {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
      script.innerHTML = JSON.stringify({
        exchanges: [],
        dataSource: 'S&P500',
        grouping: 'sector',
        blockSize: 'market_cap_basic',
        blockColor: 'change',
        locale: isAr ? 'ar' : 'en',
        symbolUrl: '',
        colorTheme: 'dark',
        hasTopBar: false,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isTransparent: true,
        width: '100%',
        height: '100%'
      });
    }

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
  }, [activeType, isAr]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0c0f17]/90 backdrop-blur-md rounded-xl border border-white/10 p-2 sm:p-3 space-y-2 overflow-hidden shadow-2xl">
      {/* Header bar with heatmap controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1 gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>{isAr ? 'الخريطة الحرارية لأسواق المال' : 'Market Heatmap & Cross Rates'}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                LIVE
              </span>
            </h3>
            <p className="text-[10px] text-[#787b86]">
              {isAr ? 'تحليل لحظي للتغيرات النسبية وأسعار العملات المتقاطعة' : 'Real-time relative change analysis across global assets'}
            </p>
          </div>
        </div>

        {/* Heatmap Type Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveType('forex')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              activeType === 'forex'
                ? 'bg-[#089981] text-white shadow-md shadow-[#089981]/30'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? 'أسعار الفوركس' : 'Forex Crosses'}</span>
          </button>

          <button
            onClick={() => setActiveType('crypto')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              activeType === 'crypto'
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{isAr ? 'العملات المشفرة' : 'Crypto Heatmap'}</span>
          </button>

          <button
            onClick={() => setActiveType('stock')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              activeType === 'stock'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isAr ? 'أسهم وول ستريت' : 'Wall St S&P500'}</span>
          </button>
        </div>
      </div>

      {/* Widget Container */}
      <div className="flex-1 min-h-[320px] w-full relative rounded-xl overflow-hidden bg-[#06080C]/80 border border-white/5">
        <div ref={containerRef} className="w-full h-full min-h-[320px]" />
      </div>
    </div>
  );
};
