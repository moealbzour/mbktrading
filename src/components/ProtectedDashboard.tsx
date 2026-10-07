import React, { useState } from 'react';
import {
  UserProfile,
  MarketSymbol,
  MarketTicker,
  TradeSignal,
  ChatMessage,
  EconomicNewsItem
} from '../types/trading';
import {
  TrendingUp,
  Target,
  Award,
  Sparkles,
  Users,
  LogOut,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  ExternalLink,
  Bot,
  Copy,
  Clock,
  Radio,
  PlusCircle,
  Ticket,
  Lock,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Flame,
  CheckCircle2,
  User,
  Crown,
  Smartphone
} from 'lucide-react';
import { TradingViewChart } from './TradingViewChart';
import { AISentimentPanel } from './AISentimentPanel';
import { EconomicCalendarPanel } from './EconomicCalendarPanel';
import { NewsCalendar } from './dashboard/NewsCalendar';
import { HeaderTicker } from './layout/HeaderTicker';
import { AITraderChatbot } from './AITraderChatbot';
import { VipChat } from './dashboard/VipChat';
import { SignalFeed } from './dashboard/SignalFeed';
import { PostSignalModal } from './admin/PostSignalModal';
import { WaitlistModal } from './WaitlistModal';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { MobileSignalDrawer } from './MobileSignalDrawer';
import { soundManager } from '../utils/audio';
import { motion } from 'motion/react';

interface Props {
  user: UserProfile;
  tickers: MarketTicker[];
  signals: TradeSignal[];
  chatMessages: ChatMessage[];
  economicEvents: EconomicNewsItem[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onAddSignal: (sig: TradeSignal) => void;
  onCopySignalToAccount: (sig: TradeSignal) => void;
  onSendMessage: (text: string) => void;
  onLikeMessage: (id: string) => void;
  onLogout: () => void;
  onOpenBrokerModal: () => void;
  onOpenNewSignalModal: () => void;
  onOpenPromoModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onlineTraders: number;
}

export const ProtectedDashboard: React.FC<Props> = ({
  user,
  tickers,
  signals,
  chatMessages,
  economicEvents,
  selectedSymbol,
  onSelectSymbol,
  onAddSignal,
  onCopySignalToAccount,
  onSendMessage,
  onLikeMessage,
  onLogout,
  onOpenBrokerModal,
  onOpenNewSignalModal,
  onOpenPromoModal,
  isMuted,
  onToggleMute,
  onlineTraders
}) => {
  const [chatTab, setChatTab] = useState<'public' | 'vip'>('public');
  const [chatInput, setChatInput] = useState('');
  const [centerTab, setCenterTab] = useState<'ai_assistant' | 'community'>('ai_assistant');
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistServiceType, setWaitlistServiceType] = useState<'COPY_TRADING' | 'ALGO_BOT'>('COPY_TRADING');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chart');
  const [activeSignal, setActiveSignal] = useState<TradeSignal | null>(signals[0] || null);
  const [isAdminModeActive, setIsAdminModeActive] = useState<boolean>(
    user.role === 'ADMIN' || !!user.isAdmin
  );
  const [isPostSignalModalOpen, setIsPostSignalModalOpen] = useState(false);

