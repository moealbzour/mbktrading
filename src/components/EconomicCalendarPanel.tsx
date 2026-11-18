import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Calendar, Clock, Flame, Globe, Sparkles } from 'lucide-react';
import {
  MacroEconomicEvent,
  getUpcomingMacroEvents
} from '../services/macroEventsAndAnnouncementsService';
import { soundManager } from '../utils/audio';

interface Props {
  lang?: 'ar' | 'en';
}

export const EconomicCalendarPanel: React.FC<Props> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const upcomingEvents: MacroEconomicEvent[] = getUpcomingMacroEvents(nowMs);

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
      locale: isAr ? 'ar_AE' : 'en',
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
  }, [isAr]);

  const formatRemainingCountdown = (releaseTimeMs: number): string => {
    const diffMs = Math.max(0, releaseTimeMs - nowMs);
    const totalMinutes = Math.ceil(diffMs / (60 * 1000));
    if (totalMinutes <= 60) {
      return isAr ? `بعد ${totalMinutes} دقيقة ⚡` : `In ${totalMinutes}m ⚡`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours < 24) {
      return isAr
        ? `بعد ${hours} ساعة و ${mins} د`
        : `In ${hours}h ${mins}m`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return isAr
      ? `بعد ${days} يوم و ${remHours} ساعة`
      : `In ${days}d ${remHours}h`;
  };

  const triggerTestMacroWarning = (code: 'CPI' | 'FOMC') => {
    soundManager.playClick();
    window.dispatchEvent(new CustomEvent('mbk-trigger-macro-warning', { detail: { code } }));
  };

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. BILINGUAL (ARABIC / ENGLISH) MAJOR UPCOMING EVENTS RADAR WITH 1-HOUR POPUP ALERT SYSTEM */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 bg-[#131722] border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 flex-wrap">
                <span>{isAr ? 'الأحداث الاقتصادية القادمة' : 'Upcoming Events'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {isAr ? 'تنبيه قبل ساعة' : '1H ALERT'}
                </span>
              </h2>
              <p className="text-xs text-[#8a93a6] mt-0.5">
                {isAr
                  ? 'تنبيه منبثق قبل ساعة من صدور CPI والفيدرالي والوظائف'
                  : '1-hour popup warning before CPI, FOMC & NFP'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => triggerTestMacroWarning('CPI')}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title={isAr ? 'معاينة نافذة تحذير الـ 60 دقيقة لبيانات CPI' : 'Preview 1-hour CPI warning popup'}
            >
              <BellRing className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAr ? 'تجربة تنبيه CPI (قبل ساعة)' : 'Test 1h CPI Popup'}</span>
            </button>

            <button
              type="button"
              onClick={() => triggerTestMacroWarning('FOMC')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title={isAr ? 'معاينة نافذة تحذير الـ 60 دقيقة لقرار الفيدرالي' : 'Preview 1-hour Fed warning popup'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تجربة تنبيه الفيدرالي FOMC' : 'Test 1h Fed Popup'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcomingEvents.map((ev) => {
            const diffMs = ev.releaseTimeMs - nowMs;
            const isWithinHour = diffMs > 0 && diffMs <= 60 * 60 * 1000;
            const timeFormatted = new Date(ev.releaseTimeMs).toLocaleTimeString(
              isAr ? 'ar-SA' : 'en-US',
              { hour: '2-digit', minute: '2-digit' }
            );

            return (
              <div
                key={ev.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  isWithinHour
                    ? 'bg-rose-500/10 border-rose-500/60 shadow-lg shadow-rose-500/10'
                    : 'bg-[#131722] border-[#2a2e39] hover:border-[#363a45]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-extrabold">
                        {ev.code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39] text-[#d1d4dc] text-[10px] font-mono font-bold">
                        {ev.currency}
                      </span>
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        <span>{isAr ? 'تأثير قوي جداً' : 'High Impact'}</span>
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                        isWithinHour
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-[#1e222d] text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatRemainingCountdown(ev.releaseTimeMs)}</span>
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {isAr ? ev.titleAr : ev.titleEn}
                  </h3>

                  <p className="text-[11px] text-[#8a93a6] leading-relaxed">
                    {isAr ? ev.descriptionAr : ev.descriptionEn}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#2a2e39]/80">
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-center">
                    <div className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39]">
                      <span className="text-[#787b86] block text-[9px]">
                        {isAr ? 'التوقيت' : 'Time'}
                      </span>
                      <span className="text-white font-bold">{timeFormatted}</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39]">
                      <span className="text-[#787b86] block text-[9px]">
                        {isAr ? 'المتوقع' : 'Forecast'}
                      </span>
                      <span className="text-amber-400 font-bold">{ev.forecast}</span>
                    </div>
                    <div className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39]">
                      <span className="text-[#787b86] block text-[9px]">
                        {isAr ? 'السابق' : 'Previous'}
                      </span>
                      <span className="text-[#d1d4dc] font-bold">{ev.previous}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#787b86]">
                      {isAr ? 'الأزواج المتأثرة:' : 'Affected:'}
                    </span>
                    <div className="flex items-center gap-1 font-mono">
                      {ev.affectedPairs.map((pair) => (
                        <span
                          key={pair}
                          className="px-1.5 py-0.2 rounded bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-bold"
                        >
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. OFFICIAL TRADINGVIEW LIVE ECONOMIC CALENDAR EMBED */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{isAr ? 'التقويم الاقتصادي' : 'Economic Calendar'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>{isAr ? 'مباشر' : 'LIVE'}</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'البيانات الاقتصادية المباشرة' : 'Live economic releases'}
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
    </div>
  );
};
