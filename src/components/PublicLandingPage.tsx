import React, { useState } from 'react';
import { MarketTicker, TradeSignal } from '../types/trading';
import {
  ShieldCheck,
  Zap,
  Ticket,
  Award,
  Sparkles,
  Radio,
  Boxes,
  MessageSquare,
  Bot,
  Copy,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Users,
  LineChart,
  Calendar,
  Lock,
  Globe,
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { TerminalPreview } from './TerminalPreview';
import { VerifiedTrackRecord } from './VerifiedTrackRecord';
import { InteractiveGlowCard } from './InteractiveGlowCard';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { HeaderTicker } from './layout/HeaderTicker';
import { soundManager } from '../utils/audio';

interface Props {
  tickers: MarketTicker[];
  winningSignals: TradeSignal[];
  onOpenAuth: (tab: 'login' | 'signup', initialPromo?: string) => void;
  onOpenBrokerModal: () => void;
  onDirectEnterDashboard: () => void;
}

export const PublicLandingPage: React.FC<Props> = ({
  tickers,
  winningSignals,
  onOpenAuth,
  onOpenBrokerModal,
  onDirectEnterDashboard
}) => {
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chart');

  const handleAuthClick = (tab: 'login' | 'signup', promo?: string) => {
    soundManager.playClick();
    onOpenAuth(tab, promo);
  };

  const handleBrokerClick = () => {
    soundManager.playClick();
    onOpenBrokerModal();
  };

  const handleDemoClick = () => {
    soundManager.playClick();
    onDirectEnterDashboard();
  };

  const handleMobileTabChange = (tab: MobileTab) => {
    setActiveMobileTab(tab);
    if (tab === 'chart') {
      onDirectEnterDashboard();
    } else if (tab === 'signals') {
      const el = document.getElementById('signals');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else onDirectEnterDashboard();
    } else if (tab === 'ai') {
      const el = document.getElementById('free-tools');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else onDirectEnterDashboard();
    } else if (tab === 'chat') {
      handleAuthClick('signup', 'VIP2026');
    } else if (tab === 'profile') {
      handleAuthClick('login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. TOP HEADER / NAVIGATION */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-cyan-400 font-mono tracking-wider text-base">MBK</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-100 text-base font-mono tracking-wide">
                  MBK TRADING
                </span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[10px] text-cyan-400 font-semibold">
                المنصة المؤسسية للتداول المالي
              </p>
            </div>
          </div>

          {/* Clean Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#hero" className="hover:text-cyan-400 transition-colors">
              الرئيسية
            </a>
            <a href="#signals" className="hover:text-cyan-400 transition-colors">
              الإشارات
            </a>
            <a href="#free-tools" className="hover:text-cyan-400 transition-colors">
              الأخبار والتحليل
            </a>
            <a href="#track-record" className="hover:text-cyan-400 transition-colors">
              سجل الأداء الموثق
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">
              باقات VIP
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleAuthClick('login')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/80 cursor-pointer"
            >
              تسجيل الدخول
            </button>

            <button
              onClick={() => handleAuthClick('signup')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition-all shadow-md shadow-cyan-600/25 flex items-center gap-1.5 cursor-pointer animate-pulse-cyan"
            >
              <span>إنشاء حساب مجاني</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* OFFICIAL TRADINGVIEW REAL-TIME TICKER TAPE (Obsidian Charcoal + Gold) */}
      <HeaderTicker />

      {/* 2. HERO SECTION WITH STAGGERED REVEAL & TERMINAL PREVIEW */}
      <section id="hero" className="relative pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
        {/* Glow Ambient Blobs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* MBK Illuminated Logo & Hero Badge (0.2s delay) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 14,
              delay: 0.2
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-emerald-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>المنصة المؤسسية الأولى للتداول المالي — MBKTrading</span>
          </motion.div>

          {/* Main Headline & Subtitle (0.3s delay) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 14,
              delay: 0.3
            }}
          >
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-tight max-w-4xl mx-auto mb-6">
              منصة <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">MBKtrading</span> — بيئة التداول المؤسسية للنازداك والذهب
            </h1>

            <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed font-medium">
              شارتات حية، إشارات فورية من مؤشراتنا الخاصة، تحليل معنويات السوق بالذكاء الاصطناعي، وأجندة اقتصادية مباشرة.
            </p>
          </motion.div>

          {/* CTA Buttons with subtle glow pulse (0.4s delay) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 14,
              delay: 0.4
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8"
          >
            <button
              onClick={() => handleAuthClick('signup')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm transition-all shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 animate-pulse-cyan"
            >
              <span>أنشئ حسابك المجاني الان</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>

            <button
              onClick={() => handleAuthClick('signup', 'MBKVIP')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer animate-pulse-gold"
            >
              <Ticket className="w-4 h-4" />
              <span>تفعيل عضوية VIP برمز</span>
            </button>
          </motion.div>

          {/* Direct Live Dashboard Preview Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-8"
          >
            <button
              onClick={handleDemoClick}
              className="text-xs text-slate-400 hover:text-cyan-300 font-semibold underline underline-offset-4 flex items-center justify-center gap-1 mx-auto cursor-pointer transition-colors"
            >
              <span>استكشف بيئة التداول الحية في وضع المعاينة السريعة (Live Preview)</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </motion.div>

          {/* Main Trading Terminal preview container (0.5s delay) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
              delay: 0.5
            }}
            className="mb-14"
          >
            <TerminalPreview tickers={tickers} onOpenAuth={handleAuthClick} />
          </motion.div>

          {/* Free Registration Benefits Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-[#111827]/80 border border-slate-800 flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>شارت TradingView مباشر مجاناً</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111827]/80 border border-slate-800 flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>أجندة اقتصادية لحظية</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111827]/80 border border-slate-800 flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>غرفة نقاش مجتمع MBK</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111827]/80 border border-slate-800 flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>توقعات جلسات الذكاء الاصطناعي</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VERIFIED TRACK RECORD & AUDITED PERFORMANCE SECTION */}
      <VerifiedTrackRecord onOpenAuth={handleAuthClick} />

      {/* 4. REAL-TIME ACTIVE TOOLS BANNER (WITH HOVER GLOW CARDS) */}
      <section id="free-tools" className="py-16 bg-[#0d131f] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest block mb-2 font-mono">
              FREEMIUM LIVE PLATFORM
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3">
              أدوات التداول المتاحة مجاناً لكل متداول مسجل
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              أنشئ حسابك خلال ثوانٍ واستمتع بالأدوات الأساسية فوراً، أو استخدم رمز الترويج للوصول لبث VIP الحصري
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1: Chart Canvas */}
            <InteractiveGlowCard glowColor="cyan" className="p-5">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/30">
                <LineChart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 mb-2">
                الرسم البياني التفاعلي (TradingView)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                شارت تفاعلي لحظي لناسداك، الذهب، واليورو مع تحكم كامل بالأطر الزمنية ومؤشرات الفوليوم.
              </p>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                متاح ومجاني 100%
              </span>
            </InteractiveGlowCard>

            {/* Feature 2: Gemini AI Trader Assistant */}
            <InteractiveGlowCard glowColor="emerald" className="p-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 mb-2">
                مساعد التداول الذكي (Gemini AI)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                تحليل لحظي سريع بـ Gemini Flash-Lite وبحث حي بأخبار الويب (Search Grounding) لحساب اللوت ومناطق السيولة.
              </p>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                متاح ومجاني 100%
              </span>
            </InteractiveGlowCard>

            {/* Feature 3: Economic Calendar */}
            <InteractiveGlowCard glowColor="amber" className="p-5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 mb-2">
                الأجندة الاقتصادية المباشرة
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                متابعة لحظية لبيانات التضخم CPI، الوظائف الأمريكية NFP، وقرارات الفائدة الفيدرالية مع مؤشرات درجة التأثير.
              </p>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                متاح ومجاني 100%
              </span>
            </InteractiveGlowCard>

            {/* Feature 4: Public Community Chat */}
            <InteractiveGlowCard glowColor="cyan" className="p-5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-100 mb-2">
                غرفة نقاش مجتمع المتداولين
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                تبادل الأفكار الفنية، مناقشة تحركات السيولة أثناء الجلسات، والتفاعل المباشر مع مئات المتداولين العرب.
              </p>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                متاح ومجاني 100%
              </span>
            </InteractiveGlowCard>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED SIGNALS PREVIEW (SHIMMER & GLOW CARDS) */}
      <section id="signals" className="py-16 bg-[#0b0f17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block mb-2 font-mono">
              PINE SCRIPT VERIFIED SIGNALS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3">
              إشارات التداول الخوارزمية الفورية
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              إشارات دقيقة ترسل مباشرة عبر Webhook بمجرد تحقق شروط الدخول الخوارزمية لنظام MBK
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: US100 Buy */}
            <InteractiveGlowCard glowColor="emerald" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono">
                    BUY شراء
                  </span>
                  <span className="font-mono font-black text-base text-slate-100">US100</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  حقق الهدف الثاني (+120 نقطة) 🎯
                </span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c121d] text-xs font-mono mb-3">
                <div className="flex justify-between text-slate-400">
                  <span>نقطة الدخول (Entry):</span>
                  <span className="text-slate-200 font-bold">20,440.00</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>الهدف الثاني (TP2):</span>
                  <span className="font-bold">20,560.00 ✓</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>وقف الخسارة (SL):</span>
                  <span>20,380.00</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>استراتيجية: MBK Scalp Breakout</span>
                <span className="text-emerald-400 font-bold font-mono">+120 Pips</span>
              </div>
            </InteractiveGlowCard>

            {/* Card 2: XAUUSD Buy */}
            <InteractiveGlowCard glowColor="amber" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono">
                    BUY شراء
                  </span>
                  <span className="font-mono font-black text-base text-slate-100">XAUUSD الذهب</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  حقق الهدفين (+164 نقطة) 🎯
                </span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c121d] text-xs font-mono mb-3">
                <div className="flex justify-between text-slate-400">
                  <span>نقطة الدخول (Entry):</span>
                  <span className="text-slate-200 font-bold">2,668.00</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>الهدف الثاني (TP2):</span>
                  <span className="font-bold">2,684.40 ✓</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>وقف الخسارة (SL):</span>
                  <span>2,658.00</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>استراتيجية: Alligator & FVG</span>
                <span className="text-emerald-400 font-bold font-mono">+164 Pips</span>
              </div>
            </InteractiveGlowCard>

            {/* Card 3: EURUSD Sell */}
            <InteractiveGlowCard glowColor="cyan" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black font-mono">
                    SELL بيع
                  </span>
                  <span className="font-mono font-black text-base text-slate-100">EURUSD</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  حقق الهدف الأول (+33 نقطة) 🎯
                </span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c121d] text-xs font-mono mb-3">
                <div className="flex justify-between text-slate-400">
                  <span>نقطة الدخول (Entry):</span>
                  <span className="text-slate-200 font-bold">1.08750</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>الهدف الأول (TP1):</span>
                  <span className="font-bold">1.08420 ✓</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>وقف الخسارة (SL):</span>
                  <span>1.08950</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>استراتيجية: USD Rebound</span>
                <span className="text-emerald-400 font-bold font-mono">+33 Pips</span>
              </div>
            </InteractiveGlowCard>
          </div>
        </div>
      </section>

      {/* 6. PRICING & VIP ACCESS SPECIFICATION */}
      <section id="pricing" className="py-16 bg-[#0d131f] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-2 font-mono">
              FREEMIUM TIERS COMPARISON
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3">
              مقارنة العضوية المجانية وباقات VIP
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ابدأ بالحساب المجاني المفتوح، أو فعل عضوية VIP الكاملة برمز ترويجي أو عبر الوسيط المعتمد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier Card */}
            <div className="rounded-2xl p-6 sm:p-8 bg-[#141b29] border border-slate-800 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                    الحساب المجاني الدائم (Free Tier)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    $0 دائماً
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-100 mb-2">
                  العضوية المجانية القياسية
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  مناسب للمتداولين الراغبين بمتابعة الشارتات الحية والأجندة الاقتصادية والمشاركة في مجتمع التداول.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>شارت TradingView مباشر لجميع الأصول</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>أجندة اقتصادية مباشرة ومحدثة</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>دخول غرفة النقاش العامة لمجتمع MBK</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>عينة إشارات تداول توضيحية</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAuthClick('signup')}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>إنشاء حساب مجاني الآن</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {/* VIP Tier Card */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-[#1c273a] to-[#121927] border-2 border-amber-500/60 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3 right-6">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md">
                  VIP متاح بالرمز الترويجي أو الوسيط 🔥
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                    عضوية VIP الاحترافية
                  </span>
                  <span className="text-[11px] text-amber-400 font-bold font-mono">
                    PROMO / IB UNLOCK
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-100 mb-2">
                  عضوية MBK VIP الكاملة
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  فتح فوري لكافة التنبيهات اللحظية، مستويات الأهداف ووقف الخسارة الفورية، وغرفة تحليلات VIP الخاصة.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>بث لحظي غير مقيد لجميع إشارات Webhook</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>توقعات جلسات الذكاء الاصطناعي (طوكيو، لندن، نيويورك)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>دخول غرفة تحليلات VIP الخاصة (Alpha Chat)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>صافرة تنبيه صوتية لحظية فور صدور كل صفقة</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleAuthClick('signup', 'MBKVIP')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer animate-pulse-gold"
                >
                  <Ticket className="w-4 h-4" />
                  <span>تفعيل VIP بواسطة رمز ترويجي</span>
                </button>

                <button
                  onClick={handleBrokerClick}
                  className="w-full py-2.5 rounded-xl bg-[#141b29] hover:bg-[#1a2335] text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>أو تفعيل VIP مجاناً عبر الوسيط المعتمد</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DEDICATED CERTIFIED ANALYSTS BANNER & TELEGRAM COMMUNITY */}
      <section className="py-12 bg-[#090d15] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Subtle Certified Analysts Attribution Banner */}
          <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              تحت إدارة فريق من <strong className="text-slate-200 font-bold">المحللين المعتمدين والمطورين لـ Pine Script وخوارزميات التداول</strong> لمنصة MBKtrading.
            </p>
          </div>

          {/* Telegram Community Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="text-right">
              <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>انضم لقناة تيليجرام الرسمية لـ MBKtrading</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  1,000+ عضو نشط
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
                يشارك فريق أبحاث MBK والمحللون المعتمدون تحديثات السوق اللحظية وتوقعات السيولة وجلسات التداول اليومية مباشرة مع رموز تفعيل حصرية.
              </p>
            </div>

            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-lg shadow-sky-600/25 flex items-center gap-2 shrink-0 cursor-pointer hover:bg-sky-400"
            >
              <Zap className="w-4 h-4" />
              <span>انضم لقناة التليجرام الرسمية</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 mb-16 md:mb-0 bg-[#070a10] border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-400 font-bold font-mono">
            <span>MBK TRADING</span>
            <span>•</span>
            <span className="font-sans">إدارة أبحاث السوق والمحللين المعتمدين</span>
          </div>

          <p className="text-[11px] text-slate-600 max-w-3xl mx-auto leading-relaxed">
            إخلاء المسؤولية عن المخاطر: تداول العملات الأجنبية، مؤشرات الأسهم والمعادن ينطوي على درجة عالية من المخاطرة المالية وقد لا يكون مناسباً لجميع المستثمرين. يرجى التأكد من فهمك الكامل لكافة المخاطر واستشارة مستشار مالي مستقل عند الحاجة.
          </p>

          <p className="text-[10px] text-slate-600">
            © {new Date().getFullYear()} MBKtrading. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        activeTab={activeMobileTab}
        onChangeTab={handleMobileTabChange}
        isVip={false}
        signalsCount={winningSignals.length}
      />
    </div>
  );
};