  const isVIP = user.role === 'VIP' || user.role === 'ADMIN';
  const isAdmin = user.role === 'ADMIN' || !!user.isAdmin || isAdminModeActive;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (chatTab === 'vip' && !isVIP) {
      onOpenPromoModal();
      return;
    }
    soundManager.playClick();
    onSendMessage(chatInput);
    setChatInput('');
  };

  const renderSignalCard = (sig: TradeSignal, idx: number) => {
    const isLockedForFree = !isVIP && idx > 0;
    const isBuy = sig.type === 'BUY';
    const isSelected = activeSignal?.id === sig.id;

    const handleSelectSignal = () => {
      if (isLockedForFree) {
        onOpenPromoModal();
        return;
      }
      soundManager.playClick();
      setActiveSignal(sig);
      onSelectSymbol(sig.symbol);
      const chartElem = document.getElementById('chart-station');
      if (chartElem) {
        chartElem.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileTab('chart');
    };

    return (
      <div
        key={sig.id}
        onClick={handleSelectSignal}
        className={`border rounded-xl p-4 transition-all duration-200 relative overflow-hidden cursor-pointer ${
          isLockedForFree
            ? 'bg-[#161f30] border-slate-800/60 select-none opacity-85'
            : isSelected
            ? 'bg-[#142033] border-cyan-500 shadow-[0_0_25px_rgba(0,229,255,0.25)] ring-1 ring-cyan-500/50'
            : 'bg-[#161f30] border-slate-800 hover:border-cyan-500/50 hover:shadow-xl hover:scale-[1.005]'
        }`}
      >
        {/* Lock Blur Overlay for Free Users */}
        {isLockedForFree && (
          <div className="absolute inset-0 bg-[#0b0f17]/85 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center p-4 text-center">
            <Lock className="w-6 h-6 text-amber-400 mb-1.5" />
            <span className="text-xs font-black text-slate-100 mb-0.5">
              هذه الإشارة اللحظية متاحة حصرياً لأعضاء VIP
            </span>
            <p className="text-[11px] text-slate-400 max-w-sm mb-2.5">
              أدخل الرمز الترويجي الخاص بك لفتح البث اللحظي ونقاط الدخول والأهداف فور صدورها.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPromoModal();
              }}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>فتح الإشارة برمز ترويجي</span>
            </button>
          </div>
        )}

        {/* Top card row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-black text-xs font-mono tracking-wider ${
                isBuy
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {isBuy ? 'شراء BUY' : 'بيع SELL'}
            </span>

            <span className="font-extrabold text-base text-slate-100 font-mono">
              {sig.symbol}
            </span>

            <span className="text-xs text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              {sig.timeframe}
            </span>

            {isSelected && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-1 animate-pulse font-sans">
                <Target className="w-3 h-3 text-cyan-400" />
                <span>معروضة على الشارت 🎯</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 text-[11px] font-mono">{sig.createdAt}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {sig.status === 'ACTIVE' ? 'نشطة وقيد المتابعة' : 'حققت الهدف ✓'}
            </span>
          </div>
        </div>

        {/* Key Price Levels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[#0c121d] border border-slate-800/80 mb-3 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">
              نقطة الدخول (Entry):
            </span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {sig.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 block mb-0.5 font-sans">
              الهدف الأول (TP1):
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {sig.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-cyan-400 block mb-0.5 font-sans">
              الهدف الثاني (TP2):
            </span>
            <span className="text-sm font-bold text-cyan-300 tabular-nums">
              {sig.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-rose-400 block mb-0.5 font-sans">
              وقف الخسارة (SL):
            </span>
            <span className="text-sm font-bold text-rose-400 tabular-nums">
              {sig.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Notes & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-slate-300 text-xs flex-1 leading-relaxed">
            {sig.notesAr}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono font-bold">
              +{sig.pips} Pip
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSignal();
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'bg-[#0d1424] hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isSelected ? 'أهداف الشارت نشطة' : 'عرض على الشارت 🎯'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopySignalToAccount(sig);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              نسخ الصفقة
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* 1. TOP DASHBOARD TICKER: Official TradingView Real-Time Ticker Tape Widget (Obsidian Charcoal + Gold) */}
      <HeaderTicker onSelectSymbol={onSelectSymbol} />

      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        {/* Economic News Live Marquee Ribbon */}
        <div className="bg-[#0a0f18] py-1 px-4 border-b border-slate-800/70 text-[11px] text-slate-300 flex items-center gap-3 overflow-hidden">
          <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>عاجل الأجندة:</span>
          </span>
          <div className="overflow-x-auto whitespace-nowrap no-scrollbar flex items-center gap-8 text-slate-300 font-medium">
            <span>🔴 غداً 15:30 توقيت مكة: مؤشر أسعار المستهلكين الأمريكي (CPI) المتوقع 3.2%</span>
            <span>•</span>
            <span>⚡ توقعات تثبيت الفائدة الفيدرالية عند 5.25% مع ضغط تضخمي متوازن</span>
            <span>•</span>
            <span>📈 مؤشر مديري المشتريات التصنيعي ISM يسجل 48.9 نقطة</span>
            <span>•</span>
            <span>💎 الذهب يتماسك فوق مستويات الدعم المحورية 2,680 دولار للأونصة</span>
          </div>
        </div>

        {/* User bar & Actions */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
                <span className="font-black text-cyan-400 font-mono text-sm">MBK</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-100 text-sm font-mono tracking-wide">
                  MBK TRADING
                </h1>
                {isVIP ? (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>عضوية VIP مفعلة 👑</span>
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                    حساب مجاني (Standard Free)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                مرحباً بك، {user.name} ({user.email})
              </p>
            </div>
          </div>

          {/* Quick Shortcuts & Profile Menu */}
          <div className="flex items-center gap-2.5">
            {/* Admin Toggle & Gold Post Signal Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                setIsAdminModeActive(!isAdminModeActive);
              }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="تبديل وضع إدارة ونشر التوصيات"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAdmin ? 'وضع المحلل: مفعّل 👑' : 'وضع المحلل'}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsPostSignalModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/25 hover:scale-105 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                <span>+ إضافة توصية جديدة</span>
              </button>
            )}

            {/* Promo code button if Free */}
            {!isVIP && (
              <button
                onClick={onOpenPromoModal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>تفعيل VIP برمز ترويجي</span>
              </button>
            )}

            {/* Telegram Link */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>تيليجرام MBK</span>
            </a>

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'تفعيل تنبيهات الصوت' : 'كتم الصوت'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-500/40 transition-all text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 p-2 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6"
      >
        {/* DESKTOP LAYOUT (Visible on md: and larger screens) */}
        <div className="hidden md:block space-y-6">
          {/* Subtle Gold-Glowing Dashboard Banner (For FREE users) */}
        {!isVIP && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#161f30] to-amber-500/10 border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-wrap items-center justify-between gap-4 text-xs transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/50 shadow-md shadow-amber-500/20">
                <Ticket className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-black text-amber-200 text-sm sm:text-base block mb-0.5">
                  تريد فتح جميع التوصيات والتحليلات المباشرة؟ أدخل رمز VIP الخاص بك هنا
                </span>
                <span className="text-slate-300 text-xs">
                  الرموز المعتمدة: MBK2026 • VIP2026 • TELEGRAMVIP • IBPARTNER — تفعيل فوري يفك قفل الإشارات المحجوبة وغرفة VIP بدون إعادة تحميل
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPromoModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 cursor-pointer transform hover:scale-105 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>تفعيل VIP بالرمز الآن</span>
              </button>
              <button
                onClick={onOpenBrokerModal}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                شراكة الوسيط
              </button>
            </div>
          </div>
        )}

        {/* 2. CENTRAL CHART WINDOW */}
        <div id="chart-station">
          <TradingViewChart
            symbol={selectedSymbol}
            onSymbolChange={onSelectSymbol}
            tickers={tickers}
            activeSignal={activeSignal}
            onClearSignal={() => setActiveSignal(null)}
          />
        </div>

        {/* 3. DUAL-TAB SIGNAL FEED (Engine Alerts & Analyst Signals + Admin Publisher) */}
        <div id="signals-station">
          <SignalFeed
            currentUser={user}
            onSelectSignal={(sig) => {
              soundManager.playClick();
              setActiveSignal(sig);
              onSelectSymbol(sig.symbol);
              const chartElem = document.getElementById('chart-station');
              if (chartElem) {
                chartElem.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            onCopySignal={onCopySignalToAccount}
            onOpenPromoModal={onOpenPromoModal}
            onOpenPostModal={() => setIsPostSignalModalOpen(true)}
            activeSignalId={activeSignal?.id}
            isAdminModeActive={isAdmin}
            onToggleAdminMode={() => setIsAdminModeActive(!isAdminModeActive)}
            tickers={tickers}
          />
        </div>

        {/* 4. AI MARKET SENTIMENT & ECONOMIC CALENDAR GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* AI Session Sentiment Widget */}
          <div>
            <AISentimentPanel />
          </div>

          {/* Official TradingView Economic Calendar & Market News Widget */}
          <div>
            <NewsCalendar />
          </div>
        </div>

        {/* 5. INTERACTIVE TRADING SERVICES: MBK SMART AI AGENT OR COMMUNITY CHAT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-[#141b29] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setCenterTab('ai_assistant');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  centerTab === 'ai_assistant'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>MBK Smart AI Agent (Gemini 3.8 Flash 🤖)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-950 font-bold">
                  SMC Institutional Core
                </span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setCenterTab('community');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  centerTab === 'community'
                    ? 'bg-slate-800 text-cyan-400 shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>غرفة نقاش مجتمع المتداولين (Community Chat)</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 hidden sm:inline font-mono">
              MBK AI Core • Gemini 3.8 Flash + SMC Institutional Directive
            </span>
          </div>

          {centerTab === 'ai_assistant' ? (
            <AITraderChatbot
              activeSymbol={selectedSymbol}
              currentPrice={tickers.find((t) => t.symbol === selectedSymbol)?.price}
              tickers={tickers}
              onSelectSymbol={onSelectSymbol}
            />
          ) : (
            <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
              {/* Chat Tabs: Public vs VIP Real-Time */}
              <div className="p-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">غرفة نقاش مجتمع MBK</h3>
                </div>

                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setChatTab('public')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      chatTab === 'public'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    غرفة النقاش العامة (Public)
                  </button>

                  <button
                    onClick={() => setChatTab('vip')}
                    className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      chatTab === 'vip'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    {!isVIP && <Lock className="w-3 h-3" />}
                    <span>تحليلات VIP الحية (Firestore Real-Time)</span>
                  </button>
                </div>
              </div>

              {chatTab === 'vip' ? (
                <VipChat
                  currentUser={user}
                  onOpenPromoModal={onOpenPromoModal}
                  className="flex-1 border-0 rounded-none shadow-none h-full"
                />
              ) : (
                <>
                  {/* Public Chat Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b0f17]">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-xl bg-[#141b29] border border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{msg.sender.name}</span>
                            <span className="text-[10px] text-cyan-400 font-mono">{msg.sender.roleAr}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Public Chat Input */}
                  <form
                    onSubmit={handleSendChat}
                    className="p-3 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="شارك برأيك أو استفسارك الفني مع المجتمع..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      إرسال
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* 6. FUTURE SERVICES TEASER CARDS WITH EARLY ACCESS WAITLIST */}
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100">
                الخدمات المؤسسية المستقبلية (المرحلة الثانية)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                أنظمة تداول متقدمة تحت التطوير — انضم لقائمة الانتظار لحجز مقعدك وأولوية الربط
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20 font-bold">
              ROADMAP • المرحلة الثانية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Future Feature 1: Copy Trading */}
            <div className="p-4 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-200">
                      نسخ الصفقات الآلي (Copy Trading)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      قريباً — المرحلة الثانية ⏳
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    ربط حساب تداول العميل بنظام التنفيذ المؤسسي مباشرة لنسخ صفقات فريق أبحاث MBK بمضاعف حجم ومخاطر مخصص مع حماية كاملة للمحفظة.
                  </p>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setWaitlistServiceType('COPY_TRADING');
                      setWaitlistModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/30 to-sky-600/30 hover:from-cyan-600/50 hover:to-sky-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>انضم لقائمة الانتظار المبكرة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Future Feature 2: Auto Execution Bot */}
            <div className="p-4 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-200">
                      البوت الآلي (Auto Execution Bot)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      قريباً — المرحلة الثانية ⏳
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    روبوت تداول آلي على خوادم ميتاتريدر 5 (MT5 Bridge) ينفذ إشارات MBK فورياً بدقة متناهية دون تدخل بشري وبأقل انزلاق سعري.
                  </p>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setWaitlistServiceType('ALGO_BOT');
                      setWaitlistModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>انضم لقائمة الانتظار المبكرة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* End of DESKTOP LAYOUT */}
        </div>

        {/* MOBILE LAYOUT (Visible on screens < md, switched via MobileBottomNav) */}
        <div className="block md:hidden pb-24 space-y-3">
          {/* TAB 1: CHART & LIVE DRAWER */}
          {mobileTab === 'chart' && (
            <div className="space-y-3">
              {/* Compact Promo Banner for Free Users */}
              {!isVIP && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-[#161f30] to-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-200">
                      افتح إشارات VIP والتحليلات اللحظية الكاملة
                    </span>
                  </div>
                  <button
                    onClick={onOpenPromoModal}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                  >
                    رمز VIP
                  </button>
                </div>
              )}

              {/* Main Full-Height Mobile Chart with horizontal swipe navigation */}
              <TradingViewChart
                symbol={selectedSymbol}
                onSymbolChange={onSelectSymbol}
                tickers={tickers}
                fullHeightOnMobile={true}
                activeSignal={activeSignal}
                onClearSignal={() => setActiveSignal(null)}
              />

              {/* Mobile Signal Drawer: Collapsible sheet underneath chart */}
              <MobileSignalDrawer
                signals={signals}
                isVip={isVIP}
                onOpenPromoModal={onOpenPromoModal}
                onSelectSignal={(sig) => {
                  soundManager.playClick();
                  setActiveSignal(sig);
                  onSelectSymbol(sig.symbol);
                }}
              />
            </div>
          )}

          {/* TAB 2: LIVE DUAL-TAB SIGNALS FEED */}
          {mobileTab === 'signals' && (
            <div className="space-y-3">
              <SignalFeed
                currentUser={user}
                onSelectSignal={(sig) => {
                  soundManager.playClick();
                  setActiveSignal(sig);
                  onSelectSymbol(sig.symbol);
                  setMobileTab('chart');
                }}
                onCopySignal={onCopySignalToAccount}
                onOpenPromoModal={onOpenPromoModal}
                onOpenPostModal={() => setIsPostSignalModalOpen(true)}
                activeSignalId={activeSignal?.id}
                isAdminModeActive={isAdmin}
                onToggleAdminMode={() => setIsAdminModeActive(!isAdminModeActive)}
                tickers={tickers}
              />
            </div>
          )}

          {/* TAB 3: AI SENTIMENT & ASSISTANT */}
          {mobileTab === 'ai' && (
            <div className="space-y-4">
              <AISentimentPanel />
              <AITraderChatbot
                activeSymbol={selectedSymbol}
                currentPrice={tickers.find((t) => t.symbol === selectedSymbol)?.price}
                tickers={tickers}
                onSelectSymbol={onSelectSymbol}
              />
            </div>
          )}

          {/* TAB 4: VIP COMMUNITY CHAT */}
          {mobileTab === 'chat' && (
            <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-175px)]">
              <div className="p-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-100">غرفة VIP المباشرة (Firestore)</span>
                </div>
                {isVIP ? (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                    VIP PRO
                  </span>
                ) : (
                  <button
                    onClick={onOpenPromoModal}
                    className="text-[10px] font-black text-slate-950 bg-amber-500 hover:bg-amber-400 px-2.5 py-0.5 rounded shadow cursor-pointer"
                  >
                    ترقية بالرمز
                  </button>
                )}
              </div>
              <VipChat
                currentUser={user}
                onOpenPromoModal={onOpenPromoModal}
                className="flex-1 border-0 rounded-none shadow-none h-full"
              />
            </div>
          )}

          {/* TAB 5: PROFILE & ACCOUNT SETTINGS */}
          {mobileTab === 'profile' && (
            <div className="space-y-3">
              {/* User Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121929] to-[#0d131f] border border-slate-800 shadow-xl text-center space-y-3">
                <div className="relative inline-block">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-18 h-18 rounded-full border-2 border-cyan-500/50 object-cover mx-auto shadow-lg shadow-cyan-500/10"
                  />
                  <span className={`absolute bottom-0 right-0 p-1.5 rounded-full ${isVIP ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'} border border-slate-900`}>
                    {isVIP ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-100">{user.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-black font-mono flex items-center gap-1.5 ${
                    isVIP
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {isVIP ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{isVIP ? 'عضو VIP معتمد' : 'حساب مجاني (Standard Free)'}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!isVIP && (
                  <button
                    onClick={onOpenPromoModal}
                    className="w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4" />
                      <div className="text-right">
                        <span className="block font-bold">ترقية الحساب لـ VIP مجاناً</span>
                        <span className="text-[10px] opacity-80">أدخل رمز VIP لفك قفل جميع الخدمات</span>
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onOpenBrokerModal}
                  className="w-full p-3 rounded-xl bg-[#131b2b] hover:bg-[#182337] border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>شراكة وتفعيل الوسطاء (Forex.com / IB)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={onToggleMute}
                  className="w-full p-3 rounded-xl bg-[#131b2b] hover:bg-[#182337] border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    <span>التنبيهات الصوتية للإشارات</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isMuted ? 'مكتوم' : 'مفعل'}
                  </span>
                </button>

                {/* System Connection Info */}
                <div className="p-3 rounded-xl bg-[#0c121e] border border-slate-800/80 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تطبيق MBK (PWA)</span>
                    </span>
                    <span className="text-emerald-400 font-bold">جاهز للتثبيت 📲</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span>خادم التسعير اللحظي:</span>
                    <span className="text-slate-200">Equinix LD4 (0.9ms)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 font-mono">
                    <span>المتداولون المتصلون:</span>
                    <span className="text-cyan-400 font-bold">{onlineTraders} متداول</span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="w-full p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        activeTab={mobileTab}
        onChangeTab={setMobileTab}
        isVip={isVIP}
        signalsCount={signals.length}
      />

      {/* Early Access Waitlist Modal */}
      <WaitlistModal
        isOpen={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        serviceType={waitlistServiceType}
        currentUser={user}
      />

      {/* Admin Manual Signal Publishing Modal */}
      <PostSignalModal
        isOpen={isPostSignalModalOpen}
        onClose={() => setIsPostSignalModalOpen(false)}
        tickers={tickers}
        currentUser={user}
        onSignalPublished={() => {
          soundManager.playSuccess();
        }}
      />

      {/* DASHBOARD FOOTER (Desktop only so it doesn't collide with mobile bottom nav) */}
      <footer className="hidden md:block py-6 bg-[#070b12] border-t border-slate-800 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <span>منصة MBKtrading المؤسسية • أبحاث وتحليلات فريق MBK</span>
          <span className="font-mono text-slate-400">Server Latency: 0.9ms (Equinix LD4)</span>
        </div>
      </footer>
    </div>
  );
};
