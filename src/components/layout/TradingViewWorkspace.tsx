import React, { useState, useEffect } from 'react';
import {
  Radio,
  MessageSquare,
  Newspaper,
  Bot,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Crown,
  Volume2,
  VolumeX,
  Globe,
  LogOut,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  BarChart3,
  Flame,
  Activity,
  Headphones,
  Calculator,
  Clock,
  Gift
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { UserProfile, MarketSymbol, MarketTicker } from '../../types/trading';

// Modules
import { HeaderTicker } from './HeaderTicker';
import { LiveNewsTicker } from './LiveNewsTicker';
import { SignalsChannelHub } from '../signals/SignalsChannelHub';
import { PublicTradingChat } from '../community/PublicTradingChat';
import { TradingViewAIPanel } from '../ai/TradingViewAIPanel';
import { TradingViewChart } from '../TradingViewChart';
import { DailyTradesPanel } from '../signals/DailyTradesPanel';

// Utility Modals
import { SupportDeskModal } from '../modals/SupportDeskModal';
import { RiskCalculatorModal } from '../modals/RiskCalculatorModal';
import { MarketSessionsModal } from '../modals/MarketSessionsModal';

export type WorkspaceView = 'signals' | 'chat' | 'news' | 'ai' | 'chart';

interface Props {
  user: UserProfile;
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  onOpenBrokerModal: () => void;
  onOpenPromoModal: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: () => void;
}

export const TradingViewWorkspace: React.FC<Props> = ({
  user,
  tickers,
  selectedSymbol,
  onSelectSymbol,
  isMuted,
  onToggleMute,
  onLogout,
  onBackToHome,
  onOpenBrokerModal,
  onOpenPromoModal,
  lang = 'ar',
  onToggleLang
}) => {
  const [activeView, setActiveView] = useState<WorkspaceView>('signals');
  // Permanent sidebar: always visible, can be shrinked to chosen topic (trades or chat) to save space
  const [isSidebarShrinked, setIsSidebarShrinked] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_sidebar_shrinked') === 'true';
  });
  const [sideDrawerView, setSideDrawerView] = useState<'trades' | 'chat' | 'ai'>(() => {
    const saved = localStorage.getItem('mbk_tv_sidebar_view');
    if (saved === 'trades' || saved === 'chat' || saved === 'ai') return saved;
    return 'trades';
  });

  const handleToggleShrink = () => {
    soundManager.playClick();
    setIsSidebarShrinked(prev => {
      const next = !prev;
      localStorage.setItem('mbk_tv_sidebar_shrinked', String(next));
      return next;
    });
  };

  // Window width tracking for flexible responsiveness
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Flexible resizable sidebar width state (persisted)
  const [customSidebarWidth, setCustomSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mbk_tv_sidebar_custom_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 600) return parsed;
      }
    } catch {
      // ignore
    }
    return 360;
  });

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Trader Utility Modals State (Contact Support, Risk Calculator, Market Sessions)
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);

  // Window resize listener
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Drag handler to flexibly resize platform border between main and sidebar
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    soundManager.playClick();
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMove = (clientX: number) => {
      // In RTL (Arabic), sidebar is on physical left (clientX from left edge).
      // In LTR, sidebar is on physical right (windowWidth - clientX).
      const isRtl = lang === 'ar';
      const calculatedWidth = isRtl ? clientX : window.innerWidth - clientX;

      const minW = windowWidth < 640 ? 160 : 220;
      const maxAllowed = windowWidth < 640
        ? Math.max(minW, windowWidth - 46)
        : Math.max(minW, windowWidth - 80);

      const clamped = Math.max(minW, Math.min(calculatedWidth, Math.min(560, maxAllowed)));
      setCustomSidebarWidth(clamped);

      if (isSidebarShrinked) {
        setIsSidebarShrinked(false);
        localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
      }
      localStorage.setItem('mbk_tv_sidebar_custom_width', String(clamped));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };

    const onEnd = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isResizingSidebar, lang, windowWidth, isSidebarShrinked]);

  // Flexible width calculation for right sidebar
  const getSidebarWidthStyle = (): React.CSSProperties => {
    if (isSidebarShrinked) {
      if (windowWidth < 640) {
        return { width: '44px', minWidth: '44px', maxWidth: '44px' };
      }
      return { width: '220px', minWidth: '200px', maxWidth: '240px' };
    }
    // Expanded mode:
    const maxAllowed = windowWidth < 640
      ? Math.max(160, windowWidth - 46)
      : Math.max(240, windowWidth - 90);
    const targetWidth = Math.min(customSidebarWidth, maxAllowed);

    return {
      width: `${targetWidth}px`,
      minWidth: windowWidth < 640 ? '160px' : '220px',
      maxWidth: `${maxAllowed}px`
    };
  };

  const handleSelectTopic = (topic: 'trades' | 'chat' | 'ai') => {
    soundManager.playClick();
    setSideDrawerView(topic);
    localStorage.setItem('mbk_tv_sidebar_view', topic);
  };

  const isAr = lang === 'ar';
  const isVIP = user.role === 'VIP' || user.role === 'ADMIN';

  // Find active ticker
  const activeTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];

  const navItems = [
    {
      id: 'signals' as WorkspaceView,
      labelAr: 'قنوات التوصيات',
      labelEn: 'Signals Hub',
      shortAr: 'الإشارات',
      shortEn: 'Signals',
      icon: Radio,
      badge: 'LIVE'
    },
    {
      id: 'chart' as WorkspaceView,
      labelAr: 'الرسم البياني',
      labelEn: 'Live Chart',
      shortAr: 'الشارت',
      shortEn: 'Chart',
      icon: BarChart2
    },
    {
      id: 'chat' as WorkspaceView,
      labelAr: 'نقاش المتداولين',
      labelEn: 'Community Chat',
      shortAr: 'النقاش',
      shortEn: 'Chat',
      icon: MessageSquare,
      badge: 'NEW'
    },
    {
      id: 'ai' as WorkspaceView,
      labelAr: 'المستشار الذكي',
      labelEn: 'AI Analyst',
      shortAr: 'الذكاء',
      shortEn: 'AI',
      icon: Bot,
      badge: isVIP ? 'VIP' : 'AI'
    },
    {
      id: 'news' as WorkspaceView,
      labelAr: 'الأخبار الاقتصادية',
      labelEn: 'Financial News',
      shortAr: 'الأخبار',
      shortEn: 'News',
      icon: Newspaper
    }
  ];

  return (
    <div
      className="h-screen h-[100dvh] max-h-[100dvh] w-full max-w-full bg-[#131722] text-[#d1d4dc] flex flex-col font-sans select-none overflow-hidden antialiased"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP HEADER (CLEAN TRADINGVIEW TOOLBAR - FLEXIBLE ON ALL SCREEN SIZES) */}
      <header className="h-12 sm:h-13 bg-[#1e222d] border-b border-[#2a2e39] px-2 sm:px-4 flex items-center justify-between shrink-0 z-40 gap-1.5 sm:gap-2">
        {/* Left: Brand + Active Symbol Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-[#131722] font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-sm">
              MBK
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <span className="font-bold text-white text-xs sm:text-sm tracking-wide">MBK DESK</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-[#131722] text-[#089981] border border-[#089981]/30">
                  v4.0
                </span>
              </div>
            </div>
          </div>

          {/* Quick Symbol Switcher Pill (Visible & Flexible on All Devices) */}
          <div className="flex items-center gap-0.5 bg-[#131722] p-0.5 rounded-lg border border-[#2a2e39] font-mono text-[10px] sm:text-xs overflow-x-auto scrollbar-none max-w-[125px] xs:max-w-[160px] sm:max-w-none shrink">
            {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  soundManager.playClick();
                  onSelectSymbol(sym);
                }}
                className={`px-1 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs transition-all cursor-pointer font-bold shrink-0 ${
                  selectedSymbol === sym
                    ? 'bg-white text-[#131722] shadow-sm'
                    : 'text-[#787b86] hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Right: User Status, VIP Action, Audio, Lang, Sidebar Toggle, Logout (Always visible & shrink-0) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Active User Badge */}
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-[#131722] border border-[#2a2e39] text-[10px] sm:text-xs">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#2a2e39] text-white flex items-center justify-center font-bold text-[9px] sm:text-[10px] uppercase shrink-0">
              {user.name ? user.name[0] : 'U'}
            </div>
            <span className="font-semibold text-white truncate max-w-[45px] xs:max-w-[70px] sm:max-w-[110px] text-[10px] sm:text-xs hidden xxs:inline">
              {user.name || user.email.split('@')[0]}
            </span>
            {isVIP ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 font-mono flex items-center gap-0.5 shrink-0">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden xs:inline">VIP</span>
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] text-[#787b86] font-mono shrink-0 hidden xs:inline">FREE</span>
            )}
          </div>

          {!isVIP && (
            <button
              onClick={onOpenPromoModal}
              className="px-1.5 sm:px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] sm:text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer hover:brightness-110 shrink-0"
              title={isAr ? 'ترقية VIP' : 'Upgrade VIP'}
            >
              <Crown className="w-3 h-3 text-black" />
              <span className="hidden sm:inline">{isAr ? 'ترقية VIP' : 'Upgrade VIP'}</span>
            </button>
          )}

          {/* Sound Mute */}
          <button
            onClick={onToggleMute}
            className="p-1 sm:p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#f23645]" /> : <Volume2 className="w-3.5 h-3.5 text-[#089981]" />}
          </button>

          {/* Lang Toggle */}
          {onToggleLang && (
            <button
              onClick={onToggleLang}
              className="px-1.5 py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[10px] sm:text-xs font-mono font-bold text-white transition-colors cursor-pointer shrink-0"
              title={isAr ? 'English' : 'عربي'}
            >
              {isAr ? 'EN' : 'عربي'}
            </button>
          )}

          {/* Permanent Sidebar Shrink / Expand Toggle (Always visible & flexible) */}
          <button
            onClick={handleToggleShrink}
            className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0 ${
              !isSidebarShrinked
                ? 'bg-[#131722] border-[#089981]/40 text-[#089981]'
                : 'bg-[#131722] hover:bg-[#2a2e39] border-[#2a2e39] text-[#787b86] hover:text-white'
            }`}
            title={
              isAr
                ? (!isSidebarShrinked ? 'تصغير اللوحة لتوفير مساحة للشارت' : 'توسيع اللوحة الجانبية')
                : (!isSidebarShrinked ? 'Shrink panel' : 'Expand panel')
            }
          >
            {!isSidebarShrinked ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#787b86]" />
                <span className="hidden xl:inline text-[11px] text-[#787b86]">{isAr ? 'تصغير' : 'Shrink'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#089981]" />
                <span className="hidden xl:inline text-[11px] text-[#089981] font-bold">{isAr ? 'توسيع' : 'Expand'}</span>
              </>
            )}
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-1 sm:p-1.5 rounded-lg bg-[#131722] hover:bg-[#f23645]/20 border border-[#2a2e39] text-[#787b86] hover:text-[#f23645] transition-colors cursor-pointer shrink-0"
            title={isAr ? 'تسجيل الخروج' : 'Logout'}
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* 2. LIVE PRICE TICKER + REAL RSS FINANCIAL NEWS UNDER PRICES */}
      <HeaderTicker tickers={tickers} onSelectSymbol={onSelectSymbol} lang={lang} />
      <LiveNewsTicker lang={lang} />

      {/* 3. MAIN WORKSPACE CANVAS (DESKTOP ICON RAIL + MAIN AREA + COLLAPSIBLE DRAWER) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VERTICAL ICON RAIL (ACTIVE ACROSS ALL SCREEN SIZES INCLUDING MOBILE) */}
        <aside className="flex w-11 sm:w-12 md:w-14 bg-[#1e222d] border-e border-[#2a2e39] flex-col items-center justify-between py-2 sm:py-3 shrink-0 z-30 select-none overflow-y-auto scrollbar-none">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundManager.playClick();
                    setActiveView(item.id);
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center relative transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-white text-[#131722] shadow-md font-bold'
                      : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                  }`}
                  title={isAr ? item.labelAr : item.labelEn}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-4 sm:h-5 rounded-e-full bg-[#089981]" />
                  )}

                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute start-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0d1017] border border-[#2a2e39] text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                    {isAr ? item.labelAr : item.labelEn}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Target of CSS Selector: aside:nth-of-type(1) > div:nth-of-type(2) */}
          {/* Quick Trader Tools: 24/7 Support Desk, Risk Calculator, Market Sessions, Partner Broker */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-[#2a2e39] w-full">
            {/* 1. Contact Support & Help Desk (WhatsApp / Telegram / Tickets) */}
            <button
              onClick={() => {
                soundManager.playClick();
                setSupportModalOpen(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer relative group text-[#089981] hover:bg-[#089981]/15 hover:text-white"
              title={isAr ? 'الدعم الفني والمساعدة 24/7' : '24/7 Live Support'}
            >
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981] absolute top-1 end-1" />
              <div className="hidden group-hover:block absolute start-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0d1017] border border-[#2a2e39] text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                {isAr ? 'الدعم الفني والمساعدة 24/7' : '24/7 Concierge Support'}
              </div>
            </button>

            {/* 2. Position Size & Risk Calculator */}
            <button
              onClick={() => {
                soundManager.playClick();
                setCalculatorModalOpen(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer relative group text-blue-400 hover:bg-blue-500/15 hover:text-white"
              title={isAr ? 'حاسبة اللوت وإدارة المخاطر' : 'Position Size & Risk Calculator'}
            >
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="hidden group-hover:block absolute start-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0d1017] border border-[#2a2e39] text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                {isAr ? 'حاسبة إدارة المخاطر واللوت' : 'Risk & Lot Calculator'}
              </div>
            </button>

            {/* 3. Global Market Sessions & Operating Hours */}
            <button
              onClick={() => {
                soundManager.playClick();
                setSessionsModalOpen(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer relative group text-amber-400 hover:bg-amber-500/15 hover:text-white"
              title={isAr ? 'جلسات التداول العالمية وساعات السوق' : 'Market Sessions Clock'}
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="hidden group-hover:block absolute start-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0d1017] border border-[#2a2e39] text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                {isAr ? 'جلسات التداول العالمية (لندن/نيويورك)' : 'Market Sessions & Times'}
              </div>
            </button>

            {/* 4. Partner Broker Bonus & Free VIP */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenBrokerModal();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer relative group text-purple-400 hover:bg-purple-500/15 hover:text-white"
              title={isAr ? 'الوسيط الشريك وبونص VIP' : 'Partner Broker Bonus & VIP'}
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="hidden group-hover:block absolute start-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#0d1017] border border-[#2a2e39] text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none">
                {isAr ? 'الوسيط الشريك وبونص VIP' : 'Partner Broker Bonus'}
              </div>
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto bg-[#131722] p-2 sm:p-4 md:p-5 pb-4 min-w-0">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* VIEW 1: SIGNALS CHANNEL HUB (Free + VIP + Webhook Bot) */}
            {activeView === 'signals' && (
              <SignalsChannelHub
                isVIP={isVIP}
                userRole={user.role}
                tickers={tickers}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={onSelectSymbol}
                onOpenPromoModal={onOpenPromoModal}
                onOpenBrokerModal={onOpenBrokerModal}
                lang={lang}
              />
            )}

            {/* VIEW 2: TRADINGVIEW LIVE CHART VIEW */}
            {activeView === 'chart' && (
              <div className="space-y-3">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-[#089981]" />
                    <h2 className="text-sm font-bold text-white">
                      {isAr ? 'الرسم البياني المؤسسي المباشر' : 'Live Institutional Chart'}
                    </h2>
                    <span className="font-mono text-xs text-[#089981] font-bold">
                      {selectedSymbol} @ {activeTicker?.price}
                    </span>
                  </div>
                  <div className="text-xs text-[#787b86]">
                    {isAr ? 'مؤشرات MBK Scalp Breakout & Alligator FVG متوافقة لحظياً' : 'Real-time TradingView feed'}
                  </div>
                </div>

                <div className="h-[580px] w-full rounded-xl overflow-hidden border border-[#2a2e39] shadow-xl">
                  <TradingViewChart
                    symbol={selectedSymbol}
                    onSymbolChange={onSelectSymbol}
                    tickers={tickers}
                  />
                </div>
              </div>
            )}

            {/* VIEW 3: UNIFIED PUBLIC DISCUSSION ROOM */}
            {activeView === 'chat' && (
              <PublicTradingChat
                currentUserName={user.name || user.email.split('@')[0]}
                isVIP={isVIP}
                userRole={user.role}
                isAdmin={user.role === 'ADMIN' || user.isAdmin}
                lang={lang}
              />
            )}

            {/* VIEW 4: AI MARKET ANALYST FULL VIEW */}
            {activeView === 'ai' && (
              <TradingViewAIPanel
                isVIP={isVIP}
                activeSymbol={selectedSymbol}
                currentPrice={activeTicker?.price || 20850}
                onOpenPromoModal={onOpenPromoModal}
                lang={lang}
              />
            )}

            {/* VIEW 5: EXPANDED NEWS WIRES */}
            {activeView === 'news' && (
              <div className="space-y-4">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-[#089981]" />
                    <h2 className="text-sm font-bold text-white">
                      {isAr ? 'وكالة الأخبار الاقتصادية اللحظية (RSS Live Wire)' : 'Real Financial RSS News Wire'}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-[#089981]">ForexLive • Yahoo Finance</span>
                </div>

                <LiveNewsTicker lang={lang} />
              </div>
            )}
          </div>
        </main>

        {/* FLEXIBLE RESIZABLE BORDER DIVIDER (Platform border resize handle) */}
        <div
          onMouseDown={handleStartResize}
          onTouchStart={handleStartResize}
          className={`w-1.5 -mx-0.5 hover:w-2 transition-all cursor-col-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${
            isResizingSidebar ? 'bg-[#089981] w-2 shadow-[0_0_10px_#089981]' : 'bg-[#2a2e39]/60 hover:bg-[#089981]'
          }`}
          title={isAr ? 'اسحب لتعديل عرض اللوحة بمرونة' : 'Drag to flexibly adjust platform border'}
        >
          <div className="w-0.5 h-10 sm:h-14 rounded-full bg-[#787b86]/60 group-hover:bg-white transition-colors" />
        </div>

        {/* 4. PERMANENT RIGHT SIDEBAR (FLEXIBLE ON ALL SCREEN SIZES) */}
        <aside
          style={getSidebarWidthStyle()}
          className="flex flex-col h-full shrink-0 z-30 bg-[#1e222d] border-s border-[#2a2e39] select-none overflow-hidden transition-[width] duration-150 shadow-2xl"
        >
          {/* div 1: Header with Topic Switcher + Shrink/Expand Toggle */}
          <div className="p-1 sm:p-2.5 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]/95 shrink-0 gap-1 overflow-hidden">
            {/* When shrinked on small mobile (< sm): center the expand icon */}
            {isSidebarShrinked ? (
              <>
                <div className="sm:hidden flex items-center justify-center w-full py-1">
                  <button
                    onClick={handleToggleShrink}
                    className="p-1.5 rounded-lg bg-[#089981]/20 text-[#089981] hover:bg-[#089981]/30 transition-all cursor-pointer flex items-center justify-center"
                    title={isAr ? 'توسيع اللوحة' : 'Expand panel'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                {/* On sm+ screens when shrinked, show the compact switcher */}
                <div className="hidden sm:flex items-center gap-1 bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] min-w-0 overflow-x-auto scrollbar-none">
                  {/* Daily Trades Tab */}
                  <button
                    onClick={() => handleSelectTopic('trades')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      sideDrawerView === 'trades'
                        ? 'bg-white text-[#131722] shadow-sm'
                        : 'text-[#787b86] hover:text-white'
                    }`}
                    title={isAr ? 'صفقات اليوم' : 'Daily Trades'}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#089981]" />
                    <span className="text-[11px]">{isAr ? 'صفقات' : 'Trades'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                  </button>

                  {/* Community Chat Tab */}
                  <button
                    onClick={() => handleSelectTopic('chat')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      sideDrawerView === 'chat'
                        ? 'bg-white text-[#131722] shadow-sm'
                        : 'text-[#787b86] hover:text-white'
                    }`}
                    title={isAr ? 'الشات العام' : 'Community Chat'}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px]">{isAr ? 'الشات' : 'Chat'}</span>
                  </button>

                  {/* AI Analyst Tab */}
                  <button
                    onClick={() => handleSelectTopic('ai')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      sideDrawerView === 'ai'
                        ? 'bg-white text-[#131722] shadow-sm'
                        : 'text-[#787b86] hover:text-white'
                    }`}
                    title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </>
            ) : (
              /* When expanded: show full topic tabs on all devices */
              <div className="flex items-center gap-1 bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] min-w-0 overflow-x-auto scrollbar-none">
                {/* Daily Trades Tab */}
                <button
                  onClick={() => handleSelectTopic('trades')}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    sideDrawerView === 'trades'
                      ? 'bg-white text-[#131722] shadow-sm'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                  title={isAr ? 'صفقات اليوم' : 'Daily Trades'}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#089981]" />
                  <span className="text-xs">{isAr ? 'صفقات اليوم' : 'Daily Trades'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                </button>

                {/* Community Chat Tab */}
                <button
                  onClick={() => handleSelectTopic('chat')}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    sideDrawerView === 'chat'
                      ? 'bg-white text-[#131722] shadow-sm'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                  title={isAr ? 'الشات العام' : 'Community Chat'}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs">{isAr ? 'الشات' : 'Chat'}</span>
                </button>

                {/* AI Analyst Tab */}
                <button
                  onClick={() => handleSelectTopic('ai')}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    sideDrawerView === 'ai'
                      ? 'bg-white text-[#131722] shadow-sm'
                      : 'text-[#787b86] hover:text-white'
                  }`}
                  title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'المستشار' : 'AI'}</span>
                </button>
              </div>
            )}

            {/* Shrink / Expand Toggle Button */}
            <button
              onClick={handleToggleShrink}
              className={`p-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer items-center gap-1 shrink-0 ${
                isSidebarShrinked ? 'hidden sm:flex' : 'flex'
              } ${
                isSidebarShrinked
                  ? 'bg-[#089981]/15 border-[#089981]/30 text-[#089981] hover:bg-[#089981]/25'
                  : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
              }`}
              title={
                isSidebarShrinked
                  ? (isAr ? 'توسيع اللوحة للوضع الكامل' : 'Expand panel')
                  : (isAr ? 'تصغير اللوحة لتوفير مساحة للشارت' : 'Shrink panel')
              }
            >
              {isSidebarShrinked ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#089981]" />
                  <span className="text-[10px] hidden xl:inline font-bold">{isAr ? 'توسيع' : 'Expand'}</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#787b86]" />
                  <span className="text-[10px] hidden xl:inline font-medium">{isAr ? 'تصغير' : 'Shrink'}</span>
                </>
              )}
            </button>
          </div>

          {/* div 2: Content Area (Target of CSS Selector: aside:nth-of-type(2) > div:nth-of-type(2)) */}
          <div
            className={`flex-1 min-h-0 flex flex-col relative ${
              sideDrawerView === 'chat'
                ? 'overflow-hidden p-0 h-full w-full'
                : 'overflow-y-auto p-2.5'
            }`}
          >
            {/* On small mobile screens (< sm) when sidebar is shrinked: show vertical topic buttons */}
            {isSidebarShrinked && (
              <div className="sm:hidden flex flex-col items-center gap-3 py-3 w-full">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setSideDrawerView('trades');
                    setIsSidebarShrinked(false);
                    localStorage.setItem('mbk_tv_sidebar_view', 'trades');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                    sideDrawerView === 'trades'
                      ? 'bg-[#089981] text-white shadow-md'
                      : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                  }`}
                  title={isAr ? 'صفقات اليوم' : 'Daily Trades'}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#089981] absolute top-1 end-1 animate-ping" />
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setSideDrawerView('chat');
                    setIsSidebarShrinked(false);
                    localStorage.setItem('mbk_tv_sidebar_view', 'chat');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                    sideDrawerView === 'chat'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                  }`}
                  title={isAr ? 'الشات المباشر' : 'Live Chat'}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setSideDrawerView('ai');
                    setIsSidebarShrinked(false);
                    localStorage.setItem('mbk_tv_sidebar_view', 'ai');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                    sideDrawerView === 'ai'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                  }`}
                  title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* When expanded OR on sm+ screens: render the selected topic component */}
            <div className={`flex-1 min-h-0 flex flex-col ${isSidebarShrinked ? 'hidden sm:flex' : 'flex'}`}>
              {sideDrawerView === 'trades' ? (
                <DailyTradesPanel
                  isVIP={isVIP}
                  userRole={user.role}
                  onOpenPromoModal={onOpenPromoModal}
                  lang={lang}
                  isCompact={isSidebarShrinked}
                />
              ) : sideDrawerView === 'chat' ? (
                <PublicTradingChat
                  currentUserName={user.name || user.email.split('@')[0]}
                  isVIP={isVIP}
                  userRole={user.role}
                  isAdmin={user.role === 'ADMIN' || user.isAdmin}
                  lang={lang}
                  isCompact={isSidebarShrinked}
                />
              ) : (
                <TradingViewAIPanel
                  isVIP={isVIP}
                  activeSymbol={selectedSymbol}
                  currentPrice={activeTicker?.price || 20850}
                  onOpenPromoModal={onOpenPromoModal}
                  lang={lang}
                />
              )}
            </div>
          </div>
        </aside>

      </div>

      {/* Trader Utility Modals (Contact Support, Risk Calculator, Market Sessions) */}
      <SupportDeskModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        lang={lang}
        isVIP={isVIP}
        userName={user.name || user.email.split('@')[0]}
      />

      <RiskCalculatorModal
        isOpen={calculatorModalOpen}
        onClose={() => setCalculatorModalOpen(false)}
        lang={lang}
        defaultSymbol={selectedSymbol}
      />

      <MarketSessionsModal
        isOpen={sessionsModalOpen}
        onClose={() => setSessionsModalOpen(false)}
        lang={lang}
      />
    </div>
  );
};
