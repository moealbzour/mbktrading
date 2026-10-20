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

interface Props {
  lang?: 'ar' | 'en';
}

export const LiveNewsTicker: React.FC<Props> = ({ lang = 'ar' }) => {
  const [news, setNews] = useState<RSSNewsItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'slow'>('normal');
  const [filterImpact, setFilterImpact] = useState<string>('ALL');

  const isAr = lang === 'ar';

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news/rss');
      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news) && data.news.length > 0) {
          setNews(data.news);
          setLastRefreshed(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('Arabic News RSS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 45000); // 45s auto refresh
    return () => clearInterval(interval);
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

                  {/* Arabic Headline (Clickable Link) */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d1d4dc] hover:text-[#2962ff] font-medium text-xs transition-colors hover:underline max-w-[280px] sm:max-w-[420px] md:max-w-[520px] truncate"
                  >
                    {item.titleAr || item.title}
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
              fetchNews();
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

      {/* 4. EXPANDED REAL ARABIC RSS HEADLINES DRAWER WITH IMPACT FILTERING */}
      {isExpanded && (
        <div className="border-t border-[#2a2e39] bg-[#131722] p-3 sm:p-4 max-h-80 overflow-y-auto animate-fade-in shadow-2xl">
          {/* Header & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#2a2e39] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#d1d4dc] flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-[#089981]" />
                {isAr ? 'بث الأخبار الاقتصادية والعملات بالعربية' : 'Live Arabic Financial News Wire'}
              </span>
              <span className="text-[11px] text-[#787b86] font-mono">
                {lastRefreshed && `${isAr ? 'آخر فحص:' : 'Updated:'} ${lastRefreshed}`}
              </span>
            </div>

            {/* Impact Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#1e222d] p-0.5 rounded border border-[#2a2e39] text-[11px]">
              <span className="px-1.5 text-[#787b86] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#2962ff]" />
                <span>{isAr ? 'التأثير:' : 'Impact:'}</span>
              </span>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('ALL');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  filterImpact === 'ALL' ? 'bg-[#2962ff] text-white font-bold' : 'text-[#787b86] hover:text-white'
                }`}
              >
                {isAr ? 'الكل' : 'All'}
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('HIGH');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                  filterImpact === 'HIGH'
                    ? 'bg-[#f23645] text-white font-bold'
                    : 'text-[#f23645] hover:bg-[#f23645]/10'
                }`}
              >
                <Flame className="w-2.5 h-2.5" />
                <span>{isAr ? 'قوي جداً' : 'High'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('MEDIUM');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                  filterImpact === 'MEDIUM'
                    ? 'bg-[#ff9800] text-black font-bold'
                    : 'text-[#ff9800] hover:bg-[#ff9800]/10'
                }`}
              >
                <Zap className="w-2.5 h-2.5" />
                <span>{isAr ? 'متوسط' : 'Med'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setFilterImpact('LOW');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                  filterImpact === 'LOW'
                    ? 'bg-[#089981] text-white font-bold'
                    : 'text-[#089981] hover:bg-[#089981]/10'
                }`}
              >
                <span>{isAr ? 'منخفض' : 'Low'}</span>
              </button>
            </div>
          </div>

          {/* List of Arabic News with Impact Indicators */}
          <div className="space-y-2">
            {drawerItems.length === 0 ? (
              <div className="text-center py-6 text-[#787b86] text-xs font-mono">
                {isAr ? 'لا توجد أخبار بهذا المستوى من التأثير حالياً.' : 'No news found matching this impact filter.'}
              </div>
            ) : (
              drawerItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#1e222d]/60 hover:bg-[#1e222d] border border-[#2a2e39]/60 hover:border-[#363a45] transition-all"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Impact size badge */}
                      {renderImpactBadge(item.impact, item.impactLabelAr, item.impactLabelEn)}

                      {/* Source */}
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#131722] text-[#2962ff] border border-[#2a2e39]">
                        {item.source}
                      </span>

                      {/* Category */}
                      <span className="text-[11px] text-[#787b86] font-mono">
                        {item.category}
                      </span>

                      {/* Time */}
                      <span className="text-[11px] text-[#787b86] font-mono">
                        • {isAr ? item.timeAgoAr || item.timeAgo : item.timeAgo}
                      </span>
                    </div>

                    {/* Headline */}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-medium text-white hover:text-[#2962ff] transition-colors line-clamp-2 block"
                    >
                      {item.titleAr || item.title}
                    </a>
                  </div>

                  {/* Read article button */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-[#787b86] hover:text-white rounded hover:bg-[#2a2e39] shrink-0 border border-transparent hover:border-[#363a45] transition-colors"
                    title={isAr ? 'قراءة الخبر من المصدر المعتمد' : 'Read original article'}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
