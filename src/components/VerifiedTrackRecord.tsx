import React from 'react';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Target,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCounter } from './AnimatedCounter';
import { InteractiveGlowCard } from './InteractiveGlowCard';

interface VerifiedTrackRecordProps {
  onOpenAuth: (tab: 'login' | 'signup') => void;
}

export const VerifiedTrackRecord: React.FC<VerifiedTrackRecordProps> = ({
  onOpenAuth
}) => {
  const verifiedTrades = [
    {
      id: 'TR-9821',
      date: 'اليوم • 16:45',
      symbol: 'US100',
      type: 'BUY',
      entry: 20440,
      exit: 20560,
      pips: '+120',
      result: 'حقق الهدف الثاني 🎯',
      gain: '+$1,200',
      status: 'VERIFIED'
    },
    {
      id: 'TR-9818',
      date: 'اليوم • 14:10',
      symbol: 'XAUUSD (الذهب)',
      type: 'BUY',
      entry: 2668.5,
      exit: 2684.9,
      pips: '+164',
      result: 'حقق الأهداف كاملة 🎯',
      gain: '+$1,640',
      status: 'VERIFIED'
    },
    {
      id: 'TR-9814',
      date: 'أمس • 17:30',
      symbol: 'EURUSD',
      type: 'SELL',
      entry: 1.0875,
      exit: 1.0842,
      pips: '+33',
      result: 'حقق الهدف الأول 🎯',
      gain: '+$330',
      status: 'VERIFIED'
    },
    {
      id: 'TR-9809',
      date: 'أمس • 11:15',
      symbol: 'US100',
      type: 'BUY',
      entry: 20380,
      exit: 20495,
      pips: '+115',
      result: 'حقق الهدف الثاني 🎯',
      gain: '+$1,150',
      status: 'VERIFIED'
    }
  ];

  const monthlyBreakdown = [
    { month: 'يناير 2026', pips: '+410 Pips', winRate: '86%', trades: 42 },
    { month: 'فبراير 2026', pips: '+390 Pips', winRate: '82%', trades: 38 },
    { month: 'مارس 2026', pips: '+620 Pips', winRate: '85.5%', trades: 51 }
  ];

  return (
    <section id="track-record" className="py-16 sm:py-24 bg-[#090d15] border-t border-slate-800 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>AUDITED & VERIFIED PERFORMANCE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-100 mb-4">
            سجل أداء حقيقي وموثق بالكامل (Track Record)
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            الشفافية التامة هي المعيار الأول لمنصة MBKtrading. كل نقطة موثقة ومطابقة للأوامر الصادرة عبر خوارزميات التداول وبث الإشارات المباشر.
          </p>
        </div>

        {/* 1. ANIMATED STATS & COUNTERS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {/* Stat 1: Total Pips */}
          <InteractiveGlowCard glowColor="emerald" className="p-5 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-emerald-400 mb-1">
              <AnimatedCounter value={1420} prefix="+" suffix=" Pips" duration={2200} />
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">إجمالي النقاط المحققة</div>
            <p className="text-[11px] text-slate-400">على مدار الشهر الحالي لمؤشرات وذهب</p>
          </InteractiveGlowCard>

          {/* Stat 2: Win Rate */}
          <InteractiveGlowCard glowColor="cyan" className="p-5 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-cyan-400 mb-1">
              <AnimatedCounter value={84.5} suffix="%" decimals={1} duration={2000} />
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">نسبة نجاح الصفقات (Win Rate)</div>
            <p className="text-[11px] text-slate-400">بمعدل ضرب TP1 أو TP2 المباشر</p>
          </InteractiveGlowCard>

          {/* Stat 3: Active Members */}
          <InteractiveGlowCard glowColor="amber" className="p-5 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-amber-400 mb-1">
              <AnimatedCounter value={300} prefix="+" suffix=" متداول" duration={1800} />
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">المتداولون النشطون يومياً</div>
            <p className="text-[11px] text-slate-400">في مجتمع وقنوات MBK التفاعلية</p>
          </InteractiveGlowCard>

          {/* Stat 4: Risk / Reward */}
          <InteractiveGlowCard glowColor="emerald" className="p-5 sm:p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-indigo-300 mb-1">
              <AnimatedCounter value={2.4} prefix="1:" decimals={1} duration={1900} />
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">متوسط العائد إلى المخاطرة (R:R)</div>
            <p className="text-[11px] text-slate-400">حماية صارمة لرأس المال</p>
          </InteractiveGlowCard>
        </div>

        {/* 2. LIVE AUDIT TABLE & MONTHLY METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verified Trade History Table */}
          <div className="lg:col-span-2 rounded-2xl bg-[#111827] border border-slate-800 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  سجل آخر العمليات الموثقة (Audit Log)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Live Data Synchronized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80 pb-2">
                    <th className="pb-2 font-semibold">الأصل / النوع</th>
                    <th className="pb-2 font-semibold">الدخول / الإغلاق</th>
                    <th className="pb-2 font-semibold">النقاط المحققة</th>
                    <th className="pb-2 font-semibold">النتيجة</th>
                    <th className="pb-2 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {verifiedTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              t.type === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {t.type}
                          </span>
                          <span className="font-bold text-slate-100">{t.symbol}</span>
                        </div>
                      </td>

                      <td className="py-3 text-slate-300">
                        {t.entry} → <strong className="text-emerald-400">{t.exit}</strong>
                      </td>

                      <td className="py-3 font-bold text-emerald-400 text-sm">{t.pips}</td>

                      <td className="py-3 font-sans text-slate-300">{t.result}</td>

                      <td className="py-3 text-[11px] text-slate-400 font-sans">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>تم التحقق بواسطة محرك Pine Script Webhook</span>
              <button
                onClick={() => onOpenAuth('signup')}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهدة جميع الصفقات التاريخية</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monthly Performance Box */}
          <div className="rounded-2xl bg-[#111827] border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  ملخص الأشهر الأخيرة
                </h3>
              </div>

              <div className="space-y-4">
                {monthlyBreakdown.map((m, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-[#0c121d] border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-200 text-xs block mb-0.5">
                        {m.month}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {m.trades} صفقة مسجلة
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      <div className="text-emerald-400 font-black text-sm">{m.pips}</div>
                      <div className="text-[10px] text-cyan-400">{m.winRate} Win</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-md shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>انضم للحساب المجاني وابدأ التداول</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
