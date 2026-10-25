import React, { useState, useEffect } from 'react';
import {
  Radio,
  MessageSquare,
  Newspaper,
  Bot,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  PanelLeft,
  PanelRight,
  PanelBottom,
  Eye,
  EyeOff,
  Layout,
  Sliders,
  X,
  Plus,
  BarChart3,
  Flame,
  Activity,
  Headphones,
  Calculator,
  Clock,
  Gift,
  Layers,
  User,
  Smartphone
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { UserProfile, MarketSymbol, MarketTicker } from '../../types/trading';

// Modules
import { HeaderTicker } from './HeaderTicker';
import { LiveNewsTicker } from './LiveNewsTicker';
import { MarketInsightsWidget } from './MarketInsightsWidget';
import { SignalsChannelHub } from '../signals/SignalsChannelHub';
import { PublicTradingChat } from '../community/PublicTradingChat';
import { TradingViewAIPanel } from '../ai/TradingViewAIPanel';
import { TradingViewChart } from '../TradingViewChart';
import { TradingViewLiteChart } from '../TradingViewLiteChart';
import { DailyTradesPanel } from '../signals/DailyTradesPanel';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AdminManagementPanel } from '../admin/AdminManagementPanel';
import { MarketHeatmap } from '../insights/MarketHeatmap';

// Utility Modals
import { SupportDeskModal } from '../modals/SupportDeskModal';
import { RiskCalculatorModal } from '../modals/RiskCalculatorModal';
import { MarketSessionsModal } from '../modals/MarketSessionsModal';
import { UserProfileModal } from '../modals/UserProfileModal';

export type WorkspaceView = 'signals' | 'chat' | 'news' | 'ai' | 'chart' | 'admin';
export type ChatDockPosition = 'left' | 'right' | 'bottom' | 'hide';

interface ChatDockControlsProps {
  currentPosition: ChatDockPosition;
  onSelectPosition: (pos: ChatDockPosition) => void;
  isAr: boolean;
  compact?: boolean;
}

