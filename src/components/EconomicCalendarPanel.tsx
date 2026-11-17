import React, { useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  lang?: 'ar' | 'en';
}

export const EconomicCalendarPanel: React.FC<Props> = ({ lang = 'ar' }) => {
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
      importanceFilter: '-1,0,1',
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
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>التقويم الاقتصادي اللحظي (Live Economic Calendar)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TradingView Live Feed
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              مواعيد صدور بيانات التضخم CPI، الوظائف NFP، وقرارات الفائدة الفيدرالية مباشرة
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={containerRef}
          className="w-full h-[640px] rounded-xl overflow-hidden bg-[#131722] border border-[#2a2e39]"
        />
      </div>
    </div>
  );
};
