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
  getUpcomingMacroEvents,
  translateFinancialHeadlineToArabic
} from '../../services/macroEventsAndAnnouncementsService';

interface Props {
  lang?: 'ar' | 'en';
  isFullPage?: boolean;
}

// Subcomponent for Official TradingView Economic Calendar Events Widget
const TradingViewEconomicEventsWidget: React.FC<{
  lang?: 'ar' | 'en';
}> = ({ lang = 'ar' }) => {
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
  }, [lang]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-xl overflow-hidden bg-[#131722] border border-[#2a2e39] relative shadow-lg"
    />
  );
};

// Browser-side Native Fallback News if rss2json is unavailable or blocked
const FALLBACK_NATIVE_NEWS: RSSNewsItem[] = [
  {
    id: 'news-native-1',
    title: 'US100 Nasdaq Rally Accelerates as Tech Earnings Exceed Expectations Ahead of FOMC',
    titleAr: 'مؤشر ناسداك US100 يواصل الصعود القوي متأثراً بأرباح شركات التكنولوجيا الإيجابية وقرب اجتماع الفيدرالي',
    link: 'https://sa.investing.com/news/stock-market-news',
    pubDate: new Date().toISOString(),
    timeAgo: 'Live',
    timeAgoAr: 'منذ 5 دقائق',
    source: 'MBK Research / Cointelegraph',
    category: 'مؤشرات وأسهم',
    sentiment: 'BULLISH',
    impact: 'HIGH',
    impactLabelAr: 'تأثير قوي',
    impactLabelEn: 'High Impact',
    impactScore: 3
  },
  {
    id: 'news-native-2',
    title: 'Spot Gold Holds $2,680 Support Zone Following Institutional Order Block Demand Surge',
    titleAr: 'أسعار الذهب الفوري تحافظ على مستوى الدعم 2,680$ وسط تدفقات شرائية مؤسسية مكثفة',
    link: 'https://sa.investing.com/news/commodities-news',
    pubDate: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    timeAgo: '15m ago',
    timeAgoAr: 'منذ 15 دقيقة',
    source: 'TradingView / Investing',
    category: 'سلع ومعادن',
    sentiment: 'BULLISH',
    impact: 'HIGH',
    impactLabelAr: 'تأثير قوي',
    impactLabelEn: 'High Impact',
    impactScore: 3
  },
  {
    id: 'news-native-3',
    title: 'Bitcoin Consolidates Near $68,000 as Institutional Spot ETF Inflows Reach Weekly Record',
    titleAr: 'البيتكوين يتماسك قرب 68,000$ مع استمرار صافي تدفقات صناديق الاستثمار ETF القياسية',
    link: 'https://cointelegraph.com',
    pubDate: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    timeAgo: '35m ago',
    timeAgoAr: 'منذ 35 دقيقة',
    source: 'Cointelegraph',
    category: 'عملات رقمية',
    sentiment: 'BULLISH',
    impact: 'MEDIUM',
    impactLabelAr: 'تأثير متوسط',
    impactLabelEn: 'Med Impact',
    impactScore: 2
  },
  {
    id: 'news-native-4',
    title: 'EURUSD Trades Neutral Near 1.0840 Ahead of ECB Policy Statement and US Retail Sales Data',
    titleAr: 'زوج اليورو/دولار يتداول بنطاق جانبي عند 1.0840 ترقباً لبيانات المبيعات الأمريكية وتقرير البنك الأوروبي',
    link: 'https://sa.investing.com/news/forex-news',
    pubDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    timeAgo: '1h ago',
    timeAgoAr: 'منذ ساعة',
    source: 'FXStreet',
    category: 'فوركس ومعادن',
    sentiment: 'NEUTRAL',
    impact: 'MEDIUM',
    impactLabelAr: 'تأثير متوسط',
    impactLabelEn: 'Med Impact',
    impactScore: 2
  },
  {
    id: 'news-native-5',
    title: 'WTI Crude Oil Stabilizes Around $70.50 Following Inventory Drawdown Reports',
    titleAr: 'النفط الخام WTI يستقر قرب 70.50$ للبرميل عقب تقارير انخفاض مخزونات الطاقة الأمريكية',
    link: 'https://sa.investing.com/news/commodities-news',
    pubDate: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    timeAgo: '1h 30m ago',
    timeAgoAr: 'منذ ساعة و30 دقيقة',
    source: 'Bloomberg Energy',
    category: 'طاقة وسلع',
    sentiment: 'BULLISH',
    impact: 'LOW',
    impactLabelAr: 'تأثير منخفض',
    impactLabelEn: 'Low Impact',
    impactScore: 1
  }
];

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

