import React, { useState, useEffect, useRef } from 'react';
import {
  Newspaper,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Gauge,
  Flame,
  AlertTriangle,
  Zap,
  Filter,
  Volume2
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { RSSNewsItem, NewsImpact } from '../../types/trading';
import {
  MacroEconomicEvent,
  subscribeToUpcomingMacroEvents,
  translateFinancialHeadlineToArabic
} from '../../services/macroEventsAndAnnouncementsService';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  lang?: 'ar' | 'en';
  isFullPage?: boolean;
  onHide?: () => void;
}

// Subcomponent for Official TradingView Economic Calendar Events Widget
const TradingViewEconomicEventsWidget: React.FC<{
  lang?: 'ar' | 'en';
}> = ({ lang = 'ar' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

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
      colorTheme: isLight ? 'light' : 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: lang === 'ar' ? 'ar_AE' : 'en',
      importanceFilter: '0', // 0 = High Importance Events only (CPI, NFP, Fed Rates, etc.)
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
  }, [lang, isLight]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] relative shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg"
    />
  );
};

function calculateTimeAgoStr(pubDateStr: string, isAr: boolean) {
  try {
    const pub = new Date(pubDateStr).getTime();
    const now = Date.now();
    const diffMin = Math.max(1, Math.floor((now - pub) / (1000 * 60)));
    if (diffMin < 60) {
      return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    return isAr ? 'مباشر' : 'Live';
  } catch {
    return isAr ? 'مباشر' : 'Live';
  }
}

function classifySentimentAndImpactInBrowser(title: string, content: string = '') {
  const text = (title + ' ' + content).toLowerCase();

  const bullishKeywords = [
    'surge', 'jump', 'rally', 'bull', 'gain', 'skyrocket', 'all-time high', 'ath', 'breakout', 'record',
    'growth', 'soar', 'positive', 'bounce', 'rise', 'ارتفاع', 'قفزة', 'صعود', 'إيجابي', 'اختراق'
  ];
  const bearishKeywords = [
    'drop', 'plunge', 'crash', 'bear', 'fall', 'dump', 'decline', 'sink', 'down', 'loss',
    'fears', 'crack', 'slump', 'negative', 'انخفاض', 'هبوط', 'تراجع', 'سلبي', 'انهيار'
  ];

  let bullishCount = 0;
  let bearishCount = 0;

  bullishKeywords.forEach((k) => { if (text.includes(k)) bullishCount++; });
  bearishKeywords.forEach((k) => { if (text.includes(k)) bearishCount++; });

  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (bullishCount > bearishCount) sentiment = 'BULLISH';
  else if (bearishCount > bullishCount) sentiment = 'BEARISH';

  const highImpactKeywords = [
    'fed', 'fomc', 'cpi', 'nfp', 'rate', 'inflation', 'powell', 'sec', 'etf', 'war', 'tariff',
    'gdp', 'payroll', 'ecb', 'central bank', 'فائدة', 'تضخم', 'الفيدرالي', 'وظائف', 'مركزي'
  ];

  let impact: NewsImpact = 'MEDIUM';
  if (highImpactKeywords.some((k) => text.includes(k))) {
    impact = 'HIGH';
  } else if (sentiment === 'NEUTRAL' && text.length < 50) {
    impact = 'LOW';
  }

  const impactScore: 1 | 2 | 3 = impact === 'HIGH' ? 3 : impact === 'MEDIUM' ? 2 : 1;

  return { sentiment, impact, impactScore };
}

export const LiveNewsTicker: React.FC<Props> = ({ lang = 'ar', isFullPage = false, onHide }) => {
  const [news, setNews] = useState<RSSNewsItem[]>([]);
  const [upcomingMacroEvents, setUpcomingMacroEvents] = useState<MacroEconomicEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'slow'>('slow');
  const [filterImpact, setFilterImpact] = useState<string>('ALL');

  const isAr = lang === 'ar';

  const fetchLiveMarketNews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/market/news?lang=${encodeURIComponent(lang)}&type=news`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawItems = Array.isArray(data?.items) ? data.items : [];

      const parsedItems: RSSNewsItem[] = rawItems.map((raw: any, i: number) => {
        const title = String(raw.title || '').trim();
        const publishedAt = raw.publishedAt || new Date().toISOString();
        const { sentiment, impact, impactScore } = classifySentimentAndImpactInBrowser(title, '');
        const timeAgoAr = calculateTimeAgoStr(publishedAt, true);
        const timeAgoEn = calculateTimeAgoStr(publishedAt, false);
        const arabicTitle = /[\u0600-\u06FF]/.test(title)
          ? title
          : translateFinancialHeadlineToArabic(title);

        return {
          id: raw.id || `api-news-${i}-${raw.timestampMs || Date.now()}`,
          title,
          titleAr: arabicTitle,
          link: raw.link || 'https://sa.investing.com/news',
          pubDate: publishedAt,
          timeAgo: timeAgoEn,
          timeAgoAr,
          source: raw.source || 'Market Wire',
          category: raw.category || (isAr ? 'أخبار الأسواق' : 'Market News'),
          sentiment,
          impact,
          impactLabelAr:
            impact === 'HIGH' ? 'تأثير قوي' : impact === 'MEDIUM' ? 'تأثير متوسط' : 'تأثير منخفض',
          impactLabelEn:
            impact === 'HIGH' ? 'High Impact' : impact === 'MEDIUM' ? 'Med Impact' : 'Low Impact',
          impactScore
        };
      });

      setNews(parsedItems);
      setLastRefreshed(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[/api/market/news] fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMarketNews();

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchLiveMarketNews();
      }
    }, 5 * 60 * 1000); // 5 minutes auto polling only when tab is visible

    return () => {
      clearInterval(interval);
    };
  }, [lang]);

  useEffect(() => {
    const unsub = subscribeToUpcomingMacroEvents((events) => {
      setUpcomingMacroEvents(events);
    });
    return () => unsub();
  }, []);

  // Filtered items for expanded drawer
  const drawerItems = news.filter((item) => {
    if (filterImpact === 'ALL') return true;
    return item.impact === filterImpact;
  });

  // Render the impact visual pill
  const renderImpactBadge = (impact: NewsImpact, labelAr: string, labelEn: string) => {
    if (impact === 'HIGH') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDECEE] dark:bg-[#f23645]/20 text-[#D93848] dark:text-[#f23645] border border-[#F5C2C7] dark:border-[#f23645]/40 shrink-0 shadow-sm shadow-none dark:shadow-[#f23645]/10"
          title={isAr ? 'تأثير قوي ومحرك للأسواق (High Impact)' : 'High Market Impact'}
        >
          <Flame className="w-3 h-3 text-[#D93848] dark:text-[#f23645] animate-pulse" />
          <span className="flex items-center gap-0.5 font-mono text-[9px]">
            <span className="w-1 h-2.5 rounded-xs bg-[#f23645]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#f23645]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#f23645]" />
          </span>
          <span className="font-semibold">{isAr ? labelAr || 'تأثير قوي' : labelEn || 'High'}</span>
        </span>
      );
    }

    if (impact === 'MEDIUM') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDF6E3] dark:bg-[#ff9800]/20 text-[#9A6700] dark:text-[#ff9800] border border-[#EFE0B4] dark:border-[#ff9800]/40 shrink-0"
          title={isAr ? 'تأثير متوسط على السيولة (Medium Impact)' : 'Medium Market Impact'}
        >
          <Zap className="w-2.5 h-2.5 text-[#9A6700] dark:text-[#ff9800]" />
          <span className="flex items-center gap-0.5 font-mono text-[9px]">
            <span className="w-1 h-2.5 rounded-xs bg-[#ff9800]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#ff9800]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#EDF1F7] dark:bg-[#2a2e39]" />
          </span>
          <span className="font-semibold">{isAr ? labelAr || 'تأثير متوسط' : labelEn || 'Med'}</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/30 shrink-0"
        title={isAr ? 'تأثير منخفض (Low Impact)' : 'Low Market Impact'}
      >
        <span className="flex items-center gap-0.5 font-mono text-[9px]">
          <span className="w-1 h-2.5 rounded-xs bg-[#089981]" />
          <span className="w-1 h-2.5 rounded-xs bg-[#EDF1F7] dark:bg-[#2a2e39]" />
          <span className="w-1 h-2.5 rounded-xs bg-[#EDF1F7] dark:bg-[#2a2e39]" />
        </span>
        <span className="font-semibold">{isAr ? labelAr || 'تأثير منخفض' : labelEn || 'Low'}</span>
      </span>
    );
  };

  // Speed class mapping
  const speedClass =
    speed === 'fast' ? 'ticker-speed-fast' : speed === 'slow' ? 'ticker-speed-slow' : 'ticker-speed-normal';

  // Duplicate news array for infinite seamless looping
  const displayMarqueeItems = news.length > 0 ? [...news, ...news] : [];

  return (
    <div className="w-full bg-[#F0F3FA] dark:bg-[#0d1017] border-b border-[#E0E3EB] dark:border-[#2a2e39] text-xs font-sans transition-all z-20 select-none">
      {/* 1. RUNNING LIVE MOVING ARABIC NEWS TICKER STRIP */}
      <div className="px-2 sm:px-3 py-1.5 flex items-center justify-between gap-2 overflow-hidden bg-[#FFFFFF] dark:bg-gradient-to-r dark:from-[#0d1017] dark:via-[#111520] dark:to-[#0d1017]">
        {/* Start Side: Only MBK NEWS Button with Small Live Red Circle & LIVE Label */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-[#FFFFFF]/95 dark:bg-[#0d1017]/95 pr-2 border-l border-[#E0E3EB] dark:border-[#2a2e39]/60">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsExpanded(!isExpanded);
            }}
            title={isAr ? 'عرض كل أخبار MBK' : 'Toggle MBK News Hub'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F8F9FD] dark:bg-[#1e222d] hover:bg-[#EDF1F7] dark:hover:bg-[#262b38] border border-[#E0E3EB] dark:border-[#2a2e39] font-mono text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f23645] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f23645]" />
            </span>
            <span className="text-[10px] font-extrabold text-[#D93848] dark:text-[#f23645] tracking-wider uppercase">
              LIVE
            </span>
            <span className="font-extrabold text-[#131722] dark:text-white text-[11px] tracking-tight whitespace-nowrap">
              MBK NEWS
            </span>
          </button>
        </div>

        {/* 2. CONTINUOUS RUNNING & MOVING MARQUEE TRACK */}
        <div className="flex-1 min-w-0 overflow-hidden relative mx-1 group py-0.5">
          {/* Subtle fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#FFFFFF] dark:from-[#0d1017] to-transparent z-1 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#FFFFFF] dark:from-[#0d1017] to-transparent z-1 pointer-events-none" />

          {news.length === 0 ? (
            <div className="flex items-center gap-2 text-[#787b86] text-[11px] font-mono px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f23645] animate-ping" />
              <span>{isAr ? 'جاري تحديث الأخبار الحية...' : 'Refreshing live market wire...'}</span>
            </div>
          ) : (
            <div
              className={`${
                isAr ? 'animate-ticker-moving-rtl' : 'animate-ticker-moving'
              } ${speedClass} ${isPaused ? 'ticker-paused' : ''} flex items-center gap-6 cursor-pointer`}
            >
              {displayMarqueeItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center gap-2 shrink-0 py-0.5 px-2 rounded hover:bg-[#EDF1F7] dark:hover:bg-[#1e222d] transition-colors border border-transparent hover:border-[#CBD2DF] dark:hover:border-[#2a2e39]"
                  title={item.title}
                >
                  {/* IMPACT SIZE BADGE (REQUIRED) */}
                  {renderImpactBadge(item.impact, item.impactLabelAr, item.impactLabelEn)}

                  {/* Category Tag */}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F8F9FD] dark:bg-[#1e222d] text-[#1E53E5] dark:text-[#2962ff] border border-[#E0E3EB] dark:border-[#2a2e39] shrink-0">
                    {item.category}
                  </span>

                  {/* Sentiment Icon */}
                  {item.sentiment === 'BULLISH' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                  ) : item.sentiment === 'BEARISH' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-[#D93848] dark:text-[#f23645] shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#787b86] shrink-0" />
                  )}

                  {/* Headline (Arabic when isAr, English otherwise) */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#131722] dark:text-[#d1d4dc] hover:text-[#2962ff] font-medium text-xs transition-colors hover:underline max-w-[280px] sm:max-w-[420px] md:max-w-[520px] truncate"
                  >
                    {isAr ? item.titleAr || item.title : item.title}
                  </a>

                  {/* Source & Time */}
                  <span className="text-[10px] text-[#787b86] font-mono shrink-0 flex items-center gap-1">
                    <span className="hidden sm:inline font-semibold text-[#4A5162] dark:text-[#a3a6af]">({item.source})</span>
                    <span>• {isAr ? item.timeAgoAr || item.timeAgo : item.timeAgo}</span>
                  </span>

                  {/* Divider separator */}
                  <span className="text-[#363a45] text-xs font-bold shrink-0 mx-1">✦</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Actions: Only Refresh & Hide Buttons */}
        <div className="flex items-center gap-1 shrink-0 z-10 bg-[#FFFFFF]/95 dark:bg-[#0d1017]/95 pl-1.5 border-r border-[#E0E3EB] dark:border-[#2a2e39]/60">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              fetchLiveMarketNews();
            }}
            disabled={loading}
            title={isAr ? 'تحديث الأخبار الآن' : 'Refresh live news'}
            className="p-1 rounded bg-[#FFFFFF] dark:bg-[#10141c] hover:bg-[#EDF1F7] dark:hover:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#1e2633] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#089981]' : ''}`} />
          </button>

          {onHide && (
            <button
              type="button"
              onClick={onHide}
              title={isAr ? 'إخفاء شريط الأخبار' : 'Hide news banner'}
              className="p-1 rounded bg-[#FFFFFF] dark:bg-[#10141c] hover:bg-[#EDF1F7] dark:hover:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#1e2633] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. EXPANDED REAL ARABIC RSS HEADLINES & TRADINGVIEW ECONOMIC CALENDAR SPLIT VIEW */}
      {(isExpanded || isFullPage) && (
        <div className="border-t border-[#E0E3EB] dark:border-[#2a2e39] bg-[#FFFFFF] dark:bg-[#131722] p-3 sm:p-5 animate-fade-in shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl rounded-b-2xl">
          {/* Header & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E0E3EB] dark:border-[#2a2e39] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#131722] dark:text-white text-sm flex items-center gap-1.5">
                <Newspaper className="w-4.5 h-4.5 text-[#089981]" />
                {isAr ? 'مركز الأخبار والأحداث الاقتصادية اللحظية' : 'Financial News & Macro Events Hub'}
              </span>
              <span className="text-[11px] text-[#787b86] font-mono border-s border-[#E0E3EB] dark:border-[#2a2e39] ps-2">
                {lastRefreshed && `${isAr ? 'آخر تحديث:' : 'Updated:'} ${lastRefreshed}`}
              </span>
            </div>

            {/* Impact Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#F8F9FD] dark:bg-[#1e222d] p-1 rounded-lg border border-[#E0E3EB] dark:border-[#2a2e39] text-xs">
              <span className="px-1.5 text-[#787b86] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#1E53E5] dark:text-[#2962ff]" />
                <span>{isAr ? 'تأثير الخبر:' : 'Filter Impact:'}</span>
              </span>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('ALL');
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-colors ${
                  filterImpact === 'ALL' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-[#131722] dark:hover:text-white'
                }`}
              >
                {isAr ? 'الكل' : 'All'}
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('HIGH');
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-colors flex items-center gap-1 ${
                  filterImpact === 'HIGH'
                    ? 'bg-[#f23645] text-white'
                    : 'text-[#D93848] dark:text-[#f23645] hover:bg-[#f23645]/10'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>{isAr ? 'عالي التأثير' : 'High'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('MEDIUM');
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-colors flex items-center gap-1 ${
                  filterImpact === 'MEDIUM'
                    ? 'bg-[#ff9800] text-black'
                    : 'text-[#9A6700] dark:text-[#ff9800] hover:bg-[#ff9800]/10'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{isAr ? 'متوسط' : 'Med'}</span>
              </button>
            </div>
          </div>

          {/* MAIN SPLIT CONTAINER: NEWS FEED (LEFT 2 COLUMNS) | TRADINGVIEW ECONOMIC EVENTS CALENDAR (RIGHT 1 COLUMN) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* COLUMN 1: INDEPENDENTLY SCROLLABLE LIVE NEWS FEED */}
            <div className="lg:col-span-2 bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl p-3 sm:p-4 flex flex-col shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#EDF1F7] dark:bg-[#2962ff]/15 border border-[#CBD2DF] dark:border-[#2962ff]/30 text-[#1E53E5] dark:text-[#2962ff]">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#131722] dark:text-white">
                      {isAr ? 'بث العناوين والتحليلات الاقتصادية' : 'Live Headlines & Market Analysis'}
                    </h3>
                    <p className="text-[10px] text-[#787b86]">
                      {isAr ? 'مستجدات الكريبتو، الأسهم، والبنوك المركزية من المصادر الرسمية' : 'Cryptocurrency, equities, & central bank updates'}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/30">
                  {drawerItems.length} {isAr ? 'مقالات' : 'Items'}
                </span>
              </div>

              {/* INDEPENDENT SCROLL AREA WITH overflow-y-auto */}
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-[#2a2e39]">
                {drawerItems.length === 0 ? (
                  <div className="text-center py-12 text-[#787b86] text-xs font-mono">
                    {isAr ? 'جاري تحديث الأخبار الحية...' : 'Refreshing live market wire...'}
                  </div>
                ) : (
                  drawerItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#131722]/80 border border-[#E0E3EB] dark:border-[#2a2e39] hover:border-[#089981]/50 transition-all shadow-sm group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderImpactBadge(item.impact, item.impactLabelAr, item.impactLabelEn)}

                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#F8F9FD] dark:bg-[#1e222d] text-[#1E53E5] dark:text-[#2962ff] border border-[#E0E3EB] dark:border-[#2a2e39]">
                            {item.source}
                          </span>

                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[#089981] bg-[#E6F5F2] dark:bg-[#089981]/10 border border-[#B3E2D9] dark:border-[#089981]/20">
                            {item.category}
                          </span>

                          <span className="text-[10px] text-[#787b86] font-mono">
                            • {isAr ? item.timeAgoAr || item.timeAgo : item.timeAgo}
                          </span>
                        </div>

                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm font-bold text-[#131722] dark:text-white group-hover:text-[#2962ff] transition-colors line-clamp-2 leading-snug block"
                        >
                          {isAr ? item.titleAr || item.title : item.title}
                        </a>
                      </div>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#787b86] hover:text-[#131722] dark:hover:text-white rounded-lg hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] shrink-0 border border-transparent hover:border-[#CBD2DF] dark:hover:border-[#363a45] transition-colors"
                        title={isAr ? 'قراءة الخبر من المصدر' : 'Read original article'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: UPCOMING MAJOR EVENTS IN ARABIC/ENGLISH + TRADINGVIEW CALENDAR WIDGET */}
            <div className="lg:col-span-1 bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FDECEE] dark:bg-[#f23645]/15 border border-[#F5C2C7] dark:border-[#f23645]/30 text-[#D93848] dark:text-[#f23645]">
                    <Flame className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#131722] dark:text-white">
                      {isAr ? 'الأحداث الاقتصادية عالية التأثير' : 'High-Impact Economic Events'}
                    </h3>
                    <p className="text-[10px] text-[#787b86]">
                      {isAr ? 'مؤشرات CPI، NFP، وقرارات الفائدة الفيدرالية' : 'CPI, NFP, & Fed Rate decisions'}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FDECEE] dark:bg-[#f23645]/20 text-[#D93848] dark:text-[#f23645] border border-[#F5C2C7] dark:border-[#f23645]/30 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f23645]" />
                  <span>{isAr ? 'تنبيه قبل ساعة' : '1H WARNING'}</span>
                </span>
              </div>

              {/* Native Arabic/English Upcoming Major Events List */}
              <div className="space-y-2">
                {upcomingMacroEvents.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] text-center text-[11px] text-[#787b86]">
                    {isAr
                      ? 'لا توجد بيانات اقتصادية عالية التأثير قادمة حالياً'
                      : 'No high-impact macro releases scheduled right now'}
                  </div>
                ) : (
                  upcomingMacroEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-400 text-[9px] font-mono font-bold">
                            {ev.currency}
                          </span>
                          <span className="text-[11px] font-bold text-[#131722] dark:text-white truncate">
                            {isAr ? ev.titleAr : ev.titleEn}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#787b86] font-mono">
                          {isAr ? `المتوقع: ${ev.forecast} | السابق: ${ev.previous}` : `Forecast: ${ev.forecast} | Prev: ${ev.previous}`}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#FDF6E3] dark:bg-amber-500/15 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/30 text-[10px] font-mono font-bold shrink-0">
                        {new Date(ev.releaseTimeMs).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* TRADINGVIEW EMBEDDED EVENTS WIDGET */}
              <div className="flex-1 min-h-[420px] w-full">
                <TradingViewEconomicEventsWidget lang={lang} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
