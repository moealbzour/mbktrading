import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  Globe,
  Radio,
  Sparkles,
  Flame,
  ChevronRight,
  ExternalLink,
  Layers,
  Filter
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface HighImpactEvent {
  id: string;
  name: string;
  currency: 'USD' | 'EUR' | 'GBP';
  impact: 'HIGH';
  targetDate: Date;
  forecast: string;
  previous: string;
  descriptionAr: string;
}

// Fixed or calculated upcoming high impact economic events
const UPCOMING_EVENTS: HighImpactEvent[] = [
  {
    id: 'cpi-usd',
    name: 'مؤشر أسعار المستهلكين الأمريكي (US CPI)',
    currency: 'USD',
    impact: 'HIGH',
    targetDate: new Date(Date.now() + 18 * 60 * 60 * 1000 + 30 * 60 * 1000), // ~18.5 hours
    forecast: '3.1%',
    previous: '3.2%',
    descriptionAr: 'المحرك الأساسي لقرارات الفيدرالي وسيولة الذهب ومؤشر ناسداك'
  },
  {
    id: 'fomc-rate',
    name: 'قرار الفائدة الفيدرالية والمؤتمر الصحفي (FOMC)',
    currency: 'USD',
    impact: 'HIGH',
    targetDate: new Date(Date.now() + 42 * 60 * 60 * 1000), // ~42 hours
    forecast: '5.25%',
    previous: '5.25%',
    descriptionAr: 'تثبيت متوقع مع ترقب تصريحات جيروم باول حول مسار التضخم'
  },
  {
    id: 'nfp-usd',
    name: 'تقرير الوظائف غير الزراعية (US NFP)',
    currency: 'USD',
    impact: 'HIGH',
    targetDate: new Date(Date.now() + 66 * 60 * 60 * 1000 + 15 * 60 * 1000), // ~66 hours
    forecast: '185K',
    previous: '216K',
    descriptionAr: 'بيانات التوظيف وساعات العمل ومتوسط الأجور في الساعة'
  },
  {
    id: 'ecb-rate',
    name: 'قرار الفائدة للبنك المركزي الأوروبي (ECB)',
    currency: 'EUR',
    impact: 'HIGH',
    targetDate: new Date(Date.now() + 88 * 60 * 60 * 1000), // ~88 hours
    forecast: '3.75%',
    previous: '4.00%',
    descriptionAr: 'تحديد السياسة النقدية لمنطقة اليورو وزوج EUR/USD'
  },
  {
    id: 'boe-rate',
    name: 'قرار الفائدة لبنك إنجلترا (BOE Rate Decision)',
    currency: 'GBP',
    impact: 'HIGH',
    targetDate: new Date(Date.now() + 112 * 60 * 60 * 1000),
    forecast: '5.00%',
    previous: '5.25%',
    descriptionAr: 'تصويت لجنة السياسة النقدية البريطانية وبيانات تضخم الخدمات'
  }
];

export const NewsCalendar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'news'>('calendar');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'USD' | 'EUR' | 'GBP'>('ALL');
  const [now, setNow] = useState<number>(Date.now());

  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const newsContainerRef = useRef<HTMLDivElement>(null);

  // Update countdown clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Embed TradingView Economic Calendar Widget
  useEffect(() => {
    if (activeTab !== 'calendar') return;
    const container = calendarContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;

    // Filter for USD, EUR, and GBP high-impact
    const config = {
      colorTheme: 'dark',
      isTransparent: false,
      width: '100%',
      height: '100%',
      locale: 'ar',
      importanceFilter: '0,1',
      countryFilter: 'us,eu,gb'
    };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [activeTab]);

  // Embed TradingView Market News & Timeline Widget
  useEffect(() => {
    if (activeTab !== 'news') return;
    const container = newsContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;

    const config = {
      feedMode: 'all_symbols',
      isTransparent: false,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
      colorTheme: 'dark',
      locale: 'ar'
    };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [activeTab]);

  // Format countdown string
  const formatCountdown = (targetMs: number) => {
    const diff = targetMs - now;
    if (diff <= 0) return 'جاري الصدور الآن ⚡';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredEvents = UPCOMING_EVENTS.filter(
    (ev) => selectedCurrency === 'ALL' || ev.currency === selectedCurrency
  );

  return (
    <div className="bg-[#06080C] border border-[#1E2638] rounded-2xl overflow-hidden shadow-2xl flex flex-col font-['Cairo',sans-serif]">
      {/* 1. Header with Gold Accents */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#06080C] via-[#0d1422] to-[#06080C] border-b border-[#1E2638] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/20">
            <Calendar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
              <span>الأجندة الاقتصادية وتدفق الأخبار المباشر</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                USD • EUR • GBP
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              بث حي لأهم البيانات المؤثرة على ناسداك والذهب مع عدّ تنازلي لحظي
            </p>
          </div>
        </div>

        {/* Tab switcher: Calendar vs News Feed */}
        <div className="flex items-center bg-[#0d131f] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('calendar');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>التقويم الاقتصادي الحي</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('news');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-cyan-600 text-white font-black shadow-md shadow-cyan-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>أخبار الأسواق اللحظية</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time High-Impact Countdown Timers Bar */}
      <div className="p-3 bg-[#080d16] border-b border-[#1E2638]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-black text-rose-300 font-mono flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>العد التنازلي للبيانات الكبرى (High-Impact Macro Events)</span>
            </span>
          </div>

          {/* Currency Filter Chips */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {(['ALL', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedCurrency(curr);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  selectedCurrency === curr
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal scroll cards with live countdown timers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredEvents.slice(0, 3).map((event) => {
            const timeRemainingStr = formatCountdown(event.targetDate.getTime());
            const isNear = event.targetDate.getTime() - now < 24 * 60 * 60 * 1000;

            return (
              <div
                key={event.id}
                className="p-3 rounded-xl bg-[#0b101c] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold mr-1 ${
                        event.currency === 'USD'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : event.currency === 'EUR'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {event.currency}
                    </span>
                    <span className="text-xs font-black text-slate-100">{event.name}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                    عالي التأثير 🔥
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mb-2 line-clamp-1">
                  {event.descriptionAr}
                </p>

                {/* Live Countdown Clock */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06080C] border border-slate-800 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>متبقي:</span>
                  </div>
                  <span
                    className={`font-black text-sm tabular-nums tracking-wider ${
                      isNear ? 'text-amber-400 animate-pulse' : 'text-cyan-300'
                    }`}
                  >
                    {timeRemainingStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Official TradingView Live Widget Area */}
      <div className="relative w-full h-[540px] bg-[#06080C] overflow-hidden">
        {activeTab === 'calendar' ? (
          <div
            ref={calendarContainerRef}
            className="tradingview-widget-container w-full h-full [&_iframe]:bg-[#06080C]"
          />
        ) : (
          <div
            ref={newsContainerRef}
            className="tradingview-widget-container w-full h-full [&_iframe]:bg-[#06080C]"
          />
        )}
      </div>
    </div>
  );
};

export default NewsCalendar;
