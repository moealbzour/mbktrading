import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Globe, ShieldAlert, Zap, Filter, RefreshCw } from 'lucide-react';
import { EconomicNewsItem } from '../../types/trading';

interface Props {
  lang?: 'ar' | 'en';
}

const HIGH_IMPACT_EVENTS: EconomicNewsItem[] = [
  {
    id: 'ev-1',
    timeAr: '15:30 (اليوم)',
    timeEn: '15:30 (Today)',
    country: 'USD',
    currency: 'USD',
    countryAr: 'الولايات المتحدة 🇺🇸',
    countryEn: 'United States 🇺🇸',
    titleAr: 'مؤشر أسعار المستهلكين الأمريكي (CPI YoY)',
    titleEn: 'US Consumer Price Index (CPI YoY)',
    impact: 'HIGH',
    forecast: '2.6%',
    previous: '2.4%',
    actual: '2.6%'
  },
  {
    id: 'ev-2',
    timeAr: '15:30 (اليوم)',
    timeEn: '15:30 (Today)',
    country: 'USD',
    currency: 'USD',
    countryAr: 'الولايات المتحدة 🇺🇸',
    countryEn: 'United States 🇺🇸',
    titleAr: 'معدل الشكاوى من البطالة الأسبوعية (Initial Jobless Claims)',
    titleEn: 'US Initial Jobless Claims',
    impact: 'HIGH',
    forecast: '215K',
    previous: '221K',
    actual: '217K'
  },
  {
    id: 'ev-3',
    timeAr: '21:00 (اليوم)',
    timeEn: '21:00 (Today)',
    country: 'USD',
    currency: 'USD',
    countryAr: 'الولايات المتحدة 🇺🇸',
    countryEn: 'United States 🇺🇸',
    titleAr: 'قرار الفائدة الصادر عن الفيدرالي الأمريكي (Fed Interest Rate Decision)',
    titleEn: 'Federal Reserve Interest Rate Decision',
    impact: 'HIGH',
    forecast: '4.75%',
    previous: '5.00%',
    actual: '4.75%'
  },
  {
    id: 'ev-4',
    timeAr: '16:15 (غداً)',
    timeEn: '16:15 (Tomorrow)',
    country: 'EUR',
    currency: 'EUR',
    countryAr: 'الاتحاد الأوروبي 🇪🇺',
    countryEn: 'Eurozone 🇪🇺',
    titleAr: 'قرار الفائدة الصادر عن البنك المركزي الأوروبي (ECB Rate Decision)',
    titleEn: 'ECB Interest Rate Decision',
    impact: 'HIGH',
    forecast: '3.25%',
    previous: '3.50%',
    actual: 'قيد الانتظار'
  },
  {
    id: 'ev-5',
    timeAr: '15:30 (الجمعة)',
    timeEn: '15:30 (Friday)',
    country: 'USD',
    currency: 'USD',
    countryAr: 'الولايات المتحدة 🇺🇸',
    countryEn: 'United States 🇺🇸',
    titleAr: 'تقرير الوظائف غير الزراعية الأمريكي (NFP - Non-Farm Payrolls)',
    titleEn: 'US Non-Farm Payrolls (NFP)',
    impact: 'HIGH',
    forecast: '180K',
    previous: '254K',
    actual: 'قيد الانتظار'
  }
];

export const TradingViewEconomicCalendar: React.FC<Props> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'widget' | 'table'>('widget');
  const [importanceFilter, setImportanceFilter] = useState<'high' | 'all'>('high');

  useEffect(() => {
    if (activeTab !== 'widget') return;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      colorTheme: 'dark',
      isTransparent: true,
      locale: isAr ? 'ar' : 'en',
      importanceFilter: importanceFilter === 'high' ? '0,1' : '-1,0,1',
      currencyFilter: 'USD,EUR,GBP,JPY,AUD,CAD'
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
  }, [activeTab, importanceFilter, isAr]);

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col bg-[#131722] text-[#d1d4dc] p-3 sm:p-6 space-y-4 overflow-hidden select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* HEADER BAR */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white">
                {isAr ? 'المفكرة الاقتصادية والبيانات الماكرو (Macro Economic Calendar)' : 'Economic Calendar & Macro Events'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                HIGH IMPACT
              </span>
            </div>
            <p className="text-xs text-[#787b86] mt-0.5">
              {isAr
                ? 'مواعيد ونتائج بيانات الفائدة، التضخم CPI، الوظائف NFP، والقرارات البنكية اللحظية'
                : 'Real-time global macroeconomic events, CPI inflation, NFP jobs, and central bank decisions'}
            </p>
          </div>
        </div>

        {/* CONTROLS: Widget vs Custom Table + Importance */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
            <button
              onClick={() => setActiveTab('widget')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'widget' ? 'bg-[#089981] text-white shadow-md' : 'text-[#787b86] hover:text-white'
              }`}
            >
              {isAr ? 'ودجت TradingView المباشر' : 'TradingView Live Widget'}
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'table' ? 'bg-[#089981] text-white shadow-md' : 'text-[#787b86] hover:text-white'
              }`}
            >
              {isAr ? 'جدول البيانات العالية الأهمية' : 'High Impact Events Table'}
            </button>
          </div>

          {activeTab === 'widget' && (
            <button
              onClick={() => setImportanceFilter((prev) => (prev === 'high' ? 'all' : 'high'))}
              className="px-3 py-1.5 rounded-xl bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-bold text-amber-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{importanceFilter === 'high' ? (isAr ? 'عالي التأثير فقط 🔥' : 'High Impact Only') : (isAr ? 'عرض جميع البيانات' : 'All Events')}</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="flex-1 min-h-[450px] w-full rounded-2xl overflow-hidden border border-[#2a2e39] bg-[#0c0f17]/90 relative shadow-2xl">
        {activeTab === 'widget' ? (
          <div ref={containerRef} className="w-full h-full min-h-[450px]" />
        ) : (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#2a2e39] text-[#787b86] font-bold">
                    <th className="pb-3 pe-3 text-start">{isAr ? 'الحدث الاقتصادي' : 'Economic Event'}</th>
                    <th className="pb-3 px-3">{isAr ? 'الدولة / العملة' : 'Currency'}</th>
                    <th className="pb-3 px-3">{isAr ? 'التوقيت' : 'Time'}</th>
                    <th className="pb-3 px-3">{isAr ? 'الأهمية' : 'Impact'}</th>
                    <th className="pb-3 px-3">{isAr ? 'المتوقع' : 'Forecast'}</th>
                    <th className="pb-3 px-3">{isAr ? 'السابق' : 'Previous'}</th>
                    <th className="pb-3 ps-3">{isAr ? 'الفعلي الحقيقي' : 'Actual'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2e39]/60 font-mono">
                  {HIGH_IMPACT_EVENTS.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#1e222d]/60 transition-colors">
                      <td className="py-3.5 pe-3 font-sans font-bold text-white text-start">
                        {isAr ? ev.titleAr : ev.titleEn}
                      </td>
                      <td className="py-3.5 px-3 text-cyan-400 font-bold font-sans">
                        {isAr ? ev.countryAr : ev.countryEn} ({ev.currency})
                      </td>
                      <td className="py-3.5 px-3 text-[#787b86] font-sans">
                        {isAr ? ev.timeAr : ev.timeEn}
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          عالي التأثير 🔥
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#d1d4dc]">{ev.forecast}</td>
                      <td className="py-3.5 px-3 text-[#787b86]">{ev.previous}</td>
                      <td className="py-3.5 ps-3 text-emerald-400 font-bold">{ev.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
