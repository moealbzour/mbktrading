import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Filter,
  Globe,
  Info,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import {
  MacroEconomicEvent,
  fetchCalendarEvents,
  getUpcomingHighImpactEvents,
  subscribeToCalendarEvents
} from '../services/macroEventsAndAnnouncementsService';

interface Props {
  lang?: 'ar' | 'en';
}

type TimeFilter = 'upcoming' | 'next7d' | 'recent';
type ImpactFilter = 'all' | 'high';
type CurrencyFilter = 'ALL' | 'USD' | 'EUR' | 'GBP' | 'CAD';

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  CAD: '🇨🇦',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  CNY: '🇨🇳'
};

function parseNumericValue(val: string): number | null {
  if (!val || val === '—' || val === '-') return null;
  const cleaned = val.replace(/[^0-9.+-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function getActualColorClass(actual: string, forecast: string, previous: string): string {
  const actNum = parseNumericValue(actual);
  if (actNum === null) return 'text-[#787B86]';
  const refNum = parseNumericValue(forecast) ?? parseNumericValue(previous);
  if (refNum === null) return 'text-[#131722] dark:text-[#D1D4DC] font-bold';
  if (actNum > refNum) return 'text-[#089981] font-bold';
  if (actNum < refNum) return 'text-[#D93848] dark:text-[#F23645] font-bold';
  return 'text-[#131722] dark:text-[#D1D4DC] font-bold';
}

function ImpactBars({ impact }: { impact: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const activeCount = impact === 'HIGH' ? 3 : impact === 'MEDIUM' ? 2 : 1;
  const activeColor =
    impact === 'HIGH'
      ? 'bg-[#F23645]'
      : impact === 'MEDIUM'
      ? 'bg-[#F59E0B]'
      : 'bg-[#787B86]';

  return (
    <div
      className="inline-flex items-end gap-[2px] h-3.5 px-1.5 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10"
      title={impact}
    >
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={`w-[3px] rounded-[1px] ${
            bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2' : 'h-2.5'
          } ${bar <= activeCount ? activeColor : 'bg-[#EDF1F7] dark:bg-white/10'}`}
        />
      ))}
    </div>
  );
}

export const EconomicCalendarPanel: React.FC<Props> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [allEvents, setAllEvents] = useState<MacroEconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsub = subscribeToCalendarEvents((events) => {
      if (!mounted) return;
      setAllEvents(events);
      if (events.length > 0) {
        setIsLoading(false);
      }
    });

    fetchCalendarEvents(false)
      .then((events) => {
        if (!mounted) return;
        setAllEvents(events);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await fetchCalendarEvents(true);
      setAllEvents(fresh);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Top radar: upcoming High-impact events
  const upcomingHighEvents = useMemo(() => {
    const fromState = allEvents
      .filter((ev) => ev.impact === 'HIGH' && ev.releaseTimeMs > nowMs)
      .sort((a, b) => a.releaseTimeMs - b.releaseTimeMs);
    if (fromState.length > 0) return fromState.slice(0, 6);
    return getUpcomingHighImpactEvents(nowMs).slice(0, 6);
  }, [allEvents, nowMs]);

  // Filtered calendar table events
  const filteredEvents = useMemo(() => {
    const sevenDaysAheadMs = nowMs + 7 * 24 * 60 * 60 * 1000;
    const recentGraceMs = nowMs - 15 * 60 * 1000;

    return allEvents.filter((ev) => {
      if (impactFilter === 'high' && ev.impact !== 'HIGH') {
        return false;
      }
      if (currencyFilter !== 'ALL' && ev.currency.toUpperCase() !== currencyFilter) {
        return false;
      }

      if (timeFilter === 'upcoming') {
        return ev.releaseTimeMs >= recentGraceMs;
      }
      if (timeFilter === 'next7d') {
        return ev.releaseTimeMs >= recentGraceMs && ev.releaseTimeMs <= sevenDaysAheadMs;
      }
      if (timeFilter === 'recent') {
        return ev.releaseTimeMs < nowMs || Boolean(ev.actual);
      }
      return true;
    });
  }, [allEvents, timeFilter, impactFilter, currencyFilter, nowMs]);

  // Group filtered events by local calendar day (YYYY-MM-DD)
  const groupedDays = useMemo(() => {
    const groupsMap = new Map<string, { dateKey: string; dayTimestampMs: number; events: MacroEconomicEvent[] }>();

    const sorted = [...filteredEvents].sort((a, b) =>
      timeFilter === 'recent'
        ? b.releaseTimeMs - a.releaseTimeMs
        : a.releaseTimeMs - b.releaseTimeMs
    );

    for (const ev of sorted) {
      const d = new Date(ev.releaseTimeMs);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      let group = groupsMap.get(dateKey);
      if (!group) {
        group = {
          dateKey,
          dayTimestampMs: ev.releaseTimeMs,
          events: []
        };
        groupsMap.set(dateKey, group);
      }
      group.events.push(ev);
    }

    return Array.from(groupsMap.values());
  }, [filteredEvents, timeFilter]);

  const formatRemainingCountdown = (releaseTimeMs: number): string => {
    const diffMs = releaseTimeMs - nowMs;
    if (diffMs <= 0) {
      return isAr ? 'صدر' : 'Released';
    }
    const totalMinutes = Math.ceil(diffMs / (60 * 1000));
    if (totalMinutes <= 60) {
      return isAr ? `بعد ${totalMinutes} د ⚡` : `In ${totalMinutes}m ⚡`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours < 24) {
      return isAr ? `بعد ${hours}س ${mins}د` : `In ${hours}h ${mins}m`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return isAr ? `بعد ${days}ي ${remHours}س` : `In ${days}d ${remHours}h`;
  };

  const formatDayHeader = (timestampMs: number): string => {
    try {
      return new Date(timestampMs).toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return new Date(timestampMs).toDateString();
    }
  };

  return (
    <div className="space-y-4 bg-[#F0F3FA] dark:bg-[#06080c] text-[#131722] dark:text-[#D1D4DC]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. HIGH-IMPACT UPCOMING RADAR WITH 1-HOUR POPUP ALERT SYSTEM */}
      <div className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#FDECEE] dark:bg-[#F23645]/15 border border-[#F5C2C7] dark:border-[#F23645]/40 flex items-center justify-center text-[#D93848] dark:text-[#F23645] shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-2 flex-wrap">
                <span>
                  {isAr
                    ? 'رادار الأخبار الاقتصادية عالية التأثير'
                    : 'High-Impact Macro Radar'}
                </span>
                <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-[#FDECEE] dark:bg-[#F23645]/15 text-[#D93848] dark:text-[#F23645] border border-[#F5C2C7] dark:border-[#F23645]/30">
                  {isAr ? 'تنبيه قبل ساعة' : '1H POPUP ALERT'}
                </span>
              </h2>
              <p className="text-[11px] text-[#787B86]">
                {isAr
                  ? 'أهم البيانات القادمة المؤثرة مباشرة على الذهب (XAUUSD) والناسداك (US100) ومؤشر الدولار'
                  : 'Upcoming high-impact releases driving Gold (XAUUSD), Nasdaq (US100), and USD volatility'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-2.5 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] hover:bg-[#EDF1F7] dark:hover:bg-[#0f141e] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-semibold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
        </div>

        {upcomingHighEvents.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#787B86] font-mono">
            {isLoading
              ? isAr
                ? 'جاري تحميل التقويم الاقتصادي المباشر...'
                : 'Loading live economic calendar...'
              : isAr
              ? 'لا توجد بيانات عالية التأثير مجدولة في الساعات القادمة'
              : 'No high-impact macro releases scheduled in the immediate window'}
          </div>
        ) : (
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {upcomingHighEvents.map((ev) => {
              const diffMs = ev.releaseTimeMs - nowMs;
              const isWithinHour = diffMs > 0 && diffMs <= 60 * 60 * 1000;
              const timeFormatted = new Date(ev.releaseTimeMs).toLocaleTimeString(
                isAr ? 'ar-AE' : 'en-US',
                { hour: '2-digit', minute: '2-digit' }
              );
              const dateShort = new Date(ev.releaseTimeMs).toLocaleDateString(
                isAr ? 'ar-AE' : 'en-US',
                { weekday: 'short', month: 'short', day: 'numeric' }
              );

              return (
                <div
                  key={ev.id}
                  onClick={() => toggleExpand(ev.id)}
                  className={`p-3 rounded-[4px] border transition-colors flex flex-col justify-between gap-2 cursor-pointer ${
                    isWithinHour
                      ? 'bg-[#FDECEE] dark:bg-[#F23645]/10 border-[#F23645]'
                      : 'bg-[#F0F3FA] dark:bg-[#06080c] border-[#E0E3EB] dark:border-white/10 hover:border-[#10b981]/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-[3px] bg-[#FDECEE] dark:bg-[#F23645]/15 border border-[#F5C2C7] dark:border-[#F23645]/30 text-[#D93848] dark:text-[#F23645] text-[10px] font-mono font-bold">
                          {ev.code}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#D1D4DC] text-[10px] font-mono font-bold">
                          {CURRENCY_FLAGS[ev.currency] || ''} {ev.currency}
                        </span>
                        <ImpactBars impact={ev.impact} />
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono tabular-nums font-bold flex items-center gap-1 ${
                          isWithinHour
                            ? 'bg-[#F23645] text-white animate-pulse'
                            : 'bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#131722] dark:text-[#D1D4DC] border border-[#E0E3EB] dark:border-white/10'
                        }`}
                      >
                        <Clock className="w-3 h-3 text-[#089981] dark:text-[#10b981]" />
                        <span>{formatRemainingCountdown(ev.releaseTimeMs)}</span>
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC] leading-snug">
                      {isAr ? ev.titleAr : ev.titleEn}
                    </h3>

                    <p className="text-[11px] text-[#787B86] leading-relaxed line-clamp-2">
                      {isAr ? ev.goldNasdaqImpactAr : ev.goldNasdaqImpactEn}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E0E3EB] dark:border-white/10">
                    <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums text-[10px] text-center">
                      <div className="p-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10">
                        <span className="text-[#787B86] block text-[9px]">
                          {dateShort}
                        </span>
                        <span className="text-[#131722] dark:text-[#D1D4DC] font-bold">{timeFormatted}</span>
                      </div>
                      <div className="p-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10">
                        <span className="text-[#787B86] block text-[9px]">
                          {isAr ? 'المتوقع' : 'Forecast'}
                        </span>
                        <span className="text-[#131722] dark:text-[#D1D4DC] font-bold">{ev.forecast || '—'}</span>
                      </div>
                      <div className="p-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10">
                        <span className="text-[#787B86] block text-[9px]">
                          {isAr ? 'السابق' : 'Previous'}
                        </span>
                        <span className="text-[#787B86] font-bold">{ev.previous || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#787B86]">
                        {isAr ? 'الأصول المتأثرة:' : 'Affected:'}
                      </span>
                      <div className="flex items-center gap-1 font-mono">
                        {ev.affectedAssets.map((asset) => (
                          <span
                            key={asset}
                            className="px-1.5 py-0.5 rounded-[3px] bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/30 font-bold text-[9px]"
                          >
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. NATIVE BILINGUAL MBK INSTITUTIONAL ECONOMIC CALENDAR (14-DAY WINDOW + EXPANDABLE IMPACT GUIDE) */}
      <div className="bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 rounded-md overflow-hidden">
        {/* Header & Filter Bar */}
        <div className="p-3 sm:p-4 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#E6F5F2] dark:bg-[#10b981]/15 border border-[#B3E2D9] dark:border-[#10b981]/40 flex items-center justify-center text-[#089981] dark:text-[#10b981] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[#131722] dark:text-[#D1D4DC] flex items-center gap-2">
                  <span>
                    {isAr
                      ? 'التقويم الاقتصادي المؤسسي (شرح التأثير على الذهب والناسداك)'
                      : 'Institutional Economic Calendar (XAUUSD & US100 Impact Guide)'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/15 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/30 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>{isAr ? 'مباشر' : 'LIVE'}</span>
                  </span>
                </h2>
                <p className="text-[11px] text-[#787B86]">
                  {isAr
                    ? 'اضغط على أي خبر اقتصادي لعرض شرح المؤشر وتأثيره المباشر على الذهب (XAUUSD) والناسداك (US100)'
                    : 'Click any economic event row to expand its macro explanation and XAUUSD / US100 reaction guide'}
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono tabular-nums text-[#787B86]">
              {isAr
                ? `إجمالي الأحداث المعروضة: ${filteredEvents.length}`
                : `Showing ${filteredEvents.length} events`}
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E0E3EB] dark:border-white/10">
            {/* Time Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-[#787B86] font-semibold me-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{isAr ? 'الفترة:' : 'Window:'}</span>
              </span>
              {(
                [
                  { id: 'upcoming', labelAr: 'القادم (14 يوم)', labelEn: 'Upcoming (14d)' },
                  { id: 'next7d', labelAr: 'الأسبوع القادم', labelEn: 'Next 7 Days' },
                  { id: 'recent', labelAr: 'نتائج حديثة', labelEn: 'Recent Results' }
                ] as Array<{ id: TimeFilter; labelAr: string; labelEn: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold transition-colors cursor-pointer border ${
                    timeFilter === tab.id
                      ? 'bg-[#10b981] text-white border-[#10b981]'
                      : 'bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border-[#E0E3EB] dark:border-white/10'
                  }`}
                >
                  {isAr ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>

            {/* Impact & Currency Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#787B86] font-semibold me-0.5 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>{isAr ? 'الأهمية:' : 'Impact:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setImpactFilter('all')}
                  className={`px-2 py-1 rounded-[3px] text-[11px] font-semibold transition-colors cursor-pointer border ${
                    impactFilter === 'all'
                      ? 'bg-[#10b981] text-white border-[#10b981]'
                      : 'bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border-[#E0E3EB] dark:border-white/10'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setImpactFilter('high')}
                  className={`px-2 py-1 rounded-[3px] text-[11px] font-semibold transition-colors cursor-pointer border flex items-center gap-1 ${
                    impactFilter === 'high'
                      ? 'bg-[#F23645] text-white border-[#F23645]'
                      : 'bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border-[#E0E3EB] dark:border-white/10'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>{isAr ? 'عالي التأثير' : 'High Only'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                {(['ALL', 'USD', 'EUR', 'GBP', 'CAD'] as CurrencyFilter[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrencyFilter(cur)}
                    className={`px-2 py-1 rounded-[3px] text-[11px] font-mono font-bold transition-colors cursor-pointer border ${
                      currencyFilter === cur
                        ? 'bg-[#10b981] text-white border-[#10b981]'
                        : 'bg-[#F0F3FA] dark:bg-[#0b0e14] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border-[#E0E3EB] dark:border-white/10'
                    }`}
                  >
                    {cur === 'ALL' ? (isAr ? 'الكل' : 'ALL') : `${CURRENCY_FLAGS[cur] || ''} ${cur}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column Headers (Desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-2 bg-[#F0F3FA] dark:bg-[#06080c] border-b border-[#E0E3EB] dark:border-white/10 text-[10px] font-bold text-[#787B86] uppercase tracking-wider">
          <div className="col-span-2">{isAr ? 'التوقيت المحلي' : 'Local Time'}</div>
          <div className="col-span-1 text-center">{isAr ? 'العملة' : 'Currency'}</div>
          <div className="col-span-1 text-center">{isAr ? 'التأثير' : 'Impact'}</div>
          <div className="col-span-5">{isAr ? 'الحدث الاقتصادي' : 'Economic Release'}</div>
          <div className="col-span-1 text-center">{isAr ? 'الحالي' : 'Actual'}</div>
          <div className="col-span-1 text-center">{isAr ? 'المتوقع' : 'Forecast'}</div>
          <div className="col-span-1 text-center">{isAr ? 'السابق' : 'Previous'}</div>
        </div>

        {/* Grouped Events by Day */}
        {groupedDays.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-xs text-[#787B86] font-mono">
              {isLoading
                ? isAr
                  ? 'جاري جلب بيانات التقويم الاقتصادي...'
                  : 'Fetching live economic calendar data...'
                : isAr
                ? 'لا توجد أحداث مطابقة للفلتر المحدد في هذه الفترة.'
                : 'No economic releases match the selected filter in this window.'}
            </p>
            {!isLoading && (timeFilter !== 'upcoming' || impactFilter !== 'all' || currencyFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setTimeFilter('upcoming');
                  setImpactFilter('all');
                  setCurrencyFilter('ALL');
                }}
                className="px-3 py-1.5 rounded-[3px] bg-[#10b981] text-white text-xs font-semibold cursor-pointer"
              >
                {isAr ? 'عرض جميع الأحداث القادمة' : 'Show All Upcoming Events'}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E0E3EB] dark:divide-white/10">
            {groupedDays.map((group) => (
              <div key={group.dateKey} className="bg-[#F0F3FA] dark:bg-[#0b0e14]">
                {/* Day Header */}
                <div className="px-4 py-2 bg-[#F0F3FA]/95 dark:bg-[#06080c]/90 border-b border-[#E0E3EB] dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                    <span className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC]">
                      {formatDayHeader(group.dayTimestampMs)}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-[#787B86]">
                    {isAr ? `${group.events.length} حدث` : `${group.events.length} events`}
                  </span>
                </div>

                {/* Day Events Rows */}
                <div className="divide-y divide-[#E0E3EB] dark:divide-white/10">
                  {group.events.map((ev) => {
                    const isExpanded = expandedIds.has(ev.id);
                    const isUpcoming = ev.releaseTimeMs > nowMs;
                    const isWithinHour =
                      isUpcoming && ev.releaseTimeMs - nowMs <= 60 * 60 * 1000;
                    const localTimeStr = new Date(ev.releaseTimeMs).toLocaleTimeString(
                      isAr ? 'ar-AE' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    );
                    const actualColor = getActualColorClass(ev.actual, ev.forecast, ev.previous);

                    return (
                      <div key={ev.id} className="transition-colors">
                        {/* Main Row */}
                        <div
                          onClick={() => toggleExpand(ev.id)}
                          className={`px-3 sm:px-4 py-2.5 cursor-pointer transition-colors hover:bg-[#EDF1F7] dark:hover:bg-[#06080c]/60 ${
                            isExpanded ? 'bg-[#F0F3FA]/95 dark:bg-[#06080c]/80' : ''
                          } ${isWithinHour && ev.impact === 'HIGH' ? 'border-s-2 border-s-[#F23645]' : ''}`}
                        >
                          {/* Desktop 12-Col Layout */}
                          <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                            {/* Local Time + Countdown */}
                            <div className="col-span-2 flex items-center gap-1.5 font-mono tabular-nums">
                              <span className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC]">
                                {localTimeStr}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold ${
                                  isWithinHour
                                    ? 'bg-[#F23645] text-white'
                                    : isUpcoming
                                    ? 'bg-[#F0F3FA] dark:bg-[#06080c] text-[#089981] dark:text-[#10b981] border border-[#E0E3EB] dark:border-white/10'
                                    : 'bg-[#F0F3FA] dark:bg-[#06080c] text-[#787B86] border border-[#E0E3EB] dark:border-white/10'
                                }`}
                              >
                                {formatRemainingCountdown(ev.releaseTimeMs)}
                              </span>
                            </div>

                            {/* Currency */}
                            <div className="col-span-1 text-center">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[11px] font-mono font-bold text-[#131722] dark:text-[#D1D4DC]">
                                <span>{CURRENCY_FLAGS[ev.currency] || ''}</span>
                                <span>{ev.currency}</span>
                              </span>
                            </div>

                            {/* Impact */}
                            <div className="col-span-1 flex justify-center">
                              <ImpactBars impact={ev.impact} />
                            </div>

                            {/* Title */}
                            <div className="col-span-5 min-w-0 pe-2">
                              <div className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC] truncate">
                                {isAr ? ev.titleAr : ev.titleEn}
                              </div>
                              {isAr && (
                                <div className="text-[10px] font-mono text-[#787B86] truncate">
                                  {ev.titleEn}
                                </div>
                              )}
                            </div>

                            {/* Actual */}
                            <div className={`col-span-1 text-center font-mono tabular-nums text-xs ${actualColor}`}>
                              {ev.actual || '—'}
                            </div>

                            {/* Forecast */}
                            <div className="col-span-1 text-center font-mono tabular-nums text-xs text-[#131722] dark:text-[#D1D4DC]">
                              {ev.forecast || '—'}
                            </div>

                            {/* Previous + Expand Icon */}
                            <div className="col-span-1 flex items-center justify-end gap-1.5 font-mono tabular-nums text-xs text-[#787B86]">
                              <span>{ev.previous || '—'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#787B86] shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Mobile Stacked Layout */}
                          <div className="md:hidden space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                                <span className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC]">
                                  {localTimeStr}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10 text-[10px] font-bold text-[#131722] dark:text-[#D1D4DC]">
                                  {CURRENCY_FLAGS[ev.currency] || ''} {ev.currency}
                                </span>
                                <ImpactBars impact={ev.impact} />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono tabular-nums font-bold ${
                                    isWithinHour
                                      ? 'bg-[#F23645] text-white'
                                      : isUpcoming
                                      ? 'bg-[#F0F3FA] dark:bg-[#06080c] text-[#089981] dark:text-[#10b981] border border-[#E0E3EB] dark:border-white/10'
                                      : 'bg-[#F0F3FA] dark:bg-[#06080c] text-[#787B86] border border-[#E0E3EB] dark:border-white/10'
                                  }`}
                                >
                                  {formatRemainingCountdown(ev.releaseTimeMs)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#089981] dark:text-[#10b981]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-[#787B86]" />
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC] leading-snug">
                                {isAr ? ev.titleAr : ev.titleEn}
                              </div>
                              {isAr && (
                                <div className="text-[10px] font-mono text-[#787B86]">
                                  {ev.titleEn}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums text-[10px] text-center">
                              <div className="py-1 px-1.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10">
                                <span className="text-[#787B86] block text-[9px]">
                                  {isAr ? 'الحالي' : 'Actual'}
                                </span>
                                <span className={actualColor}>{ev.actual || '—'}</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10">
                                <span className="text-[#787B86] block text-[9px]">
                                  {isAr ? 'المتوقع' : 'Forecast'}
                                </span>
                                <span className="text-[#131722] dark:text-[#D1D4DC] font-bold">{ev.forecast || '—'}</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] border border-[#E0E3EB] dark:border-white/10">
                                <span className="text-[#787B86] block text-[9px]">
                                  {isAr ? 'السابق' : 'Previous'}
                                </span>
                                <span className="text-[#787B86]">{ev.previous || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details & XAUUSD / US100 Impact Panel */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-[#F0F3FA] dark:bg-[#06080c] border-t border-[#E0E3EB] dark:border-white/10 space-y-2.5 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Summary: What it measures */}
                              <div className="p-2.5 rounded-[4px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#089981] dark:text-[#10b981]">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>
                                    {isAr
                                      ? 'ما هو هذا المؤشر ولماذا تراقبه المؤسسات؟'
                                      : 'What This Indicator Measures'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#131722] dark:text-[#D1D4DC] leading-relaxed">
                                  {isAr ? ev.summaryAr : ev.summaryEn}
                                </p>
                              </div>

                              {/* Gold & Nasdaq Reaction Guide */}
                              <div className="p-2.5 rounded-[4px] bg-[#F0F3FA] dark:bg-[#0b0e14] border border-[#E0E3EB] dark:border-white/10 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#089981]">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>
                                    {isAr
                                      ? 'دليل التفاعل على الذهب (XAUUSD) والناسداك (US100)'
                                      : 'Gold (XAUUSD) & Nasdaq (US100) Reaction Guide'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#131722] dark:text-[#D1D4DC] leading-relaxed">
                                  {isAr ? ev.goldNasdaqImpactAr : ev.goldNasdaqImpactEn}
                                </p>
                              </div>
                            </div>

                            {/* Affected Assets Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-[#787B86] font-semibold">
                                  {isAr ? 'الأزواج والأصول الأكثر تأثراً:' : 'Primary Affected Assets:'}
                                </span>
                                {ev.affectedAssets.map((asset) => (
                                  <span
                                    key={asset}
                                    className="px-2 py-0.5 rounded-[3px] bg-[#E6F5F2] dark:bg-[#10b981]/15 text-[#089981] dark:text-[#10b981] border border-[#B3E2D9] dark:border-[#10b981]/30 font-mono font-bold text-[10px]"
                                  >
                                    {asset}
                                  </span>
                                ))}
                              </div>

                              <span className="text-[10px] font-mono text-[#787B86]">
                                {ev.titleEn} ({ev.currency})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