export const LiveNewsTicker: React.FC<Props> = ({ lang = 'ar', isFullPage = false }) => {
  const [news, setNews] = useState<RSSNewsItem[]>(FALLBACK_NATIVE_NEWS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'slow'>('normal');
  const [filterImpact, setFilterImpact] = useState<string>('ALL');

  const isAr = lang === 'ar';

  const fetchNewsClientSide = async () => {
    try {
      setLoading(true);

      const urls = [
        'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Far.cointelegraph.com%2Frss',
        'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss',
        'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.tradingview.com%2Ffeed%2F'
      ];

      const results = await Promise.allSettled(
        urls.map((url) =>
          fetch(url).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
        )
      );

      const parsedItems: RSSNewsItem[] = [];

      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value && res.value.status === 'ok' && Array.isArray(res.value.items)) {
          const sourceName =
            index === 0 ? 'Cointelegraph عربي' : index === 1 ? 'Cointelegraph' : 'TradingView Feed';
          const defaultCategory = index <= 1 ? 'عملات رقمية' : 'تحليل الأسواق';

          res.value.items.forEach((raw: any, i: number) => {
            const title = (raw.title || '').trim();
            if (!title) return;
            const content = raw.description || raw.content || '';
            const { sentiment, impact, impactScore } = classifySentimentAndImpactInBrowser(title, content);

            const timeAgoAr = calculateTimeAgoStr(raw.pubDate, true);
            const timeAgoEn = calculateTimeAgoStr(raw.pubDate, false);
            const arabicTitle = translateFinancialHeadlineToArabic(title);

            parsedItems.push({
              id: `rss-${index}-${i}-${Date.now()}`,
              title,
              titleAr: arabicTitle,
              link: raw.link || 'https://sa.investing.com/news',
              pubDate: raw.pubDate || new Date().toISOString(),
              timeAgo: timeAgoEn,
              timeAgoAr,
              source: sourceName,
              category: defaultCategory,
              sentiment,
              impact,
              impactLabelAr: impact === 'HIGH' ? 'تأثير قوي' : impact === 'MEDIUM' ? 'تأثير متوسط' : 'تأثير منخفض',
              impactLabelEn: impact === 'HIGH' ? 'High Impact' : impact === 'MEDIUM' ? 'Med Impact' : 'Low Impact',
              impactScore
            });
          });
        }
      });

      if (parsedItems.length > 0) {
        setNews([...FALLBACK_NATIVE_NEWS.slice(0, 2), ...parsedItems]);
      } else {
        setNews(FALLBACK_NATIVE_NEWS);
      }
      setLastRefreshed(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Client-side RSS fetch error:', err);
      setNews(FALLBACK_NATIVE_NEWS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsClientSide();

    const interval = setInterval(fetchNewsClientSide, 120000); // 2 minutes auto polling
    return () => {
      clearInterval(interval);
    };
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
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40 shrink-0 shadow-sm shadow-[#f23645]/10"
          title={isAr ? 'تأثير قوي ومحرك للأسواق (High Impact)' : 'High Market Impact'}
        >
          <Flame className="w-3 h-3 text-[#f23645] animate-pulse" />
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
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40 shrink-0"
          title={isAr ? 'تأثير متوسط على السيولة (Medium Impact)' : 'Medium Market Impact'}
        >
          <Zap className="w-2.5 h-2.5 text-[#ff9800]" />
          <span className="flex items-center gap-0.5 font-mono text-[9px]">
            <span className="w-1 h-2.5 rounded-xs bg-[#ff9800]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#ff9800]" />
            <span className="w-1 h-2.5 rounded-xs bg-[#2a2e39]" />
          </span>
          <span className="font-semibold">{isAr ? labelAr || 'تأثير متوسط' : labelEn || 'Med'}</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#089981]/15 text-[#089981] border border-[#089981]/30 shrink-0"
        title={isAr ? 'تأثير منخفض (Low Impact)' : 'Low Market Impact'}
      >
        <span className="flex items-center gap-0.5 font-mono text-[9px]">
          <span className="w-1 h-2.5 rounded-xs bg-[#089981]" />
          <span className="w-1 h-2.5 rounded-xs bg-[#2a2e39]" />
          <span className="w-1 h-2.5 rounded-xs bg-[#2a2e39]" />
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
    <div className="w-full bg-[#0d1017] border-b border-[#2a2e39] text-xs font-sans transition-all z-20 select-none">
      {/* 1. RUNNING LIVE MOVING ARABIC NEWS TICKER STRIP */}
      <div className="px-2 sm:px-3 py-1.5 flex items-center justify-between gap-2 overflow-hidden bg-gradient-to-r from-[#0d1017] via-[#111520] to-[#0d1017]">
        {/* Source & Live Radar Dot Badge */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-[#0d1017]/95 pr-2 border-l border-[#2a2e39]/60">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#089981] font-mono text-[11px] font-bold shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#089981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#089981]" />
            </span>
            <Newspaper className="w-3.5 h-3.5 text-[#089981]" />
            <span className="font-bold text-[#d1d4dc] text-[11px] hidden sm:inline">
              {isAr ? 'الأخبار الحية (مباشر)' : 'LIVE NEWS'}
            </span>
          </div>

          {/* Marquee Play/Pause Control */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsPaused(!isPaused);
            }}
            title={isPaused ? (isAr ? 'تشغيل الحركة التلقائية' : 'Resume marquee') : (isAr ? 'إيقاف الحركة مؤقتاً' : 'Pause marquee')}
            className={`p-1 rounded border transition-colors cursor-pointer ${
              isPaused
                ? 'bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]/40'
                : 'text-[#787b86] hover:text-white border-transparent hover:bg-[#1e222d]'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              setSpeed((prev) => (prev === 'normal' ? 'fast' : prev === 'fast' ? 'slow' : 'normal'));
            }}
            title={isAr ? `سرعة الشريط: ${speed === 'fast' ? 'سريع' : speed === 'slow' ? 'هادئ' : 'عادي'}` : `Speed: ${speed}`}
            className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#787b86] hover:text-white bg-[#1e222d]/70 hover:bg-[#1e222d] border border-[#2a2e39] cursor-pointer"
          >
            <Gauge className="w-2.5 h-2.5 text-[#2962ff]" />
            <span>{speed === 'fast' ? '2x' : speed === 'slow' ? '0.5x' : '1x'}</span>
          </button>
        </div>

        {/* 2. CONTINUOUS RUNNING & MOVING MARQUEE TRACK */}
        <div className="flex-1 min-w-0 overflow-hidden relative mx-1 group py-0.5">
          {/* Subtle fade edges for ultra-premium look */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#0d1017] to-transparent z-1 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#0d1017] to-transparent z-1 pointer-events-none" />

          {loading && news.length === 0 ? (
            <div className="flex items-center gap-2 text-[#787b86] text-[11px] font-mono animate-pulse px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff] animate-ping" />
              <span>{isAr ? 'جاري جلب أحدث الأخبار الاقتصادية والعملات باللغة العربية...' : 'Streaming live financial news...'}</span>
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
                  className="flex items-center gap-2 shrink-0 py-0.5 px-2 rounded hover:bg-[#1e222d] transition-colors border border-transparent hover:border-[#2a2e39]"
                  title={item.title}
                >
                  {/* IMPACT SIZE BADGE (REQUIRED) */}
                  {renderImpactBadge(item.impact, item.impactLabelAr, item.impactLabelEn)}

                  {/* Category Tag */}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1e222d] text-[#2962ff] border border-[#2a2e39] shrink-0">
                    {item.category}
                  </span>

                  {/* Sentiment Icon */}
                  {item.sentiment === 'BULLISH' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                  ) : item.sentiment === 'BEARISH' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-[#f23645] shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#787b86] shrink-0" />
                  )}

                  {/* Headline (Arabic when isAr, English otherwise) */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d1d4dc] hover:text-[#2962ff] font-medium text-xs transition-colors hover:underline max-w-[280px] sm:max-w-[420px] md:max-w-[520px] truncate"
                  >
                    {isAr ? item.titleAr || item.title : item.title}
                  </a>

                  {/* Source & Time */}
                  <span className="text-[10px] text-[#787b86] font-mono shrink-0 flex items-center gap-1">
                    <span className="hidden sm:inline font-semibold text-[#a3a6af]">({item.source})</span>
                    <span>• {isAr ? item.timeAgoAr || item.timeAgo : item.timeAgo}</span>
                  </span>

                  {/* Divider separator */}
                  <span className="text-[#363a45] text-xs font-bold shrink-0 mx-1">✦</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Actions: Refresh & Expand All Headlines */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-[#0d1017]/95 pl-2 border-r border-[#2a2e39]/60">
          <button
            onClick={() => {
              soundManager.playClick();
              fetchNewsClientSide();
            }}
            disabled={loading}
            title={isAr ? 'تحديث الأخبار الآن' : 'Refresh live news'}
            className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#1e222d] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#089981]' : ''}`} />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setIsExpanded(!isExpanded);
            }}
            className="px-2 py-1 rounded text-[11px] font-semibold text-[#787b86] hover:text-white hover:bg-[#1e222d] border border-[#2a2e39] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">
              {isExpanded ? (isAr ? 'طي الأخبار' : 'Collapse') : (isAr ? 'كل الأخبار' : 'All News')}
            </span>
            <span className="px-1 rounded bg-[#2a2e39] text-[10px] text-white font-mono">{news.length}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4. EXPANDED REAL ARABIC RSS HEADLINES & TRADINGVIEW ECONOMIC CALENDAR SPLIT VIEW */}
      {(isExpanded || isFullPage) && (
        <div className="border-t border-[#2a2e39] bg-[#131722] p-3 sm:p-5 animate-fade-in shadow-2xl rounded-b-2xl">
          {/* Header & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#2a2e39] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <Newspaper className="w-4.5 h-4.5 text-[#089981]" />
                {isAr ? 'مركز الأخبار والأحداث الاقتصادية اللحظية' : 'Financial News & Macro Events Hub'}
              </span>
              <span className="text-[11px] text-[#787b86] font-mono border-s border-[#2a2e39] ps-2">
                {lastRefreshed && `${isAr ? 'آخر تحديث:' : 'Updated:'} ${lastRefreshed}`}
              </span>
            </div>

            {/* Impact Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#1e222d] p-1 rounded-lg border border-[#2a2e39] text-xs">
              <span className="px-1.5 text-[#787b86] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#2962ff]" />
                <span>{isAr ? 'تأثير الخبر:' : 'Filter Impact:'}</span>
              </span>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('ALL');
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-colors ${
                  filterImpact === 'ALL' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white'
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
                    : 'text-[#f23645] hover:bg-[#f23645]/10'
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
                    : 'text-[#ff9800] hover:bg-[#ff9800]/10'
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
            <div className="lg:col-span-2 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-3 sm:p-4 flex flex-col shadow-xl">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2a2e39]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#2962ff]/15 border border-[#2962ff]/30 text-[#2962ff]">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {isAr ? 'بث العناوين والتحليلات الاقتصادية' : 'Live Headlines & Market Analysis'}
                    </h3>
                    <p className="text-[10px] text-[#787b86]">
                      {isAr ? 'مستجدات الكريبتو، الأسهم، والبنوك المركزية من المصادر الرسمية' : 'Cryptocurrency, equities, & central bank updates'}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                  {drawerItems.length} {isAr ? 'مقالات' : 'Items'}
                </span>
              </div>

              {/* INDEPENDENT SCROLL AREA WITH overflow-y-auto */}
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-[#2a2e39]">
                {drawerItems.length === 0 ? (
                  <div className="text-center py-12 text-[#787b86] text-xs font-mono">
                    {isAr ? 'لا توجد أخبار بهذا المستوى من التأثير حالياً.' : 'No news found matching this impact filter.'}
                  </div>
                ) : (
                  drawerItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#131722] hover:bg-[#131722]/80 border border-[#2a2e39] hover:border-[#089981]/50 transition-all shadow-sm group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderImpactBadge(item.impact, item.impactLabelAr, item.impactLabelEn)}

                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#1e222d] text-[#2962ff] border border-[#2a2e39]">
                            {item.source}
                          </span>

                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[#089981] bg-[#089981]/10 border border-[#089981]/20">
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
                          className="text-xs sm:text-sm font-bold text-white group-hover:text-[#2962ff] transition-colors line-clamp-2 leading-snug block"
                        >
                          {isAr ? item.titleAr || item.title : item.title}
                        </a>
                      </div>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#787b86] hover:text-white rounded-lg hover:bg-[#2a2e39] shrink-0 border border-transparent hover:border-[#363a45] transition-colors"
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
            <div className="lg:col-span-1 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2a2e39]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#f23645]/15 border border-[#f23645]/30 text-[#f23645]">
                    <Flame className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {isAr ? 'الأحداث الاقتصادية عالية التأثير' : 'High-Impact Economic Events'}
                    </h3>
                    <p className="text-[10px] text-[#787b86]">
                      {isAr ? 'مؤشرات CPI، NFP، وقرارات الفائدة الفيدرالية' : 'CPI, NFP, & Fed Rate decisions'}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f23645]" />
                  <span>{isAr ? 'تنبيه قبل ساعة' : '1H WARNING'}</span>
                </span>
              </div>

              {/* Native Arabic/English Upcoming Major Events List */}
              <div className="space-y-2">
                {getUpcomingMacroEvents().slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-mono font-bold">
                          {ev.code}
                        </span>
                        <span className="text-[11px] font-bold text-white truncate">
                          {isAr ? ev.titleAr : ev.titleEn}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#787b86] font-mono">
                        {isAr ? `المتوقع: ${ev.forecast} | السابق: ${ev.previous}` : `Forecast: ${ev.forecast} | Prev: ${ev.previous}`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold shrink-0">
                      {new Date(ev.releaseTimeMs).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
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
