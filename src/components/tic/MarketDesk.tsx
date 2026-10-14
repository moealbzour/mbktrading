import React, { useState, useEffect } from 'react';
import {
  Clock,
  Globe2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Filter,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { MarketTicker, MarketSymbol } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface Props {
  tickers: MarketTicker[];
  onSelectSymbol?: (symbol: MarketSymbol) => void;
}

interface MarketSession {
  id: string;
  name: string;
  nameAr: string;
  city: string;
  openUtc: number; // UTC hour
  closeUtc: number; // UTC hour
  color: string;
  icon: string;
}

const SESSIONS: MarketSession[] = [
  { id: 'sydney', name: 'Sydney', nameAr: 'سيدني (Sydney)', city: 'أستراليا', openUtc: 22, closeUtc: 7, color: 'text-purple-400', icon: '🦘' },
  { id: 'tokyo', name: 'Tokyo', nameAr: 'طوكيو (Tokyo / Asia)', city: 'اليابان', openUtc: 0, closeUtc: 9, color: 'text-rose-400', icon: '🗼' },
  { id: 'london', name: 'London', nameAr: 'لندن (London Open)', city: 'المملكة المتحدة', openUtc: 8, closeUtc: 17, color: 'text-sky-400', icon: '🏛️' },
  { id: 'ny', name: 'New York', nameAr: 'نيويورك (New York)', city: 'الولايات المتحدة', openUtc: 13, closeUtc: 22, color: 'text-emerald-400', icon: '🗽' },
];

export const MarketDesk: React.FC<Props> = ({ tickers, onSelectSymbol }) => {
  const [currentUtc, setCurrentUtc] = useState<Date>(new Date());
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [researchTab, setResearchTab] = useState<'smc_bias' | 'currency_strength'>('smc_bias');

  useEffect(() => {
    const timer = setInterval(() => setCurrentUtc(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utcHour = currentUtc.getUTCHours();
  const utcMinute = currentUtc.getUTCMinutes();
  const utcSecond = currentUtc.getUTCSeconds();

  const isSessionOpen = (s: MarketSession) => {
    if (s.openUtc < s.closeUtc) {
      return utcHour >= s.openUtc && utcHour < s.closeUtc;
    }
    // wrap around midnight
    return utcHour >= s.openUtc || utcHour < s.closeUtc;
  };

  const getRemainingTime = (s: MarketSession) => {
    const isOpen = isSessionOpen(s);
    let targetHour = isOpen ? s.closeUtc : s.openUtc;
    let diffHours = targetHour - utcHour;
    if (diffHours < 0) diffHours += 24;
    const diffMins = 60 - utcMinute;
    const finalHours = diffMins === 60 ? diffHours : diffHours - 1;
    return `${Math.max(0, finalHours)}س ${diffMins % 60}د`;
  };

  const isLondonNyOverlap = isSessionOpen(SESSIONS[2]) && isSessionOpen(SESSIONS[3]);

  // Economic Desk Items with Live Countdowns & Impact
  const economicEvents = [
    {
      id: 'e1',
      title: 'مؤشر أسعار المستهلكين الأساسي الأمريكي (Core CPI YoY)',
      currency: 'USD',
      impact: 'HIGH',
      time: '15:30 ت.مكة',
      countdown: '03:42:15',
      forecast: '3.2%',
      previous: '3.3%',
      sentiment: 'تأثير حاسم على قرار الفيدرالي في تسعير الفائدة'
    },
    {
      id: 'e2',
      title: 'تقرير الوظائف غير الزراعية (US Non-Farm Payrolls)',
      currency: 'USD',
      impact: 'HIGH',
      time: 'الجمعة 15:30',
      countdown: 'يومان 18س',
      forecast: '165K',
      previous: '142K',
      sentiment: 'سيولة عالية متوقعة لمؤشر ناسداك والذهب'
    },
    {
      id: 'e3',
      title: 'قرار الفائدة للبنك المركزي الأوروبي (ECB Rate Decision)',
      currency: 'EUR',
      impact: 'HIGH',
      time: 'الخميس 15:15',
      countdown: 'يوم 21س',
      forecast: '3.50%',
      previous: '3.65%',
      sentiment: 'توقعات خفض 25 نقطة أساس'
    },
    {
      id: 'e4',
      title: 'مبيعات التجزئة البريطانية (Retail Sales MoM)',
      currency: 'GBP',
      impact: 'MEDIUM',
      time: '09:00 ت.مكة',
      countdown: '12:10:00',
      forecast: '0.4%',
      previous: '0.6%',
      sentiment: 'تأثير مباشر على أزواج الجنيه الإسترليني'
    }
  ];

  const filteredEvents = economicEvents.filter((ev) => {
    if (impactFilter === 'ALL') return true;
    return ev.impact === impactFilter;
  });

  // Currency Strength Heatmap
  const currencies = [
    { code: 'USD', strength: 82, trend: 'up', color: 'from-emerald-500 to-emerald-400' },
    { code: 'XAU', strength: 76, trend: 'up', color: 'from-amber-500 to-amber-400' },
    { code: 'EUR', strength: 48, trend: 'down', color: 'from-slate-500 to-slate-400' },
    { code: 'GBP', strength: 59, trend: 'up', color: 'from-sky-500 to-sky-400' },
    { code: 'JPY', strength: 31, trend: 'down', color: 'from-rose-500 to-rose-400' },
    { code: 'AUD', strength: 52, trend: 'down', color: 'from-slate-500 to-slate-400' },
    { code: 'CAD', strength: 44, trend: 'down', color: 'from-slate-500 to-slate-400' }
  ];

  // SMC Research Commentary
  const smcResearch = [
    {
      symbol: 'US100' as MarketSymbol,
      bias: 'صعودي مؤسسي (Bullish)',
      biasColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      keyLevel: '20,440.00 FVG Mitigation',
      target: '20,890.00 Buy-Side Liquidity (BSL)',
      rationale: 'تم سحب سيولة قاع آسيا بنجاح (Sell-Side Liquidity Sweep) مع تشكيل فجوة سعرية إيجابية على فريم 15 دقيقة.'
    },
    {
      symbol: 'XAUUSD' as MarketSymbol,
      bias: 'صعودي قوي (Strong Bullish)',
      biasColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      keyLevel: '2,662.00 Bullish Order Block',
      target: '2,710.00 ATH Liquidity Run',
      rationale: 'حركة تجميعية داخل جلسة لندن مع حماية مستويات الدعم المؤسسية. التوجه نحو استهداف قمم تاريخية جديدة.'
    },
    {
      symbol: 'EURUSD' as MarketSymbol,
      bias: 'هبوطي تصحيحي (Bearish Correction)',
      biasColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      keyLevel: '1.0920 Breaker Block',
      target: '1.0840 External Range Low',
      rationale: 'فشل في اختراق قمة الأسبوع مع تفعيل نموذج MSS وتفريغ عقود الشراء لصالح الدولار الأمريكي.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: MBK DESK BRAND & LIVE MARKET SESSIONS CLOCK */}
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/90 via-[#0e1422] to-slate-900/90 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <Globe2 className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK DESK • غرفة أسواق وجلسات التداول العالمية
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Real-Time Sessions
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع ساعات السيولة العالمية، تداخل الجلسات الكبرى، والأجندة الاقتصادية اللحظية (ضمن منصة MBK Trading المؤسسية)
              </p>
            </div>
          </div>

          {/* Current UTC Clock & Overlap Alert */}
          <div className="flex items-center gap-3 self-start lg:self-auto">
            {isLondonNyOverlap && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>تداخل لندن / نيويورك نشط (Peak Liquidity ⚡)</span>
              </div>
            )}

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 shadow-inner">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>توقيت غرينتش (UTC):</span>
              <span className="font-bold text-white text-sm">
                {String(utcHour).padStart(2, '0')}:{String(utcMinute).padStart(2, '0')}:{String(utcSecond).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* 4 GLOBAL SESSIONS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SESSIONS.map((session) => {
            const isOpen = isSessionOpen(session);
            const remaining = getRemainingTime(session);

            return (
              <div
                key={session.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isOpen
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{session.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{session.nameAr}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {String(session.openUtc).padStart(2, '0')}:00 - {String(session.closeUtc).padStart(2, '0')}:00 UTC
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      isOpen
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isOpen ? 'مفتوحة الآن 🟢' : 'مغلقة ⚪'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-slate-400">
                  <span>{isOpen ? 'يتبقى على الإغلاق:' : 'تفتح بعد:'}</span>
                  <span className="font-mono font-bold text-slate-200">{remaining}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SPLIT SECTION: ECONOMIC CALENDAR & INSTITUTIONAL RESEARCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER: HIGH-IMPACT ECONOMIC CALENDAR (8 Cols) */}
        <div className="lg:col-span-7 bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">الأجندة الاقتصادية عالية التأثير (Economic Desk)</h3>
                <p className="text-[11px] text-slate-400">البيانات المحركة لسيولة الأسواق مع العد التنازلي المباشر</p>
              </div>
            </div>

            {/* Impact Filter Buttons */}
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setImpactFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  impactFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setImpactFilter('HIGH')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  impactFilter === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔴 عالي التأثير
              </button>
              <button
                onClick={() => setImpactFilter('MEDIUM')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  impactFilter === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟠 متوسط
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                        ev.currency === 'USD'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : ev.currency === 'EUR'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}
                    >
                      {ev.currency}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100">{ev.title}</h4>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                    ⏱️ {ev.countdown}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 text-slate-400 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500">التوقيت: </span>
                    <span className="text-slate-300 font-mono">{ev.time}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">المتوقع: </span>
                    <span className="text-emerald-400 font-mono font-bold">{ev.forecast}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">السابق: </span>
                    <span className="text-slate-400 font-mono">{ev.previous}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/40 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{ev.sentiment}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: INSTITUTIONAL SMC RESEARCH & CURRENCY STRENGTH (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* CURRENCY STRENGTH METER */}
          <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">مقياس قوة العملات والذهب (Strength Meter)</h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">Live Multi-Asset</span>
            </div>

            <div className="space-y-2.5">
              {currencies.map((c) => (
                <div key={c.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold font-mono text-slate-200">{c.code}</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      {c.trend === 'up' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="text-slate-300 font-bold">{c.strength}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${c.color} transition-all duration-500`}
                      style={{ width: `${c.strength}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INSTITUTIONAL SMC DAILY BIAS */}
          <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">التوجه اليومي لمفاهيم الأموال الذكية (SMC Daily Bias)</h3>
              </div>
            </div>

            <div className="space-y-3">
              {smcResearch.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm font-mono text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {item.symbol}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.biasColor}`}>
                      {item.bias}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    {item.rationale}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/50">
                    <div>
                      <span className="text-slate-500">المحور: </span>
                      <span className="text-cyan-300 font-mono">{item.keyLevel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">الهدف: </span>
                      <span className="text-emerald-400 font-mono">{item.target}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