const ChatDockControls: React.FC<ChatDockControlsProps> = ({
  currentPosition,
  onSelectPosition,
  isAr,
  compact = false
}) => {
  const options: { id: ChatDockPosition; labelAr: string; labelEn: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'left', labelAr: 'يسار', labelEn: 'Left', icon: PanelLeft },
    { id: 'bottom', labelAr: 'أسفل', labelEn: 'Down', icon: PanelBottom },
    { id: 'right', labelAr: 'يمين', labelEn: 'Right', icon: PanelRight }
  ];

  return (
    <div className="flex items-center gap-0.5 bg-white/5 backdrop-blur-sm p-0.5 rounded-lg border border-white/10 shrink-0 shadow-inner">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentPosition === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectPosition(opt.id)}
            className={`p-1 sm:p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
              isActive
                ? 'bg-[#089981] text-white shadow-sm ring-1 ring-[#089981]/50'
                : 'text-[#787b86] hover:text-white hover:bg-white/10'
            }`}
            title={`${isAr ? opt.labelAr : opt.labelEn} - ${isAr ? 'نقل اللوحة الجانبية' : 'Move Side Panel'}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};

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
  const [activeMainView, setActiveMainView] = useState<'chart' | 'heatmap'>('chart');
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

  // Foldable Navigation Icon Rail state (persisted)
  const [isNavRailFolded, setIsNavRailFolded] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_nav_rail_folded') === 'true';
  });

  const toggleNavRail = () => {
    soundManager.playClick();
    setIsNavRailFolded(prev => {
      const next = !prev;
      localStorage.setItem('mbk_tv_nav_rail_folded', String(next));
      return next;
    });
  };

  // Window width tracking for flexible responsiveness
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  // Detect mobile device (width < 768px)
  const isMobile = windowWidth < 768;

  // Flexible resizable sidebar width state (persisted) - supports free move range (160px - 1200px)
  const [customSidebarWidth, setCustomSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mbk_tv_sidebar_custom_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 1200) return parsed;
      }
    } catch {
      // ignore
    }
    return 384; // standard default width
  });

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Full-Screen Analysis Mode state (overrides mobile split and expands advanced chart with drawing tools)
  const [isAnalysisMode, setIsAnalysisMode] = useState<boolean>(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState<boolean>(false);

  const handleEnableAnalysisMode = () => {
    setIsAnalysisMode(true);
    setShowRotatePrompt(true);
    setTimeout(() => {
      setShowRotatePrompt(false);
    }, 4000);
  };

  // Trader Utility Modals State (Contact Support, Risk Calculator, Market Sessions, User Profile)
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Collapsible Widgets State (Price Ticker & News Banner)
  const [showPriceTicker, setShowPriceTicker] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_show_price_ticker') !== 'false';
  });
  const [showNewsBanner, setShowNewsBanner] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_show_news_banner') !== 'false';
  });

  // Flexible Chat Docking State ('left' | 'right' | 'bottom' | 'hide')
  // On mobile (< 640px), default to 'bottom' split for optimal usability, while respecting user's saved choice
  const [chatPosition, setChatPosition] = useState<ChatDockPosition>(() => {
    const saved = localStorage.getItem('mbk_tv_chat_dock_position') as ChatDockPosition;
    if (saved === 'left' || saved === 'right' || saved === 'bottom' || saved === 'hide') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'bottom';
    }
    return 'left';
  });

  // Bottom docked chat height state (resizable & persisted)
  const [bottomChatHeight, setBottomChatHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mbk_tv_bottom_chat_height');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 550) return parsed;
      }
    } catch {
      // ignore
    }
    return 320;
  });

  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [mobileWorkspaceMenuOpen, setMobileWorkspaceMenuOpen] = useState(false);

  // Extremely foldable state for bottom helping panel (persisted)
  const [isBottomFolded, setIsBottomFolded] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_bottom_panel_folded') === 'true';
  });

  const toggleBottomFold = () => {
    soundManager.playClick();
    setIsBottomFolded(prev => {
      const next = !prev;
      localStorage.setItem('mbk_tv_bottom_panel_folded', String(next));
      return next;
    });
  };

  const handleResetBottomHeight = () => {
    soundManager.playClick();
    setBottomChatHeight(320);
    setIsBottomFolded(false);
    localStorage.setItem('mbk_tv_bottom_chat_height', '320');
    localStorage.setItem('mbk_tv_bottom_panel_folded', 'false');
  };

  // Widget collapse/expand toggle handlers with audio feedback
  const togglePriceTicker = () => {
    soundManager.playClick();
    setShowPriceTicker(prev => {
      const next = !prev;
      localStorage.setItem('mbk_tv_show_price_ticker', String(next));
      return next;
    });
  };

  const toggleNewsBanner = () => {
    soundManager.playClick();
    setShowNewsBanner(prev => {
      const next = !prev;
      localStorage.setItem('mbk_tv_show_news_banner', String(next));
      return next;
    });
  };

  // Helping panel dock position change handler (Left / Down / Right)
  const handleSetChatPosition = (pos: ChatDockPosition) => {
    soundManager.playClick();
    setChatPosition(pos);
    localStorage.setItem('mbk_tv_chat_dock_position', pos);

    if (pos === 'left' || pos === 'right') {
      setIsSidebarShrinked(false);
      localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
    }
  };

  // Window resize listener
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Bottom dock resizer handler
  const handleStartResizeBottom = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
    soundManager.playClick();
  };

  useEffect(() => {
    if (!isResizingBottom) return;

    const handleMove = (clientY: number) => {
      const windowHeight = window.innerHeight;
      const calculatedHeight = windowHeight - clientY;
      const minH = 140;
      const maxH = Math.min(windowHeight * 0.85, 750);

      // Snap to fold if dragged very close to bottom (< 80px)
      if (calculatedHeight < 80) {
        if (!isBottomFolded) {
          setIsBottomFolded(true);
          localStorage.setItem('mbk_tv_bottom_panel_folded', 'true');
        }
      } else {
        if (isBottomFolded) {
          setIsBottomFolded(false);
          localStorage.setItem('mbk_tv_bottom_panel_folded', 'false');
        }
        const clamped = Math.max(minH, Math.min(calculatedHeight, maxH));
        setBottomChatHeight(clamped);
        localStorage.setItem('mbk_tv_bottom_chat_height', String(clamped));
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientY);
    };

    const onEnd = () => setIsResizingBottom(false);

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
  }, [isResizingBottom, isBottomFolded]);

  // Drag handler to freely resize platform border between main and sidebar
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    soundManager.playClick();
  };

  const handleResetSidebarWidth = () => {
    soundManager.playClick();
    setCustomSidebarWidth(384);
    setIsSidebarShrinked(false);
    localStorage.setItem('mbk_tv_sidebar_custom_width', '384');
    localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMove = (clientX: number) => {
      // Free move calculation: determine if sidebar is on physical left or right
      const isPhysicalLeft = chatPosition === 'left' || (chatPosition !== 'right' && lang === 'ar');
      const calculatedWidth = isPhysicalLeft ? clientX : window.innerWidth - clientX;

      const minW = windowWidth < 640 ? 140 : 180;
      const maxAllowed = windowWidth < 640
        ? Math.max(minW, windowWidth - 36)
        : Math.max(minW, windowWidth - 70);

      // Snap to shrink if dragged very close to edge (< 105px)
      if (calculatedWidth < 105) {
        if (!isSidebarShrinked) {
          setIsSidebarShrinked(true);
          localStorage.setItem('mbk_tv_sidebar_shrinked', 'true');
        }
      } else {
        if (isSidebarShrinked) {
          setIsSidebarShrinked(false);
          localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
        }
        const clamped = Math.max(minW, Math.min(calculatedWidth, maxAllowed));
        setCustomSidebarWidth(clamped);
        localStorage.setItem('mbk_tv_sidebar_custom_width', String(clamped));
      }
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
  }, [isResizingSidebar, lang, windowWidth, isSidebarShrinked, chatPosition]);

  // Helper for determining whether the vertical side panel is visible (moves to bottom when position is 'bottom')
  const isSidebarVisible = chatPosition === 'left' || chatPosition === 'right';

  // Flexible width calculation for sidebar (free move range from 180px up to available screen space)
  const getSidebarWidthStyle = (): React.CSSProperties => {
    if (!isSidebarVisible) {
      return { width: '0px', minWidth: '0px', maxWidth: '0px', display: 'none' };
    }
    if (isSidebarShrinked) {
      return { width: '38px', minWidth: '38px', maxWidth: '38px' };
    }
    // Free move expanded mode: allows smooth resizing anywhere between minW and maxAllowed
    const minW = windowWidth < 640 ? 140 : 180;
    const maxAllowed = windowWidth < 640
      ? Math.max(minW, windowWidth - 36)
      : Math.max(minW, windowWidth - 70);
    const targetWidth = Math.max(minW, Math.min(customSidebarWidth, maxAllowed));

    return {
      width: `${targetWidth}px`,
      minWidth: `${minW}px`,
      maxWidth: `${maxAllowed}px`
    };
  };

  // Layout order helper based on RTL/LTR and chat docking position
  const getSidePanelOrder = (): string => {
    if (chatPosition === 'right') {
      return isAr ? 'order-1' : 'order-3';
    }
    // Default is physical left:
    return isAr ? 'order-3' : 'order-1';
  };

  const getMainCenterOrder = (): string => {
    return 'order-2';
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
      id: 'signals' as WorkspaceView | 'heatmap',
      labelAr: 'قنوات التوصيات',
      labelEn: 'Signals Hub',
      shortAr: 'الإشارات',
      shortEn: 'Signals',
      icon: Radio,
      badge: 'LIVE'
    },
    {
      id: 'chart' as WorkspaceView | 'heatmap',
      labelAr: 'الرسم البياني',
      labelEn: 'Live Chart',
      shortAr: 'الشارت',
      shortEn: 'Chart',
      icon: BarChart2
    },
    {
      id: 'heatmap' as WorkspaceView | 'heatmap',
      labelAr: 'الخريطة الحرارية',
      labelEn: 'Market Heatmap',
      shortAr: 'الخريطة',
      shortEn: 'Heatmap',
      icon: Flame,
      badge: 'HOT'
    },
    {
      id: 'chat' as WorkspaceView | 'heatmap',
      labelAr: 'نقاش المتداولين',
      labelEn: 'Community Chat',
      shortAr: 'النقاش',
      shortEn: 'Chat',
      icon: MessageSquare,
      badge: 'NEW'
    },
    {
      id: 'ai' as WorkspaceView | 'heatmap',
      labelAr: 'المستشار الذكي',
      labelEn: 'AI Analyst',
      shortAr: 'الذكاء',
      shortEn: 'AI',
      icon: Bot,
      badge: isVIP ? 'VIP' : 'AI'
    },
    {
      id: 'news' as WorkspaceView | 'heatmap',
      labelAr: 'الأخبار الاقتصادية',
      labelEn: 'Financial News',
      shortAr: 'الأخبار',
      shortEn: 'News',
      icon: Newspaper
    },
    // Admin Management Panel (Available for Admins)
    ...((user.role === 'ADMIN' || user.isAdmin || (typeof window !== 'undefined' && localStorage.getItem('mbk_chat_admin_mode') === 'true'))
      ? [{
          id: 'admin' as WorkspaceView | 'heatmap',
          labelAr: 'إدارة المنصة (Admin)',
          labelEn: 'Admin Panel',
          shortAr: 'الإدارة',
          shortEn: 'Admin',
          icon: Shield,
          badge: 'ADMIN'
        }]
      : [])
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
          {/* MODULAR WORKSPACE CONTROLS (Collapsible Widgets + Chat Docking) */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#131722] px-2 py-1 rounded-lg border border-[#2a2e39] text-xs shrink-0">
            {/* Widget Collapses with Chevrons */}
            <div className="flex items-center gap-1 border-e border-[#2a2e39] pe-1.5">
              <button
                onClick={togglePriceTicker}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                  showPriceTicker
                    ? 'text-[#089981] bg-[#089981]/15 border border-[#089981]/30'
                    : 'text-[#787b86] hover:text-white border border-transparent'
                }`}
                title={isAr ? (showPriceTicker ? 'طي شريط الأسعار' : 'إظهار شريط الأسعار') : (showPriceTicker ? 'Fold price ticker' : 'Show price ticker')}
              >
                <Activity className="w-3 h-3 text-[#089981]" />
                <span className="hidden xl:inline">{isAr ? 'الأسعار' : 'Ticker'}</span>
                {showPriceTicker ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5 text-[#089981]" />}
              </button>

              <button
                onClick={toggleNewsBanner}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                  showNewsBanner
                    ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30'
                    : 'text-[#787b86] hover:text-white border border-transparent'
                }`}
                title={isAr ? (showNewsBanner ? 'طي شريط الأخبار' : 'إظهار شريط الأخبار') : (showNewsBanner ? 'Fold news banner' : 'Show news banner')}
              >
                <Newspaper className="w-3 h-3 text-blue-400" />
                <span className="hidden xl:inline">{isAr ? 'الأخبار' : 'News'}</span>
                {showNewsBanner ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5 text-blue-400" />}
              </button>

              <button
                onClick={toggleNavRail}
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                  !isNavRailFolded
                    ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                    : 'text-[#787b86] hover:text-white border border-transparent'
                }`}
                title={isAr ? (!isNavRailFolded ? 'طي شريط القائمة الجانبية' : 'إظهار شريط القائمة الجانبية') : (!isNavRailFolded ? 'Fold nav rail' : 'Show nav rail')}
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span className="hidden xl:inline">{isAr ? 'القائمة' : 'Nav'}</span>
                {!isNavRailFolded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5 text-amber-400" />}
              </button>
            </div>

            {/* Side Panel Docking Selector (Left / Down / Right) */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-[#787b86] hidden lg:inline font-bold">
                {isAr ? 'موضع اللوحة:' : 'Panel:'}
              </span>
              <ChatDockControls
                currentPosition={chatPosition}
                onSelectPosition={handleSetChatPosition}
                isAr={isAr}
                compact
              />
            </div>
          </div>

          {/* Mobile Workspace Customization Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setMobileWorkspaceMenuOpen(prev => !prev);
            }}
            className={`md:hidden p-1 sm:p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
              mobileWorkspaceMenuOpen
                ? 'bg-[#089981]/20 border-[#089981] text-[#089981]'
                : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
            }`}
            title={isAr ? 'تخصيص مساحة العمل' : 'Customize Workspace'}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: User Status, Analysis Mode Toggle, VIP Action, Audio, Lang, Sidebar Toggle, Logout */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Analysis Mode Toggle Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAnalysisMode((prev) => !prev);
            }}
            className={`px-1.5 sm:px-2.5 py-1 rounded-lg border text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              isAnalysisMode
                ? 'bg-[#089981] text-white border-[#089981] shadow-md shadow-[#089981]/30 ring-1 ring-[#089981]/50'
                : 'bg-[#131722] hover:bg-[#2a2e39] border-[#2a2e39] text-[#089981] hover:text-white'
            }`}
            title={
              isAnalysisMode
                ? (isAr ? 'خروج من وضع التحليل' : 'Exit Analysis Mode')
                : (isAr ? 'وضع التحليل الفني الشامل' : 'Full Analysis Mode')
            }
          >
            {isAnalysisMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-[#089981]" />}
            <span className="hidden xs:inline">{isAr ? 'وضع التحليل' : 'Analysis'}</span>
          </button>

          {/* Active Profile Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setProfileModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-amber-500/40 text-[10px] sm:text-xs transition-all cursor-pointer group shrink-0"
            title={isAr ? 'الملف الشخصي والحساب' : 'Profile & Account'}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-[10px] sm:text-xs uppercase shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name ? user.name[0].toUpperCase() : <User className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <span className="font-bold text-white truncate max-w-[55px] xs:max-w-[80px] sm:max-w-[120px] text-[10px] sm:text-xs hidden xxs:inline group-hover:text-amber-400 transition-colors">
              {user.name || user.email.split('@')[0]}
            </span>
            {isVIP ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 font-mono flex items-center gap-0.5 shrink-0 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden xs:inline">VIP</span>
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] text-[#787b86] font-mono shrink-0 hidden xs:inline bg-[#1e222d] px-1 py-0.2 rounded border border-[#2a2e39]">FREE</span>
            )}
          </button>

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

          {/* Permanent Sidebar Shrink / Expand Toggle */}
          <button
            onClick={handleToggleShrink}
            className={`hidden sm:flex p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer items-center gap-1 text-xs font-semibold shrink-0 ${
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

      {/* MOBILE WORKSPACE CUSTOMIZATION MODAL/DROPDOWN */}
      {mobileWorkspaceMenuOpen && (
        <div className="md:hidden bg-[#1e222d] border-b border-[#2a2e39] p-3 space-y-3 z-40 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sliders className="w-3.5 h-3.5 text-[#089981]" />
              <span>{isAr ? 'تخصيص مساحة العمل' : 'Workspace Customization'}</span>
            </div>
            <button
              onClick={() => setMobileWorkspaceMenuOpen(false)}
              className="p-1 rounded text-[#787b86] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Analysis Mode Toggle for Mobile */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAnalysisMode((prev) => !prev);
              setMobileWorkspaceMenuOpen(false);
            }}
            className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              isAnalysisMode
                ? 'bg-[#089981] text-white border-[#089981] shadow-lg shadow-[#089981]/30'
                : 'bg-[#131722] hover:bg-[#2a2e39] border-[#089981]/50 text-[#089981]'
            }`}
          >
            {isAnalysisMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-[#089981]" />}
            <span>{isAnalysisMode ? (isAr ? 'إنهاء وضع التحليل' : 'Exit Analysis Mode') : (isAr ? 'تفعيل وضع التحليل الفني الشامل' : 'Full Analysis Mode')}</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {/* Ticker toggle */}
            <button
              onClick={togglePriceTicker}
              className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 font-medium cursor-pointer transition-all ${
                showPriceTicker
                  ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981]'
                  : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
              }`}
            >
              <div className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isAr ? 'الأسعار' : 'Ticker'}</span>
              </div>
              {showPriceTicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* News toggle */}
            <button
              onClick={toggleNewsBanner}
              className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 font-medium cursor-pointer transition-all ${
                showNewsBanner
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                  : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
              }`}
            >
              <div className="flex items-center gap-1">
                <Newspaper className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isAr ? 'الأخبار' : 'News'}</span>
              </div>
              {showNewsBanner ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Nav Rail toggle */}
            <button
              onClick={toggleNavRail}
              className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 font-medium cursor-pointer transition-all ${
                !isNavRailFolded
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
              }`}
            >
              <div className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isAr ? 'القائمة' : 'Nav'}</span>
              </div>
              {!isNavRailFolded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Chat Docking on Mobile */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-[#787b86] font-semibold block">
              {isAr ? 'موضع شات المتداولين:' : 'Community Chat Docking:'}
            </span>
            <ChatDockControls
              currentPosition={chatPosition}
              onSelectPosition={(pos) => {
                handleSetChatPosition(pos);
                setMobileWorkspaceMenuOpen(false);
              }}
              isAr={isAr}
            />
          </div>
        </div>
      )}

      {/* 2. LIVE PRICE TICKER (COLLAPSIBLE WITH CHEVRON TOGGLE) */}
      <div className={`transition-all duration-300 ease-in-out relative group/ticker overflow-hidden shrink-0 ${
        showPriceTicker ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <HeaderTicker tickers={tickers} onSelectSymbol={onSelectSymbol} lang={lang} />
        {/* Sleek inline fold chevron button */}
        <button
          onClick={togglePriceTicker}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 p-1 rounded bg-[#1e222d]/90 hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-all duration-200 cursor-pointer shadow-md opacity-80 group-hover/ticker:opacity-100 flex items-center"
          title={isAr ? 'طي شريط الأسعار' : 'Fold price ticker'}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2b. REAL RSS FINANCIAL NEWS BANNER (COLLAPSIBLE WITH CHEVRON TOGGLE) */}
      <div className={`transition-all duration-300 ease-in-out relative group/news overflow-hidden shrink-0 ${
        showNewsBanner ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <LiveNewsTicker lang={lang} />
        {/* Sleek inline fold chevron button */}
        <button
          onClick={toggleNewsBanner}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 p-1 rounded bg-[#1e222d]/90 hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-all duration-200 cursor-pointer shadow-md opacity-80 group-hover/news:opacity-100 flex items-center"
          title={isAr ? 'طي شريط الأخبار' : 'Fold news banner'}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini Unfold Indicator Strip when either or both widgets are folded */}
      {(!showPriceTicker || !showNewsBanner) && (
        <div className="h-6 bg-[#131722] border-b border-[#2a2e39] px-3 flex items-center gap-2 shrink-0 transition-all duration-300">
          {!showPriceTicker && (
            <button
              onClick={togglePriceTicker}
              className="flex items-center gap-1 text-[10px] text-[#089981] hover:text-white bg-[#1e222d] hover:bg-[#2a2e39] px-2 py-0.5 rounded border border-[#089981]/30 transition-all cursor-pointer font-medium"
              title={isAr ? 'إظهار شريط الأسعار' : 'Show price ticker'}
            >
              <ChevronDown className="w-2.5 h-2.5 text-[#089981]" />
              <span>{isAr ? 'إظهار الأسعار' : 'Show Ticker'}</span>
            </button>
          )}
          {!showNewsBanner && (
            <button
              onClick={toggleNewsBanner}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-white bg-[#1e222d] hover:bg-[#2a2e39] px-2 py-0.5 rounded border border-blue-500/30 transition-all cursor-pointer font-medium"
              title={isAr ? 'إظهار شريط الأخبار' : 'Show news banner'}
            >
              <ChevronDown className="w-2.5 h-2.5 text-blue-400" />
              <span>{isAr ? 'إظهار الأخبار' : 'Show News'}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. MAIN WORKSPACE CANVAS (DESKTOP ICON RAIL + MAIN AREA + COLLAPSIBLE DRAWER) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* VERTICAL ICON RAIL (ACTIVE ACROSS ALL SCREEN SIZES INCLUDING MOBILE - FOLDABLE) */}
        <aside
          className={`bg-[#1e222d] border-e border-[#2a2e39] flex flex-col items-center justify-between shrink-0 z-30 select-none overflow-y-auto scrollbar-none transition-all duration-300 ease-in-out relative ${
            isNavRailFolded
              ? 'w-0 min-w-0 max-w-0 border-e-0 opacity-0 p-0 pointer-events-none'
              : 'w-11 sm:w-12 md:w-14 py-2 sm:py-2.5 opacity-100'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
            {/* Quick Fold Toggle Button at top of Navigation Rail */}
            <button
              onClick={toggleNavRail}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-all cursor-pointer group mb-0.5 shrink-0"
              title={isAr ? 'طي شريط القائمة الجانبية' : 'Fold Navigation Rail'}
            >
              {isAr ? (
                <ChevronRight className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-[#787b86] group-hover:text-white" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-[#787b86] group-hover:text-white" />
              )}
            </button>

            {navItems.map((item) => {
              const isActive = item.id === 'heatmap' ? activeMainView === 'heatmap' : (activeMainView === 'chart' && activeView === item.id);
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundManager.playClick();
                    if (item.id === 'heatmap') {
                      setActiveMainView('heatmap');
                    } else {
                      setActiveMainView('chart');
                      if (item.id === 'chat') {
                        if (sideDrawerView === 'chat') {
                          setSideDrawerView('trades');
                          localStorage.setItem('mbk_tv_sidebar_view', 'trades');
                        }
                        setActiveView('chat');
                      } else {
                        setActiveView(item.id as WorkspaceView);
                      }
                    }
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

        {/* Edge Tab Button to Unfold Nav Rail when folded */}
        {isNavRailFolded && (
          <button
            onClick={toggleNavRail}
            className="absolute start-0 top-14 sm:top-16 z-40 px-1 py-2.5 rounded-e-lg bg-[#1e222d]/95 hover:bg-[#2a2e39] border border-s-0 border-[#2a2e39] text-[#787b86] hover:text-white transition-all duration-300 shadow-2xl cursor-pointer flex flex-col items-center gap-1 group hover:border-[#089981]/60"
            title={isAr ? 'إظهار شريط القائمة الجانبية' : 'Unfold Navigation Rail'}
          >
            {isAr ? (
              <ChevronLeft className="w-3.5 h-3.5 text-[#089981] group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#089981] group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[9px] font-mono [writing-mode:vertical-lr] text-[#787b86] group-hover:text-white select-none">
              {isAr ? 'القائمة' : 'NAV'}
            </span>
          </button>
        )}

        {/* CENTER WORKSPACE: MAIN VIEWPORT + DOCKABLE BOTTOM CHAT / FULL PAGE HEATMAP */}
        {activeMainView === 'heatmap' ? (
          <main className="flex-1 min-w-0 h-full w-full overflow-y-auto p-3 sm:p-5 bg-[#131722] z-30 animate-in fade-in">
            <MarketHeatmap lang={lang} />
          </main>
        ) : (
          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${getMainCenterOrder()} relative transition-all duration-300`}>
          {/* MAIN VIEWPORT */}
          {isAnalysisMode ? (
            /* FULL-SCREEN ANALYSIS MODE: FULL ADVANCED CHART WITH DRAWING TOOLS (100% HEIGHT) */
            <main className="flex-1 min-h-0 h-full w-full overflow-hidden relative bg-[#06080C] p-0 z-30">
              <TradingViewChart
                symbol={selectedSymbol}
                onSymbolChange={onSelectSymbol}
                tickers={tickers}
                fullHeightOnMobile={true}
              />
              {/* Floating Exit Button Overlay */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsAnalysisMode(false);
                }}
                className="absolute top-3 end-3 z-50 px-3 py-1.5 rounded-xl bg-[#089981] hover:bg-[#067a67] text-white font-bold text-xs shadow-2xl flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 animate-fade-in"
                title={isAr ? 'الخروج من وضع التحليل الفني' : 'Exit Analysis Mode'}
              >
                <Minimize2 className="w-4 h-4" />
                <span>{isAr ? 'خروج من وضع التحليل' : 'Exit Analysis Mode'}</span>
              </button>
            </main>
          ) : isMobile && activeView === 'chart' ? (
            /* MOBILE STRICT VERTICAL SPLIT: LITE CHART (TOP) + MARKET INSIGHTS (MIDDLE) + HELPING PANEL (BOTTOM) */
            <main className="flex-1 min-h-0 h-full overflow-hidden flex flex-col bg-[#131722]">
              {/* 1. TOP FIXED AREA: LITE CHART (h-[26vh] sm:h-60) */}
              <div className="h-[26vh] sm:h-60 w-full shrink-0 border-b border-[#2a2e39] bg-[#131722] overflow-hidden relative">
                <TradingViewLiteChart
                  symbol={selectedSymbol}
                  onSymbolChange={onSelectSymbol}
                  tickers={tickers}
                  lang={lang}
                />
                {/* Single Clean Toggle Button to switch to Analysis Mode */}
                <button
                  onClick={() => {
                    soundManager.playClick();
                    handleEnableAnalysisMode();
                  }}
                  className="absolute top-2 end-2 z-20 px-2.5 py-1 rounded-lg bg-[#089981] hover:bg-[#067a67] text-white text-[10px] font-bold shadow-lg flex items-center gap-1 cursor-pointer border border-white/20 transition-all"
                  title={isAr ? 'تفعيل وضع التحليل الفني الشامل' : 'Switch to Analysis Mode'}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{isAr ? 'وضع التحليل' : 'Analysis Mode'}</span>
                </button>
              </div>

              {/* 2. MIDDLE AREA: MARKET INSIGHTS CONTAINER (Rendered ONLY when bottom helping panel is folded) */}
              {isBottomFolded && (
                <div className="flex-1 min-h-0 w-full overflow-y-auto p-2 transition-all duration-300 border-b border-white/10 animate-in fade-in">
                  <MarketInsightsWidget
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={onSelectSymbol}
                    lang={lang}
                    activeTicker={activeTicker}
                  />
                </div>
              )}

              {/* 3. BOTTOM AREA: HELPING PANEL (Strict Fold Logic: h-[48px] when folded, flex-1 when expanded) */}
              <div
                className={`w-full bg-[#131722]/50 backdrop-blur-md border-t border-white/10 flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300 ${
                  isBottomFolded
                    ? 'h-[48px] min-h-[48px] max-h-[48px] shrink-0'
                    : 'flex-1 min-h-0'
                }`}
              >
                {/* Helping Panel Header Bar */}
                <div className="px-2.5 py-1.5 bg-[#131722]/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 gap-2 h-[38px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* SVG Chevron Fold / Unfold Toggle Button */}
                    <button
                      onClick={toggleBottomFold}
                      className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#787b86] hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs shrink-0 group"
                      title={
                        isBottomFolded
                          ? (isAr ? 'توسيع اللوحة المساعدة' : 'Expand helping panel')
                          : (isAr ? 'طي اللوحة لتوسيع مساحة الشارت' : 'Fold panel to maximize workspace')
                      }
                    >
                      {isBottomFolded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-[#089981] group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-bold text-[#089981] hidden xxs:inline">
                            {isAr ? 'توسيع' : 'Expand'}
                          </span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-[#787b86] group-hover:text-white group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-medium hidden xxs:inline">
                            {isAr ? 'طي' : 'Fold'}
                          </span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 overflow-x-auto scrollbar-none">
                      <button
                        onClick={() => handleSelectTopic('trades')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'trades' ? 'bg-white text-[#131722] shadow-sm' : 'text-[#787b86] hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-[#089981]" />
                        <span className="text-[11px]">{isAr ? 'صفقات اليوم' : 'Daily Trades'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                      </button>

                      <button
                        onClick={() => handleSelectTopic('chat')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'chat' ? 'bg-white text-[#131722] shadow-sm' : 'text-[#787b86] hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px]">{isAr ? 'الشات المباشر' : 'Live Chat'}</span>
                      </button>

                      <button
                        onClick={() => handleSelectTopic('ai')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'ai' ? 'bg-white text-[#131722] shadow-sm' : 'text-[#787b86] hover:text-white'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">{isAr ? 'المستشار الذكي' : 'AI Analyst'}</span>
                      </button>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#089981] font-bold px-2 py-0.5 rounded bg-[#089981]/10 border border-[#089981]/20">
                    LIVE
                  </span>
                </div>

                {/* Content for Helping Panel (Completely hidden when folded) */}
                <div className={`flex-1 min-h-0 h-full overflow-hidden ${isBottomFolded ? 'hidden' : 'block'}`}>
                  {sideDrawerView === 'trades' && (
                    <DailyTradesPanel
                      isVIP={isVIP}
                      userRole={user.role}
                      onOpenPromoModal={onOpenPromoModal}
                      lang={lang}
                      isCompact={true}
                    />
                  )}
                  {sideDrawerView === 'chat' && (
                    <PublicTradingChat
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin}
                      lang={lang}
                      isCompact={true}
                    />
                  )}
                  {sideDrawerView === 'ai' && (
                    <div className="h-full overflow-y-auto p-2">
                      <TradingViewAIPanel
                        isVIP={isVIP}
                        activeSymbol={selectedSymbol}
                        currentPrice={activeTicker?.price || 20850}
                        onOpenPromoModal={onOpenPromoModal}
                        lang={lang}
                      />
                    </div>
                  )}
                </div>
              </div>
            </main>
          ) : activeView === 'chat' ? (
            <main className="flex-1 min-h-0 h-full overflow-hidden p-1 sm:p-2.5 flex flex-col bg-[#131722]">
              <div className="flex-1 min-h-0 h-full w-full rounded-xl overflow-hidden border border-[#2a2e39] shadow-2xl flex flex-col bg-[#1e222d]">
                <PublicTradingChat
                  currentUserName={user.name || user.email.split('@')[0]}
                  isVIP={isVIP}
                  userRole={user.role}
                  isAdmin={user.role === 'ADMIN' || user.isAdmin}
                  lang={lang}
                  isCompact={false}
                />
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto bg-[#131722] p-2 sm:p-4 md:p-5 pb-4 min-w-0 transition-all duration-300">
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

                {/* VIEW 2: TRADINGVIEW LIVE ADVANCED CHART VIEW */}
                {activeView === 'chart' && (
                  <div className="space-y-4">
                    <div className={`${isBottomFolded ? 'h-[calc(100vh-280px)] min-h-[450px]' : 'h-[calc(100vh-160px)] min-h-[500px]'} w-full rounded-xl overflow-hidden border border-[#2a2e39] shadow-2xl relative transition-all duration-300`}>
                      <TradingViewChart
                        symbol={selectedSymbol}
                        onSymbolChange={onSelectSymbol}
                        tickers={tickers}
                      />
                    </div>
                    {isBottomFolded && (
                      <div className="animate-in fade-in transition-all">
                        <MarketInsightsWidget
                          selectedSymbol={selectedSymbol}
                          onSymbolChange={onSelectSymbol}
                          lang={lang}
                          activeTicker={activeTicker}
                        />
                      </div>
                    )}
                  </div>
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

                {/* VIEW 6: DEDICATED ADMIN CONTROL CENTER (Backed by SQLite & RBAC) */}
                {activeView === 'admin' && (
                  <div className="min-h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-[#2a2e39] shadow-2xl">
                    <AdminDashboard
                      currentRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin}
                      lang={lang}
                      onClose={() => setActiveView('signals')}
                    />
                  </div>
                )}
              </div>
            </main>
          )}

          {/* HELPING PANEL DOCKED AT BOTTOM (Entire panel moved down with all tabs, free move & extreme fold) */}
          {chatPosition === 'bottom' && !(isMobile && activeView === 'chart') && !isAnalysisMode && (
            <div
              style={{
                height: isBottomFolded ? '48px' : (windowWidth < 640 ? '48vh' : `${bottomChatHeight}px`),
                maxHeight: isBottomFolded ? '48px' : (windowWidth < 640 ? '60vh' : '750px'),
                minHeight: isBottomFolded ? '48px' : '140px'
              }}
              className={`w-full bg-[#131722]/50 backdrop-blur-md border-t border-white/10 flex flex-col shrink-0 transition-all duration-300 shadow-2xl relative z-30 ${
                isBottomFolded ? 'h-[48px] min-h-[48px] max-h-[48px]' : ''
              }`}
            >
              {/* Resizer Handle on Top of Bottom Dock (Free Move) */}
              {!isBottomFolded && (
                <div
                  onMouseDown={handleStartResizeBottom}
                  onTouchStart={handleStartResizeBottom}
                  onDoubleClick={handleResetBottomHeight}
                  className={`h-2.5 -mt-1.5 w-full hover:h-3 transition-all cursor-row-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${
                    isResizingBottom ? 'bg-[#089981] shadow-[0_0_12px_#089981]' : 'bg-transparent hover:bg-[#089981]/50'
                  }`}
                  title={isAr ? 'اسحب للتحريك الحر للارتفاع أو انقر مرتين للضبط التلقائي (320px)' : 'Drag to freely move height or double click to reset'}
                >
                  <div className="w-12 h-1 rounded-full bg-white/30 group-hover:bg-white transition-colors" />
                  {/* Live pixel readout tooltip while actively resizing */}
                  {isResizingBottom && (
                    <div className="absolute -top-7 start-1/2 -translate-x-1/2 z-50 px-2.5 py-0.5 rounded bg-[#0d1017] border border-[#089981] text-[10px] font-mono font-bold text-[#089981] whitespace-nowrap shadow-2xl pointer-events-none animate-in fade-in">
                      {bottomChatHeight}px
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Helping Panel Header Bar */}
              <div className="px-2.5 sm:px-3 py-1.5 bg-[#131722]/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 gap-2 h-[38px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* SVG Chevron Fold / Unfold Toggle Button */}
                  <button
                    onClick={toggleBottomFold}
                    className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#787b86] hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs shrink-0 group"
                    title={
                      isBottomFolded
                        ? (isAr ? 'توسيع اللوحة المساعدة' : 'Expand helping panel')
                        : (isAr ? 'طي اللوحة لتوسيع مساحة الشارت' : 'Fold panel to maximize workspace')
                    }
                  >
                    {isBottomFolded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-[#089981] group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-[#089981] hidden xxs:inline">
                          {isAr ? 'توسيع' : 'Expand'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-[#787b86] group-hover:text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-medium hidden xxs:inline">
                          {isAr ? 'طي' : 'Fold'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Topic Tabs */}
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 min-w-0 overflow-x-auto scrollbar-none">
                    {/* Daily Trades Tab */}
                    <button
                      onClick={() => {
                        handleSelectTopic('trades');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'trades'
                          ? 'bg-white text-[#131722] shadow-sm'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isAr ? 'صفقات اليوم' : 'Daily Trades'}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#089981]" />
                      <span className={isBottomFolded ? 'hidden sm:inline text-[11px]' : 'text-[11px]'}>
                        {isAr ? 'صفقات اليوم' : 'Daily Trades'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                    </button>

                    {/* Community Chat Tab */}
                    <button
                      onClick={() => {
                        handleSelectTopic('chat');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'chat'
                          ? 'bg-white text-[#131722] shadow-sm'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isAr ? 'غرفة الشات المباشرة' : 'Live Community Chat'}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span className={isBottomFolded ? 'hidden sm:inline text-[11px]' : 'text-[11px]'}>
                        {isAr ? 'الشات المباشر' : 'Live Chat'}
                      </span>
                    </button>

                    {/* AI Analyst Tab */}
                    <button
                      onClick={() => {
                        handleSelectTopic('ai');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'ai'
                          ? 'bg-white text-[#131722] shadow-sm'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                    >
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      <span className={isBottomFolded ? 'hidden sm:inline text-[11px]' : 'text-[11px]'}>
                        {isAr ? 'المستشار الذكي' : 'AI Analyst'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Move Helping Panel Controls: Left / Down / Right */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-[#787b86] font-semibold hidden md:inline">
                    {isAr ? 'نقل اللوحة:' : 'Move Panel:'}
                  </span>
                  <ChatDockControls
                    currentPosition={chatPosition}
                    onSelectPosition={handleSetChatPosition}
                    isAr={isAr}
                    compact
                  />
                </div>
              </div>

              {/* Bottom Helping Panel Content Body (Hidden when extremely folded to maximize workspace) */}
              {!isBottomFolded && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-200">
                  {sideDrawerView === 'trades' ? (
                    <DailyTradesPanel
                      isVIP={isVIP}
                      userRole={user.role}
                      onOpenPromoModal={onOpenPromoModal}
                      lang={lang}
                      isCompact={false}
                    />
                  ) : sideDrawerView === 'chat' ? (
                    <PublicTradingChat
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin}
                      lang={lang}
                      isCompact={false}
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
              )}
            </div>
          )}
        </div>
        )}

        {/* FLEXIBLE RESIZABLE BORDER DIVIDER (Platform border resize handle - Free Move) */}
        {isSidebarVisible && !isAnalysisMode && activeMainView === 'chart' && (
          <div
            onMouseDown={handleStartResize}
            onTouchStart={handleStartResize}
            onDoubleClick={handleResetSidebarWidth}
            className={`w-3 sm:w-3.5 -mx-1 sm:-mx-1.5 hover:w-4 transition-all cursor-col-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${getSidePanelOrder()} ${
              isResizingSidebar
                ? 'bg-[#089981]/30 w-4 shadow-[0_0_15px_#089981]'
                : 'hover:bg-[#089981]/20'
            }`}
            title={isAr ? 'اسحب للتحريك الحر للوحة أو انقر مرتين للضبط التلقائي (384px)' : 'Drag to freely move border or double click to reset'}
          >
            {/* Center line indicator */}
            <div
              className={`w-0.5 h-full transition-colors ${
                isResizingSidebar ? 'bg-[#089981]' : 'bg-[#2a2e39] group-hover:bg-[#089981]'
              }`}
            />
            {/* Ergonomic handle with grip dots */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-14 rounded-full border flex flex-col items-center justify-center gap-1 transition-all shadow-md ${
                isResizingSidebar
                  ? 'bg-[#089981] border-white text-white scale-110 shadow-lg'
                  : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] group-hover:border-[#089981] group-hover:text-white'
              }`}
            >
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
              <div className="w-1 h-1 rounded-full bg-current opacity-80" />
            </div>

            {/* Live pixel readout tooltip while actively resizing */}
            {isResizingSidebar && (
              <div className="absolute top-12 z-50 px-2 py-0.5 rounded bg-[#0d1017] border border-[#089981] text-[10px] font-mono font-bold text-[#089981] whitespace-nowrap shadow-2xl pointer-events-none animate-in fade-in">
                {customSidebarWidth}px
              </div>
            )}
          </div>
        )}

        {/* 4. SIDEBAR (DOCKABLE LEFT / RIGHT / BOTTOM / HIDE) */}
        {isSidebarVisible && !isAnalysisMode && activeMainView === 'chart' && (
          <aside
            style={getSidebarWidthStyle()}
            className={`flex flex-col h-full shrink-0 z-30 bg-[#131722]/50 backdrop-blur-md border-s border-white/10 select-none overflow-hidden shadow-2xl ${getSidePanelOrder()} ${
              isResizingSidebar ? 'transition-none' : 'transition-all duration-300'
            }`}
          >
            {/* Header Bar with Topic Switcher + SVG Fold Chevron Toggle */}
            <div className={`p-1.5 border-b border-white/10 flex ${isSidebarShrinked ? 'flex-col items-center py-2 gap-2.5 h-full' : 'items-center justify-between'} bg-[#131722]/60 backdrop-blur-md shrink-0 overflow-hidden`}>
              {isSidebarShrinked ? (
                /* Folded Ultra-Slim Strip View (38px wide) */
                <div className="flex flex-col items-center gap-3 w-full h-full justify-between py-1">
                  <div className="flex flex-col items-center gap-2.5 w-full">
                    {/* SVG Fold Toggle (Chevron) */}
                    <button
                      onClick={handleToggleShrink}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#787b86] hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 group"
                      title={isAr ? 'توسيع اللوحة المساعدة' : 'Expand helping panel'}
                    >
                      {chatPosition === 'right' ? (
                        <ChevronLeft className="w-4 h-4 text-[#089981] group-hover:scale-110 transition-transform" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#089981] group-hover:scale-110 transition-transform" />
                      )}
                    </button>

                    <div className="w-5 h-[1px] bg-white/10" />

                    {/* Vertical Icon Tabs */}
                    <button
                      onClick={() => handleSelectTopic('trades')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#089981] text-white shadow-sm'
                          : 'text-[#787b86] hover:text-white hover:bg-white/5'
                      }`}
                      title={isAr ? 'صفقات اليوم' : 'Daily Trades'}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#089981] absolute top-0.5 end-0.5 animate-ping" />
                    </button>

                    <button
                      onClick={() => handleSelectTopic('chat')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                        sideDrawerView === 'chat'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[#787b86] hover:text-white hover:bg-white/5'
                      }`}
                      title={isAr ? 'الشات المباشر' : 'Live Chat'}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleSelectTopic('ai')}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center relative transition-all cursor-pointer ${
                        sideDrawerView === 'ai'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-[#787b86] hover:text-white hover:bg-white/5'
                      }`}
                      title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                    >
                      <Bot className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dock position controls stacked at bottom of slim strip */}
                  <div className="flex flex-col items-center gap-1 pt-2 border-t border-white/10 w-full">
                    <ChatDockControls
                      currentPosition={chatPosition}
                      onSelectPosition={handleSetChatPosition}
                      isAr={isAr}
                      compact
                    />
                  </div>
                </div>
              ) : (
                /* Expanded View Header */
                <>
                  {/* SVG Fold Toggle Button */}
                  <button
                    onClick={handleToggleShrink}
                    className="p-1 sm:px-2 sm:py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#787b86] hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs shrink-0 group"
                    title={isAr ? 'طي اللوحة المساعدة' : 'Fold helping panel'}
                  >
                    {chatPosition === 'right' ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#787b86] group-hover:text-white group-hover:scale-110 transition-transform" />
                    ) : (
                      <ChevronLeft className="w-3.5 h-3.5 text-[#787b86] group-hover:text-white group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[11px] font-medium hidden xxs:inline">{isAr ? 'طي' : 'Fold'}</span>
                  </button>

                  {/* Topic Tabs */}
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 min-w-0 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => handleSelectTopic('trades')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
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

                    <button
                      onClick={() => handleSelectTopic('chat')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'chat'
                          ? 'bg-white text-[#131722] shadow-sm'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isAr ? 'غرفة الشات المباشرة' : 'Live Community Chat'}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[11px]">{isAr ? 'الشات' : 'Chat'}</span>
                    </button>

                    <button
                      onClick={() => handleSelectTopic('ai')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'ai'
                          ? 'bg-white text-[#131722] shadow-sm'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isAr ? 'المستشار الذكي' : 'AI Analyst'}
                    >
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px]">{isAr ? 'الذكاء' : 'AI'}</span>
                    </button>
                  </div>

                  {/* Dock Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <ChatDockControls
                      currentPosition={chatPosition}
                      onSelectPosition={handleSetChatPosition}
                      isAr={isAr}
                      compact
                    />
                  </div>
                </>
              )}
            </div>

            {/* Content Area (Rendered ONLY when expanded) */}
            {!isSidebarShrinked && (
              <div
                className={`flex-1 min-h-0 flex flex-col relative ${
                  sideDrawerView === 'chat'
                    ? 'overflow-hidden p-0 h-full w-full'
                    : 'overflow-y-auto p-2.5'
                }`}
              >
                <div className="flex-1 min-h-0 flex flex-col">
                  {sideDrawerView === 'trades' ? (
                    <DailyTradesPanel
                      isVIP={isVIP}
                      userRole={user.role}
                      onOpenPromoModal={onOpenPromoModal}
                      lang={lang}
                      isCompact={false}
                    />
                  ) : sideDrawerView === 'chat' ? (
                    <PublicTradingChat
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin}
                      lang={lang}
                      isCompact={false}
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
            )}
          </aside>
        )}

      {(isResizingSidebar || isResizingBottom) && (
        <div
          className={`fixed inset-0 z-50 select-none bg-transparent ${
            isResizingSidebar ? 'cursor-col-resize' : 'cursor-row-resize'
          }`}
        />
      )}
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

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onLogout={onLogout}
        onOpenPromoModal={onOpenPromoModal}
        onOpenSupportModal={() => setSupportModalOpen(true)}
        lang={lang}
        onToggleLang={onToggleLang}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />

      {/* Temporary Rotate Phone Toast Message when Analysis Mode is activated */}
      {showRotatePrompt && (
        <div className="fixed top-14 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-amber-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 border border-amber-300 animate-bounce pointer-events-auto">
          <Smartphone className="w-4 h-4 text-black shrink-0" />
          <span>{isAr ? 'يرجى تدوير الهاتف لأفضل تجربة 📱' : 'Please rotate your phone for the best experience 📱'}</span>
          <button
            onClick={() => setShowRotatePrompt(false)}
            className="ms-1 p-0.5 rounded hover:bg-black/20 text-black cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
