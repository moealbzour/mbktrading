import React, { useState, useEffect } from 'react';
import {
  Clock,
  X,
  Globe2,
  Activity,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

interface SessionInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  openUtc: number; // Hour in UTC (0-23)
  closeUtc: number; // Hour in UTC
  activePairAr: string;
  activePairEn: string;
  volatility: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

const SESSIONS: SessionInfo[] = [
  {
    id: 'sydney',
    nameAr: 'جلسة سيدني',
    nameEn: 'Sydney Session',
    cityAr: 'أستراليا',
    cityEn: 'Australia',
    openUtc: 21,
    closeUtc: 6,
    activePairAr: 'AUDUSD, NZDUSD',
    activePairEn: 'AUDUSD, NZDUSD',
    volatility: 'NORMAL'
  },
  {
    id: 'tokyo',
    nameAr: 'جلسة طوكيو (الآسيوية)',
    nameEn: 'Tokyo / Asian Session',
    cityAr: 'اليابان',
    cityEn: 'Japan',
    openUtc: 0,
    closeUtc: 9,
    activePairAr: 'USDJPY, AUDJPY, BTC',
    activePairEn: 'USDJPY, AUDJPY, BTC',
    volatility: 'MEDIUM'
  },
  {
    id: 'london',
    nameAr: 'جلسة لندن (الأوروبية)',
    nameEn: 'London / European Session',
    cityAr: 'المملكة المتحدة',
    cityEn: 'United Kingdom',
    openUtc: 7,
    closeUtc: 16,
    activePairAr: 'EURUSD, GBPUSD, XAUUSD',
    activePairEn: 'EURUSD, GBPUSD, XAUUSD',
    volatility: 'HIGH'
  },
  {
    id: 'newyork',
    nameAr: 'جلسة نيويورك (الأمريكية)',
    nameEn: 'New York / US Session',
    cityAr: 'الولايات المتحدة',
    cityEn: 'United States',
    openUtc: 12,
    closeUtc: 21,
    activePairAr: 'US100, XAUUSD, EURUSD',
    activePairEn: 'US100, XAUUSD, EURUSD',
    volatility: 'HIGH'
  }
];

export const MarketSessionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'ar'
}) => {
  const [currentUtcHour, setCurrentUtcHour] = useState<number>(() => new Date().getUTCHours());
  const [currentUtcMin, setCurrentUtcMin] = useState<number>(() => new Date().getUTCMinutes());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentUtcHour(d.getUTCHours());
      setCurrentUtcMin(d.getUTCMinutes());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const isSessionOpen = (s: SessionInfo, hour: number): boolean => {
    if (s.openUtc < s.closeUtc) {
      return hour >= s.openUtc && hour < s.closeUtc;
    }
    // Crosses midnight UTC (e.g. Sydney 21 to 6)
    return hour >= s.openUtc || hour < s.closeUtc;
  };

  const isOverlapActive = isSessionOpen(SESSIONS[2], currentUtcHour) && isSessionOpen(SESSIONS[3], currentUtcHour);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-[#FFFFFF]/90 dark:bg-[#131722]/50 dark:bg-black/85 dark:backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative text-[#131722] dark:text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/40 flex items-center justify-center text-[#9A6700] dark:text-amber-400 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#131722] dark:text-white flex items-center gap-2">
                <span>{isAr ? 'ساعات وجلسات السوق العالمية' : 'Global Market Sessions Clock'}</span>
              </h3>
              <p className="text-xs text-[#787b86]">
                {isAr
                  ? 'متابعة لحظية لساعات عمل بورصات لندن، نيويورك، طوكيو وسيدني'
                  : 'Real-time operating hours for London, New York, Tokyo & Sydney'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live World Time Banner */}
        <div className="my-3.5 p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#089981]" />
            <span className="text-xs font-semibold text-[#787b86]">
              {isAr ? 'التوقيت العالمي (UTC):' : 'Coordinated Time (UTC):'}
            </span>
          </div>
          <div className="text-sm font-mono font-bold text-[#131722] dark:text-white">
            {String(currentUtcHour).padStart(2, '0')}:{String(currentUtcMin).padStart(2, '0')} UTC
          </div>
        </div>

        {/* London + New York Overlap Banner */}
        {isOverlapActive && (
          <div className="p-3 mb-3 rounded-xl bg-[#FDF6E3] dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-500/20 border border-[#EFE0B4] dark:border-amber-500/50 flex items-center gap-2.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg">
            <Flame className="w-5 h-5 text-[#9A6700] dark:text-amber-400 shrink-0 animate-bounce" />
            <div className="text-xs">
              <span className="font-bold text-[#9A6700] dark:text-amber-300 block">
                {isAr ? '⚡ تداخل جلستي لندن ونيويورك (ذروة السيولة)' : '⚡ London & New York Overlap (Peak Volume)'}
              </span>
              <span className="text-[#131722] dark:text-[#d1d4dc] text-[11px]">
                {isAr
                  ? 'أعلى حجم تداول يومي على الذهب (XAUUSD) وناسداك (US100) واليورو.'
                  : 'Highest daily volatility on Gold, Nasdaq, and major currencies.'}
              </span>
            </div>
          </div>
        )}

        {/* 4 Sessions Cards */}
        <div className="space-y-2.5">
          {SESSIONS.map((s) => {
            const open = isSessionOpen(s, currentUtcHour);

            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all ${
                  open
                    ? 'bg-[#FFFFFF] dark:bg-[#131722] border-[#B3E2D9] dark:border-[#089981]/50 shadow-md shadow-none dark:shadow-[#089981]/5'
                    : 'bg-[#FFFFFF]/90 dark:bg-[#131722]/50 border-[#E0E3EB] dark:border-[#2a2e39]/60 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        open ? 'bg-[#089981] animate-ping' : 'bg-[#787b86]'
                      }`}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#131722] dark:text-white">
                        {isAr ? s.nameAr : s.nameEn}
                      </h4>
                      <span className="text-[10px] text-[#787b86]">
                        {isAr ? s.cityAr : s.cityEn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {open ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6F5F2] dark:bg-[#089981]/20 text-[#089981] border border-[#B3E2D9] dark:border-[#089981]/40 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {isAr ? 'مفتوحة الآن' : 'ACTIVE NOW'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#787b86] bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39]">
                        {isAr ? 'مغلقة' : 'CLOSED'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#E0E3EB] dark:border-[#2a2e39]/60 flex items-center justify-between text-[11px] font-mono text-[#787b86]">
                  <div>
                    <span>{isAr ? 'التوقيت:' : 'Hours:'} </span>
                    <span className="text-[#131722] dark:text-white font-semibold">
                      {String(s.openUtc).padStart(2, '0')}:00 - {String(s.closeUtc).padStart(2, '0')}:00 UTC
                    </span>
                  </div>
                  <div>
                    <span>{isAr ? 'الأصول:' : 'Assets:'} </span>
                    <span className="text-[#089981] font-semibold">
                      {isAr ? s.activePairAr : s.activePairEn}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
