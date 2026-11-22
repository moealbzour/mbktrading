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
  Layers,
  User,
  Smartphone,
  Gem,
  Lock,
  Wallet,
  Calendar,
  GraduationCap,
  Mail,
  Bell,
  BellOff,
  Download,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { getEffectiveTier, ELITE_LOCK_BADGE_TEXT } from '../../utils/entitlements';
import { UserProfile, MarketSymbol, MarketTicker } from '../../types/trading';
import { useSignalsContext } from '../../context/SignalsContext';
import { useTheme } from '../../context/ThemeContext';
import { syncOwnChatProfile } from '../../services/directMessageService';
import {
  dispatchMobileAppNotification,
  isAppNotificationsEnabled,
  setAppNotificationsEnabled
} from '../../utils/mobileNotifications';

// Modules
import { HeaderTicker } from './HeaderTicker';
import { LiveNewsTicker } from './LiveNewsTicker';
import { MarketInsightsWidget } from './MarketInsightsWidget';
import { SignalsChannelHub } from '../signals/SignalsChannelHub';
import { PublicTradingChat } from '../community/PublicTradingChat';
import { DirectMessagesPanel, DmTargetUser } from '../community/DirectMessagesPanel';
import { UnifiedMessengerHub, MessengerSubTab } from '../community/UnifiedMessengerHub';
import { TradingViewAIPanel } from '../ai/TradingViewAIPanel';
import { TradingViewChart } from '../TradingViewChart';
import { TradingViewLiteChart } from '../TradingViewLiteChart';
import { DailyTradesPanel } from '../signals/DailyTradesPanel';
import { AdminDashboard } from '../admin/AdminDashboard';
import { QuickSignalDrawer } from '../admin/QuickSignalDrawer';
import { MarketHeatmap } from '../insights/MarketHeatmap';
import { PaperTrading } from '../tic/PaperTrading';
import { EconomicCalendarPanel } from '../EconomicCalendarPanel';
import { TradingAcademyPanel } from '../tic/TradingAcademyPanel';
import { CopyTradingPanel } from '../CopyTradingPanel';
import { AutoBotPanel } from '../AutoBotPanel';
import { IndicatorsStorePanel } from '../IndicatorsStorePanel';
import { EliteLockedModule } from '../common/EliteLockedModule';
import { MacroEventAndAnnouncementPopup } from '../common/MacroEventAndAnnouncementPopup';

// Utility Modals
import { SupportDeskModal } from '../modals/SupportDeskModal';
import { RiskCalculatorModal } from '../modals/RiskCalculatorModal';
import { MarketSessionsModal } from '../modals/MarketSessionsModal';
import { UserProfileModal } from '../modals/UserProfileModal';
import { SubscriptionPlansModal } from '../modals/SubscriptionPlansModal';
import { PaymentModal } from '../modals/PaymentModal';

export type WorkspaceView =
  | 'signals'
  | 'chat'
  | 'dm'
  | 'news'
  | 'ai'
  | 'chart'
  | 'paper'
  | 'calendar'
  | 'academy'
  | 'elite'
  | 'admin';
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
}) => {
  const options: { id: ChatDockPosition; labelAr: string; labelEn: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'left', labelAr: 'يسار', labelEn: 'Left', icon: PanelLeft },
    { id: 'bottom', labelAr: 'أسفل', labelEn: 'Down', icon: PanelBottom },
    { id: 'right', labelAr: 'يمين', labelEn: 'Right', icon: PanelRight }
  ];

  return (
    <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633] shrink-0">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentPosition === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectPosition(opt.id)}
            className={`p-1 rounded-[2px] transition-colors cursor-pointer flex items-center justify-center ${
              isActive
                ? 'bg-[#2a3446] text-white'
                : 'text-[#8b95a5] hover:text-white hover:bg-[#161c26]'
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
  onOpenPromoModal,
  lang = 'ar',
  onToggleLang
}) => {
  const [activeView, setActiveView] = useState<WorkspaceView>('signals');
  const [activeMainView, setActiveMainView] = useState<'chart' | 'heatmap'>('chart');
  const [dmTargetUser, setDmTargetUser] = useState<DmTargetUser | null>(null);
  const [messengerSubTab, setMessengerSubTab] = useState<MessengerSubTab>('general');
  const [quickSignalDrawerOpen, setQuickSignalDrawerOpen] = useState<boolean>(false);

  const { themeMode, setThemeMode } = useTheme();

  const {
    unreadDmCount,
    unreadChatCount,
    unreadTradesCount,
    markChatAsRead,
    markTradesAsRead,
    markDmAsRead,
    notificationPermission,
    requestNotificationPermission,
    addToast
  } = useSignalsContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    isAppNotificationsEnabled()
  );
  const isStandaloneApp =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (user?.uid || user?.id) {
      syncOwnChatProfile(user).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const syncNotifPref = () => {
      setNotificationsEnabled(isAppNotificationsEnabled());
    };
    window.addEventListener('mbk-notif-pref-changed', syncNotifPref);
    window.addEventListener('focus', syncNotifPref);
    return () => {
      window.removeEventListener('mbk-notif-pref-changed', syncNotifPref);
      window.removeEventListener('focus', syncNotifPref);
    };
  }, []);

  const handleOpenDmWithUser = (target: DmTargetUser) => {
    setDmTargetUser(target);
    setMessengerSubTab('dm');
    markDmAsRead();
    if (activeView === 'chat' || activeView === 'dm' || chatPosition === 'hide') {
      setActiveMainView('chart');
      setActiveView('chat');
    } else {
      setSideDrawerView('chat');
      localStorage.setItem('mbk_tv_sidebar_view', 'chat');
      setIsSidebarShrinked(false);
      setIsBottomFolded(false);
    }
  };

  const handleToggleHeaderNotifications = async () => {
    soundManager.playClick();
    if (notificationPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        setAppNotificationsEnabled(true);
        setNotificationsEnabled(true);
        soundManager.playSignalPing();
        dispatchMobileAppNotification({
          title: lang === 'ar' ? 'تم تفعيل إشعارات MBK Trading' : 'MBK Trading Notifications Active',
          body:
            lang === 'ar'
              ? 'ستصلك إشعارات الصفقات الجديدة والرسائل الخاصة والشات مباشرة مع تنبيه صوتي.'
              : 'Live trade signals, DMs & VIP chat alerts are now active.',
          tag: 'mbk-alerts-enabled'
        }).catch(() => {});
        addToast({
          title: lang === 'ar' ? 'إشعارات المنصة مفعّلة 🔔' : 'Notifications Enabled 🔔',
          message:
            lang === 'ar'
              ? 'ستظهر التنبيهات كإشعارات هاتف/تطبيق عند وصول صفقة أو رسالة جديدة.'
              : 'You will receive app notifications & chimes for trades, chats & DMs.',
          type: 'success'
        });
      } else if (perm === 'denied') {
        addToast({
          title: lang === 'ar' ? 'الإشعارات محظورة في المتصفح' : 'Notifications Blocked',
          message:
            lang === 'ar'
              ? 'يرجى السماح بالإشعارات من أيقونة القفل بجانب رابط الموقع ثم إعادة المحاولة.'
              : 'Please allow notifications from browser site settings to receive alerts.',
          type: 'info'
        });
      } else {
        addToast({
          title: lang === 'ar' ? 'أضف التطبيق للشاشة الرئيسية' : 'Add to Home Screen',
          message:
            lang === 'ar'
              ? 'على أجهزة iPhone يجب إضافة الاختصار للشاشة الرئيسية لتفعيل إشعارات الويب.'
              : 'On iOS, install the app shortcut to Home Screen first to enable notifications.',
          type: 'info'
        });
      }
      return;
    }

    const next = !notificationsEnabled;
    setAppNotificationsEnabled(next);
    setNotificationsEnabled(next);
    if (next) {
      soundManager.playSignalPing();
      addToast({
        title: lang === 'ar' ? 'تم تشغيل الإشعارات' : 'Notifications Turned On',
        message:
          lang === 'ar'
            ? 'سيصلك إشعار فوري عند وصول توصية أو رسالة جديدة.'
            : 'Alerts resumed for signals, DMs & chat.',
        type: 'success'
      });
    } else {
      addToast({
        title: lang === 'ar' ? 'تم إيقاف الإشعارات مؤقتاً' : 'Notifications Paused',
        message:
          lang === 'ar'
            ? 'تم كتم إشعارات المتصفح المنبثقة حتى تعيد تفعيلها.'
            : 'Browser popup alerts paused.',
        type: 'info'
      });
    }
  };

  // Permanent sidebar: always visible, can be shrinked to chosen topic (trades or chat) to save space
  const [isSidebarShrinked, setIsSidebarShrinked] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_sidebar_shrinked') === 'true';
  });
  const [sideDrawerView, setSideDrawerView] = useState<'trades' | 'chat' | 'dm' | 'ai'>(() => {
    const saved = localStorage.getItem('mbk_tv_sidebar_view');
    if (saved === 'trades' || saved === 'chat' || saved === 'dm' || saved === 'ai') return saved;
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

  // Trader Utility Modals State (Support, Risk Calculator, Sessions, Profile, Plans, Payment)
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<'vip' | 'elite'>('vip');
  const [activeEliteTab, setActiveEliteTab] = useState<'superAi' | 'copyTrading' | 'autoBotTrader' | 'tradingCourse' | 'indicatorsStore'>('superAi');

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
      return { width: '68px', minWidth: '68px', maxWidth: '68px' };
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

  const handleSelectTopic = (topic: 'trades' | 'chat' | 'dm' | 'ai') => {
    soundManager.playClick();
    setSideDrawerView(topic);
    localStorage.setItem('mbk_tv_sidebar_view', topic);
    if (topic === 'trades') markTradesAsRead();
    if (topic === 'chat') markChatAsRead();
    if (topic === 'dm') markDmAsRead();
  };

  const isAr = lang === 'ar';
  const effectiveTier = getEffectiveTier(user);
  const isEliteMember = effectiveTier === 'elite';
  const isVIP = effectiveTier === 'vip' || effectiveTier === 'elite';

  // Find active ticker
  const activeTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];

  const roleUpperForAdmin = (user.role || '').toUpperCase();
  const canPublishQuickSignals =
    Boolean(user.isAdmin) ||
    ['ADMIN', 'ANALYSER', 'ANALYST'].includes(roleUpperForAdmin) ||
    user.email?.toLowerCase() === 'moe.albzour@gmail.com';

  const navItems = [
    {
      id: 'signals' as WorkspaceView | 'heatmap',
      labelAr: 'بوت وتوصيات MBK',
      labelEn: 'MBK Bot & Signals',
      shortAr: 'الإشارات',
      shortEn: 'Signals',
      topicAr: 'صفقات VIP والبوت المباشرة',
      topicEn: 'Live VIP & Bot Setups',
      icon: Radio,
      badge: unreadTradesCount
    },
    {
      id: 'chart' as WorkspaceView | 'heatmap',
      labelAr: 'الشارت المباشر',
      labelEn: 'Live Chart',
      shortAr: 'الشارت',
      shortEn: 'Chart',
      topicAr: 'شارت الأسواق اللحظي',
      topicEn: 'Real-Time Market Chart',
      icon: BarChart2
    },
    {
      id: 'chat' as WorkspaceView | 'heatmap',
      labelAr: 'ماسنجر المتداولين',
      labelEn: 'MBK Messenger',
      shortAr: 'الماسنجر',
      shortEn: 'Messenger',
      topicAr: 'الشات العام والرسائل الخاصة',
      topicEn: 'Trading Floor & Direct DMs',
      icon: MessageSquare,
      badge: (unreadChatCount || 0) + (unreadDmCount || 0)
    },
    {
      id: 'heatmap' as WorkspaceView | 'heatmap',
      labelAr: 'الخريطة الحرارية',
      labelEn: 'Heatmap',
      shortAr: 'الخريطة',
      shortEn: 'Heatmap',
      topicAr: 'تتبع السيولة وقوة العملات',
      topicEn: 'Market Liquidity & Strength',
      icon: Flame
    },
    {
      id: 'ai' as WorkspaceView | 'heatmap',
      labelAr: 'ذكاء MBK',
      labelEn: 'MBK AI',
      shortAr: 'الذكاء',
      shortEn: 'AI',
      topicAr: 'المحلل الكمي الذكي للأسواق',
      topicEn: 'Quantitative Market Analyst',
      icon: Bot
    },
    {
      id: 'paper' as WorkspaceView | 'heatmap',
      labelAr: 'التداول التجريبي',
      labelEn: 'Paper Trading',
      shortAr: 'تجريبي',
      shortEn: 'Paper',
      topicAr: 'محفظة تدريب بدون مخاطرة',
      topicEn: 'Risk-Free Practice Desk',
      icon: Wallet
    },
    {
      id: 'calendar' as WorkspaceView | 'heatmap',
      labelAr: 'التقويم الاقتصادي',
      labelEn: 'Calendar',
      shortAr: 'التقويم',
      shortEn: 'Calendar',
      topicAr: 'مواعيد الأخبار والفائدة',
      topicEn: 'Macro Events & Rates',
      icon: Calendar
    },
    {
      id: 'academy' as WorkspaceView | 'heatmap',
      labelAr: 'الأكاديمية',
      labelEn: 'Academy',
      shortAr: 'الأكاديمية',
      shortEn: 'Academy',
      topicAr: 'دروس واستراتيجيات التداول',
      topicEn: 'Courses & Trading Playbooks',
      icon: GraduationCap
    },
    {
      id: 'elite' as WorkspaceView | 'heatmap',
      labelAr: 'باقة Elite',
      labelEn: 'Elite',
      shortAr: 'Elite',
      shortEn: 'Elite',
      topicAr: 'نسخ الصفقات والمؤشرات الخاصة',
      topicEn: 'Copy Trading & Indicators',
      icon: Gem
    },
    {
      id: 'news' as WorkspaceView | 'heatmap',
      labelAr: 'أخبار MBK',
      labelEn: 'MBK News',
      shortAr: 'الأخبار',
      shortEn: 'News',
      topicAr: 'التدفق الإخباري العاجل',
      topicEn: 'Breaking Financial Wire',
      icon: Newspaper
    },
    // Staff CRM & Admin Dashboard (verified RBAC: ADMIN, MODERATOR, SALES, ANALYSER)
    ...((() => {
      const roleUpper = (user.role || '').toUpperCase();
      const isStaffUser =
        ['ADMIN', 'MODERATOR', 'SALES', 'ANALYSER', 'ANALYST'].includes(roleUpper) ||
        Boolean(user.isAdmin) ||
        user.email?.toLowerCase() === 'moe.albzour@gmail.com';
      if (!isStaffUser) return [];

      const isAnalyserRole = ['ANALYSER', 'ANALYST'].includes(roleUpper) && !user.isAdmin;
      const isModOrSales = ['MODERATOR', 'SALES'].includes(roleUpper) && !user.isAdmin;

      return [{
        id: 'admin' as WorkspaceView | 'heatmap',
        labelAr: isAnalyserRole
          ? 'مركز النشر'
          : isModOrSales
          ? 'إدارة العملاء'
          : 'لوحة الإدارة',
        labelEn: isAnalyserRole
          ? 'Publishing'
          : isModOrSales
          ? 'CRM'
          : 'Admin Hub',
        shortAr: isAnalyserRole ? 'النشر' : isModOrSales ? 'CRM' : 'الإدارة',
        shortEn: isAnalyserRole ? 'Publish' : isModOrSales ? 'CRM' : 'Admin',
        topicAr: isAnalyserRole ? 'نشر وإدارة الصفقات' : 'إدارة الأعضاء والصفقات',
        topicEn: isAnalyserRole ? 'Signal Desk Publishing' : 'Members, Keys & Signals',
        icon: Shield
      }];
    })())
  ];

  return (
    <div
      className="h-screen h-[100dvh] max-h-[100dvh] w-full max-w-full bg-[#0a0d12] text-[#f1f5f9] flex flex-col font-sans select-none overflow-hidden antialiased"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. INSTITUTIONAL COMMAND HEADER — SHARP GEOMETRY, MONOCHROME PRECISION, ZERO DUPLICATE BUTTONS */}
      <header className="h-11 bg-[#10141c] border-b border-[#1e2633] px-2.5 sm:px-3.5 flex items-center justify-between shrink-0 z-40 gap-2">
        {/* Left: Brand Lockup & Monochrome Workspace Layout Controls */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/mbk-logo.png"
              alt="MBK Trading"
              className="h-7 w-auto rounded-[3px] object-contain border border-[#1e2633] bg-[#0a0d12]"
            />
            <span className="font-bold text-white text-xs sm:text-[13px] tracking-tight whitespace-nowrap">
              MBK TRADING
            </span>
          </div>

          {/* Monochrome Workspace Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633] text-[11px] shrink-0">
            <button
              onClick={toggleNavRail}
              className={`px-2 py-1 rounded-[2px] flex items-center gap-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                !isNavRailFolded
                  ? 'bg-[#161c26] text-white border border-[#2a3446]'
                  : 'text-[#8b95a5] hover:text-white border border-transparent'
              }`}
              title={isAr ? (!isNavRailFolded ? 'تصغير القائمة الجانبية' : 'توسيع القائمة الجانبية') : (!isNavRailFolded ? 'Collapse Sidebar' : 'Expand Sidebar')}
            >
              <Layers className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'القائمة' : 'Menu'}</span>
            </button>

            <button
              onClick={togglePriceTicker}
              className={`px-2 py-1 rounded-[2px] flex items-center gap-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showPriceTicker
                  ? 'bg-[#161c26] text-white border border-[#2a3446]'
                  : 'text-[#8b95a5] hover:text-white border border-transparent'
              }`}
              title={isAr ? (showPriceTicker ? 'إخفاء شريط الأسعار' : 'إظهار شريط الأسعار') : (showPriceTicker ? 'Hide Ticker' : 'Show Ticker')}
            >
              <Activity className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'الأسعار' : 'Ticker'}</span>
            </button>

            <button
              onClick={toggleNewsBanner}
              className={`px-2 py-1 rounded-[2px] flex items-center gap-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showNewsBanner
                  ? 'bg-[#161c26] text-white border border-[#2a3446]'
                  : 'text-[#8b95a5] hover:text-white border border-transparent'
              }`}
              title={isAr ? (showNewsBanner ? 'إخفاء شريط الأخبار' : 'إظهار شريط الأخبار') : (showNewsBanner ? 'Hide News' : 'Show News')}
            >
              <Newspaper className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'الأخبار' : 'News'}</span>
            </button>

            <div className="h-3.5 w-[1px] bg-[#1e2633] mx-0.5" />

            <ChatDockControls
              currentPosition={chatPosition}
              onSelectPosition={handleSetChatPosition}
              isAr={isAr}
              compact
            />
          </div>

          {/* Mobile Workspace Customization Trigger */}
          <button
            onClick={() => {
              soundManager.playClick();
              setMobileWorkspaceMenuOpen(prev => !prev);
            }}
            className={`md:hidden p-1.5 rounded-[3px] border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
              mobileWorkspaceMenuOpen
                ? 'bg-[#161c26] border-[#2a3446] text-white'
                : 'bg-[#0a0d12] border-[#1e2633] text-[#8b95a5] hover:text-white'
            }`}
            title={isAr ? 'تخصيص مساحة العمل' : 'Workspace Layout'}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Quick Signal Publisher (Staff), 3-State Theme Control, Desk Utilities & Account */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Slide-Over Signal Publisher Trigger (Admin / Analyst) */}
          {canPublishQuickSignals && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setQuickSignalDrawerOpen(true);
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#161c26] hover:bg-[#1c2430] border border-[#2a3446] text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
              title={isAr ? 'نشر صفقة سريعة أو إدارة الصفقات من أي صفحة' : 'Quick Publish Signal / Manage Trades'}
            >
              <Plus className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="hidden sm:inline">{isAr ? 'نشر صفقة' : 'Publish Trade'}</span>
            </button>
          )}

          {/* 3-State Segmented Theme Selector (Auto | Dark | Light) */}
          <div
            className="flex items-center bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633] text-[10px] font-semibold shrink-0"
            role="group"
            aria-label="Theme Switcher"
          >
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setThemeMode('auto');
              }}
              className={`px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'auto'
                  ? 'bg-[#2a3446] text-white'
                  : 'text-[#8b95a5] hover:text-white'
              }`}
              title={isAr ? 'تلقائي حسب النظام' : 'Auto System Theme'}
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'تلقائي' : 'Auto'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setThemeMode('dark');
              }}
              className={`px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'dark'
                  ? 'bg-[#2a3446] text-white'
                  : 'text-[#8b95a5] hover:text-white'
              }`}
              title={isAr ? 'الوضع الليلي المؤسسي' : 'Obsidian Dark Mode'}
            >
              <Moon className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'ليلي' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setThemeMode('light');
              }}
              className={`px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'light'
                  ? 'bg-[#2a3446] text-white'
                  : 'text-[#8b95a5] hover:text-white'
              }`}
              title={isAr ? 'الوضع النهاري المؤسسي' : 'Daylight Mode'}
            >
              <Sun className="w-3 h-3" />
              <span className="hidden xl:inline">{isAr ? 'نهاري' : 'Light'}</span>
            </button>
          </div>

          {/* Analysis Mode Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsAnalysisMode((prev) => !prev);
            }}
            className={`px-2 py-1 rounded-[3px] border text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
              isAnalysisMode
                ? 'bg-[#10b981] text-white border-[#10b981]'
                : 'bg-[#0a0d12] hover:bg-[#161c26] border-[#1e2633] text-[#8b95a5] hover:text-white'
            }`}
            title={
              isAnalysisMode
                ? (isAr ? 'خروج من وضع التحليل' : 'Exit Full Chart')
                : (isAr ? 'وضع الشارت الكامل' : 'Full Chart Mode')
            }
          >
            {isAnalysisMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isAr ? 'شارت كامل' : 'Full Chart'}</span>
          </button>

          {/* Clean Institutional Account Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setProfileModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] hover:border-[#2a3446] text-xs transition-colors cursor-pointer shrink-0"
            title={isAr ? 'الملف الشخصي والحساب' : 'Profile & Account'}
          >
            <div className="w-5 h-5 rounded-[2px] bg-[#161c26] border border-[#2a3446] text-white flex items-center justify-center font-mono font-bold text-[10px] uppercase shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name ? user.name[0].toUpperCase() : <User className="w-3 h-3" />
              )}
            </div>
            <span className="font-semibold text-white truncate max-w-[70px] sm:max-w-[110px] text-[11px] hidden xxs:inline">
              {user.name || user.email.split('@')[0]}
            </span>
            <span className="text-[10px] font-mono text-[#8b95a5] hidden sm:inline">
              · {isEliteMember ? 'ELITE' : isVIP ? 'VIP' : 'STD'}
            </span>
          </button>

          {/* Plans CTA */}
          <button
            onClick={() => {
              soundManager.playClick();
              setPlansModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-[3px] bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            title={isAr ? 'الباقات والاشتراك' : 'Subscription Plans'}
          >
            <span>{isAr ? 'الباقات' : 'Plans'}</span>
          </button>

          {/* Notification Bell Toggle */}
          <button
            type="button"
            onClick={handleToggleHeaderNotifications}
            className={`p-1.5 rounded-[3px] border transition-colors cursor-pointer shrink-0 ${
              notificationPermission === 'granted' && notificationsEnabled
                ? 'bg-[#161c26] border-[#2a3446] text-white'
                : 'bg-[#0a0d12] hover:bg-[#161c26] border-[#1e2633] text-[#8b95a5] hover:text-white'
            }`}
            title={
              notificationPermission === 'granted' && notificationsEnabled
                ? isAr
                  ? 'الإشعارات الفورية مفعلة (اضغط للإيقاف المؤقت)'
                  : 'App Notifications ON (Click to pause)'
                : isAr
                ? 'تفعيل إشعارات الصفقات والشات والرسائل الخاصة'
                : 'Enable Mobile/Browser Notifications'
            }
          >
            {notificationPermission === 'granted' && notificationsEnabled ? (
              <Bell className="w-3.5 h-3.5" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Install Mobile Home Screen Shortcut */}
          {!isStandaloneApp && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
              }}
              className="p-1.5 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[#8b95a5] hover:text-white transition-colors cursor-pointer shrink-0"
              title={isAr ? 'تثبيت التطبيق' : 'Install App'}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sound Mute */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[#8b95a5] hover:text-white transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Lang Toggle */}
          {onToggleLang && (
            <button
              onClick={onToggleLang}
              className="px-2 py-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[10px] font-mono font-semibold text-[#8b95a5] hover:text-white transition-colors cursor-pointer shrink-0"
              title={isAr ? 'English' : 'عربي'}
            >
              {isAr ? 'EN' : 'AR'}
            </button>
          )}

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded-[3px] bg-[#0a0d12] hover:bg-[#e11d48]/15 border border-[#1e2633] text-[#8b95a5] hover:text-[#e11d48] transition-colors cursor-pointer shrink-0"
            title={isAr ? 'تسجيل الخروج' : 'Logout'}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MOBILE HORIZONTAL NAVIGATION STRIP (Visible ONLY on mobile <768px so desktop has zero duplicated nav bars) */}
      <nav className="flex md:hidden items-center gap-1 px-2 py-1 bg-[#10141c] border-b border-[#1e2633] shrink-0 z-30 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive =
            item.id === 'heatmap'
              ? activeMainView === 'heatmap'
              : activeMainView === 'chart' && activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={`mob-nav-${item.id}`}
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (item.id === 'signals') markTradesAsRead();
                if (item.id === 'chat') markChatAsRead();
                if (item.id === 'dm') markDmAsRead();

                if (item.id === 'heatmap') {
                  setActiveMainView('heatmap');
                } else {
                  setActiveMainView('chart');
                  setActiveView(item.id as WorkspaceView);
                }
              }}
              className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[#161c26] text-white border border-[#2a3446]'
                  : 'text-[#8b95a5] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? item.shortAr : item.shortEn}</span>
              {'badge' in item && Number(item.badge) > 0 && (
                <span className="font-mono text-[10px] text-[#e11d48] font-bold">
                  ({Number(item.badge) > 99 ? '99+' : item.badge})
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* MOBILE WORKSPACE CUSTOMIZATION DROPDOWN */}
      {mobileWorkspaceMenuOpen && (
        <div className="md:hidden bg-[#10141c] border-b border-[#1e2633] p-3 space-y-2.5 z-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              {isAr ? 'إعدادات مساحة العمل' : 'Workspace Layout'}
            </span>
            <button
              onClick={() => setMobileWorkspaceMenuOpen(false)}
              className="p-1 rounded-[2px] text-[#8b95a5] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              onClick={togglePriceTicker}
              className={`p-1.5 rounded-[3px] border flex items-center justify-center gap-1 font-medium cursor-pointer ${
                showPriceTicker
                  ? 'bg-[#161c26] border-[#2a3446] text-white'
                  : 'bg-[#0a0d12] border-[#1e2633] text-[#8b95a5]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isAr ? 'الأسعار' : 'Ticker'}</span>
            </button>

            <button
              onClick={toggleNewsBanner}
              className={`p-1.5 rounded-[3px] border flex items-center justify-center gap-1 font-medium cursor-pointer ${
                showNewsBanner
                  ? 'bg-[#161c26] border-[#2a3446] text-white'
                  : 'bg-[#0a0d12] border-[#1e2633] text-[#8b95a5]'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isAr ? 'الأخبار' : 'News'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setIsAnalysisMode((prev) => !prev);
                setMobileWorkspaceMenuOpen(false);
              }}
              className={`p-1.5 rounded-[3px] border flex items-center justify-center gap-1 font-medium cursor-pointer ${
                isAnalysisMode
                  ? 'bg-[#10b981] border-[#10b981] text-white'
                  : 'bg-[#0a0d12] border-[#1e2633] text-[#8b95a5]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isAr ? 'شارت كامل' : 'Full Chart'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. LIVE PRICE TICKER */}
      <div className={`transition-all duration-200 relative group/ticker overflow-hidden shrink-0 ${
        showPriceTicker ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <HeaderTicker tickers={tickers} onSelectSymbol={onSelectSymbol} lang={lang} />
        <button
          onClick={togglePriceTicker}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 p-1 rounded-[2px] bg-[#10141c] hover:bg-[#161c26] text-[#8b95a5] hover:text-white border border-[#1e2633] transition-opacity cursor-pointer opacity-75 group-hover/ticker:opacity-100 flex items-center"
          title={isAr ? 'طي شريط الأسعار' : 'Fold price ticker'}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2b. REAL RSS FINANCIAL NEWS BANNER */}
      <div className={`transition-all duration-200 relative group/news overflow-hidden shrink-0 ${
        showNewsBanner ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <LiveNewsTicker lang={lang} />
        <button
          onClick={toggleNewsBanner}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 p-1 rounded-[2px] bg-[#10141c] hover:bg-[#161c26] text-[#8b95a5] hover:text-white border border-[#1e2633] transition-opacity cursor-pointer opacity-75 group-hover/news:opacity-100 flex items-center"
          title={isAr ? 'طي شريط الأخبار' : 'Fold news banner'}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. MAIN WORKSPACE CANVAS (SINGLE UNIFIED NAVIGATION SIDEBAR + MAIN VIEWPORT + COMPANION DOCK) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* SINGLE PRIMARY NAVIGATION SIDEBAR (Expandable on desktop with clean monochrome typography, or compact 48px icon rail) */}
        <aside
          className={`hidden md:flex bg-[#10141c] border-e border-[#1e2633] flex-col justify-between shrink-0 z-30 select-none overflow-y-auto scrollbar-none transition-all duration-200 relative ${
            isNavRailFolded ? 'w-12 py-2 items-center' : 'w-44 lg:w-48 py-2 px-1.5'
          }`}
        >
          <div className="flex flex-col gap-0.5 w-full">
            {/* Sidebar Collapse / Expand Toggle Header */}
            <div className={`flex items-center ${isNavRailFolded ? 'justify-center' : 'justify-between px-2'} pb-1.5 mb-1 border-b border-[#1e2633]`}>
              {!isNavRailFolded && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5e6878]">
                  {isAr ? 'وحدات المنصة' : 'TERMINAL DESK'}
                </span>
              )}
              <button
                onClick={toggleNavRail}
                className="p-1 rounded-[3px] text-[#8b95a5] hover:text-white hover:bg-[#161c26] transition-colors cursor-pointer"
                title={isAr ? (isNavRailFolded ? 'توسيع القائمة' : 'تصغير القائمة') : (isNavRailFolded ? 'Expand Navigation' : 'Collapse Navigation')}
              >
                {isNavRailFolded ? (
                  isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {navItems.map((item) => {
              const isActive =
                item.id === 'heatmap'
                  ? activeMainView === 'heatmap'
                  : activeMainView === 'chart' && activeView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundManager.playClick();
                    if (item.id === 'signals') markTradesAsRead();
                    if (item.id === 'chat') markChatAsRead();
                    if (item.id === 'dm') markDmAsRead();

                    if (item.id === 'heatmap') {
                      setActiveMainView('heatmap');
                    } else {
                      setActiveMainView('chart');
                      setActiveView(item.id as WorkspaceView);
                    }
                  }}
                  className={`${
                    isNavRailFolded
                      ? 'w-9 h-9 mx-auto justify-center'
                      : 'w-full px-2.5 py-2 justify-between'
                  } rounded-[3px] flex items-center relative transition-colors cursor-pointer group ${
                    isActive
                      ? 'bg-[#161c26] text-white font-semibold border border-[#2a3446]'
                      : 'text-[#8b95a5] hover:text-white hover:bg-[#161c26]/60 border border-transparent'
                  }`}
                  title={isAr ? item.labelAr : item.labelEn}
                >
                  {/* Active Left Accent Indicator */}
                  {isActive && (
                    <div className="absolute start-0 top-1.5 bottom-1.5 w-[2px] bg-[#10b981]" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8b95a5] group-hover:text-white'}`} />
                    {!isNavRailFolded && (
                      <span className="text-xs truncate whitespace-nowrap">
                        {isAr ? item.labelAr : item.labelEn}
                      </span>
                    )}
                  </div>

                  {'badge' in item && Number(item.badge) > 0 && (
                    <span
                      className={`${
                        isNavRailFolded
                          ? 'absolute -top-1 -end-1 min-w-[15px] h-[15px] px-0.5 text-[9px]'
                          : 'px-1.5 py-0.2 text-[10px]'
                      } rounded-[2px] bg-[#e11d48] text-white font-mono font-bold flex items-center justify-center shrink-0`}
                    >
                      {Number(item.badge) > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desk Utilities Footer (Monochrome Institutional Tools) */}
          <div className="flex flex-col gap-0.5 pt-2 border-t border-[#1e2633] w-full">
            {!isNavRailFolded && (
              <span className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#5e6878]">
                {isAr ? 'أدوات المكتب' : 'DESK TOOLS'}
              </span>
            )}
            <button
              onClick={() => {
                soundManager.playClick();
                setCalculatorModalOpen(true);
              }}
              className={`${
                isNavRailFolded ? 'w-9 h-9 mx-auto justify-center' : 'w-full px-2.5 py-1.5 justify-start gap-2.5'
              } rounded-[3px] flex items-center text-[#8b95a5] hover:text-white hover:bg-[#161c26] transition-colors cursor-pointer text-xs`}
              title={isAr ? 'حاسبة اللوت وإدارة المخاطر' : 'Risk & Lot Calculator'}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              {!isNavRailFolded && <span className="truncate">{isAr ? 'حاسبة المخاطر' : 'Risk Calculator'}</span>}
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setSessionsModalOpen(true);
              }}
              className={`${
                isNavRailFolded ? 'w-9 h-9 mx-auto justify-center' : 'w-full px-2.5 py-1.5 justify-start gap-2.5'
              } rounded-[3px] flex items-center text-[#8b95a5] hover:text-white hover:bg-[#161c26] transition-colors cursor-pointer text-xs`}
              title={isAr ? 'جلسات التداول العالمية' : 'Market Sessions'}
            >
              <Clock className="w-4 h-4 shrink-0" />
              {!isNavRailFolded && <span className="truncate">{isAr ? 'جلسات السوق' : 'Market Sessions'}</span>}
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setSupportModalOpen(true);
              }}
              className={`${
                isNavRailFolded ? 'w-9 h-9 mx-auto justify-center' : 'w-full px-2.5 py-1.5 justify-start gap-2.5'
              } rounded-[3px] flex items-center text-[#8b95a5] hover:text-white hover:bg-[#161c26] transition-colors cursor-pointer text-xs`}
              title={isAr ? 'الدعم الفني 24/7' : '24/7 Desk Support'}
            >
              <Headphones className="w-4 h-4 shrink-0" />
              {!isNavRailFolded && <span className="truncate">{isAr ? 'الدعم الفني' : 'Desk Support'}</span>}
            </button>
          </div>
        </aside>

        {/* CENTER WORKSPACE: MAIN VIEWPORT + DOCKABLE BOTTOM COMPANION */}
        {activeMainView === 'heatmap' ? (
          <main className="flex-1 min-w-0 h-full w-full overflow-y-auto p-3 sm:p-5 bg-[#0a0d12] z-30">
            <MarketHeatmap lang={lang} />
          </main>
        ) : (
          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${getMainCenterOrder()} relative`}>
          {/* MAIN VIEWPORT */}
          {isAnalysisMode ? (
            <main className="flex-1 min-h-0 h-full w-full overflow-hidden relative bg-[#0a0d12] p-0 z-30">
              <TradingViewChart
                symbol={selectedSymbol}
                onSymbolChange={onSelectSymbol}
                tickers={tickers}
              />
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsAnalysisMode(false);
                }}
                className="absolute top-3 end-3 z-50 px-3 py-1.5 rounded-[3px] bg-[#10141c] hover:bg-[#161c26] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2a3446]"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'إنهاء الشارت الكامل' : 'Exit Full Chart'}</span>
              </button>
            </main>
          ) : isMobile && activeView === 'chart' ? (
            /* MOBILE VERTICAL SPLIT: LITE CHART (TOP) + MARKET INSIGHTS + COMPANION DOCK (3 UNIFIED TABS) */
            <main className="flex-1 min-h-0 h-full overflow-hidden flex flex-col bg-[#0a0d12]">
              <div className="h-[26vh] sm:h-60 w-full shrink-0 border-b border-[#1e2633] bg-[#0a0d12] overflow-hidden relative">
                <TradingViewLiteChart
                  symbol={selectedSymbol}
                  onSymbolChange={onSelectSymbol}
                  tickers={tickers}
                  lang={lang}
                />
                <button
                  onClick={() => {
                    soundManager.playClick();
                    handleEnableAnalysisMode();
                  }}
                  className="absolute top-2 end-2 z-20 px-2.5 py-1 rounded-[3px] bg-[#10141c]/90 hover:bg-[#161c26] text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-[#2a3446]"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{isAr ? 'شارت كامل' : 'Full Chart'}</span>
                </button>
              </div>

              {isBottomFolded && (
                <div className="flex-1 min-h-0 w-full overflow-y-auto p-2 border-b border-[#1e2633]">
                  <MarketInsightsWidget
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={onSelectSymbol}
                    lang={lang}
                    activeTicker={activeTicker}
                  />
                </div>
              )}

              <div
                className={`w-full bg-[#10141c] border-t border-[#1e2633] flex flex-col overflow-hidden relative ${
                  isBottomFolded
                    ? 'h-[42px] min-h-[42px] max-h-[42px] shrink-0'
                    : 'flex-1 min-h-0'
                }`}
              >
                <div className="px-2.5 py-1 bg-[#10141c] border-b border-[#1e2633] flex items-center justify-between shrink-0 gap-2 h-[38px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={toggleBottomFold}
                      className="px-2 py-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[#8b95a5] hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
                    >
                      {isBottomFolded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">{isAr ? 'توسيع' : 'Expand'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{isAr ? 'طي' : 'Fold'}</span>
                        </>
                      )}
                    </button>

                    {/* 3 Unified Companion Tabs: Signals | Messenger | Analyst AI */}
                    <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633]">
                      <button
                        onClick={() => handleSelectTopic('trades')}
                        className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'trades' ? 'bg-[#161c26] text-white border border-[#2a3446]' : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>{isAr ? 'الإشارات' : 'Signals'}</span>
                        {unreadTradesCount > 0 && (
                          <span className="font-mono text-[10px] text-[#10b981]">({unreadTradesCount})</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSelectTopic('chat')}
                        className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'chat' || sideDrawerView === 'dm'
                            ? 'bg-[#161c26] text-white border border-[#2a3446]'
                            : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{isAr ? 'الماسنجر' : 'Messenger'}</span>
                        {unreadChatCount + unreadDmCount > 0 && (
                          <span className="font-mono text-[10px] text-[#e11d48]">
                            ({unreadChatCount + unreadDmCount})
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSelectTopic('ai')}
                        className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          sideDrawerView === 'ai' ? 'bg-[#161c26] text-white border border-[#2a3446]' : 'text-[#8b95a5] hover:text-white'
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        <span>{isAr ? 'التحليل' : 'Analyst AI'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`flex-1 min-h-0 h-full overflow-hidden ${isBottomFolded ? 'hidden' : 'block'}`}>
                  {sideDrawerView === 'trades' && (
                    <DailyTradesPanel
                      user={user}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'ANALYSER'}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      lang={lang}
                      isCompact={true}
                    />
                  )}
                  {(sideDrawerView === 'chat' || sideDrawerView === 'dm') && (
                    <UnifiedMessengerHub
                      user={user}
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'MODERATOR'}
                      isMutedFromChat={user.isMutedFromChat}
                      activeTab={sideDrawerView === 'dm' ? 'dm' : messengerSubTab}
                      onSelectTab={(tab) => {
                        setMessengerSubTab(tab);
                        setSideDrawerView(tab === 'dm' ? 'dm' : 'chat');
                        if (tab === 'general') markChatAsRead();
                        else markDmAsRead();
                      }}
                      unreadChatCount={unreadChatCount}
                      unreadDmCount={unreadDmCount}
                      dmTargetUser={dmTargetUser}
                      onClearDmTarget={() => setDmTargetUser(null)}
                      onStartDirectMessage={(target) => {
                        setDmTargetUser(target);
                        setMessengerSubTab('dm');
                        setSideDrawerView('dm');
                        markDmAsRead();
                      }}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      onSelectSymbol={onSelectSymbol}
                      lang={lang}
                      isCompact={true}
                    />
                  )}
                  {sideDrawerView === 'ai' && (
                    <div className="h-full overflow-y-auto p-2">
                      <TradingViewAIPanel
                        user={user}
                        isVIP={isVIP}
                        activeSymbol={selectedSymbol}
                        currentPrice={activeTicker?.price || 20850}
                        onOpenPromoModal={onOpenPromoModal}
                        onOpenPlansModal={() => setPlansModalOpen(true)}
                        lang={lang}
                      />
                    </div>
                  )}
                </div>
              </div>
            </main>
          ) : activeView === 'chat' || activeView === 'dm' ? (
            <main className="flex-1 min-h-0 h-full overflow-hidden p-1 sm:p-2.5 flex flex-col bg-[#131722]">
              <div className="flex-1 min-h-0 h-full w-full rounded-xl overflow-hidden border border-[#2a2e39] shadow-2xl flex flex-col bg-[#1e222d]">
                <UnifiedMessengerHub
                  user={user}
                  currentUserName={user.name || user.email.split('@')[0]}
                  isVIP={isVIP}
                  userRole={user.role}
                  isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'MODERATOR'}
                  isMutedFromChat={user.isMutedFromChat}
                  activeTab={activeView === 'dm' ? 'dm' : messengerSubTab}
                  onSelectTab={(tab) => {
                    setMessengerSubTab(tab);
                    if (activeView === 'dm') setActiveView('chat');
                    if (tab === 'general') markChatAsRead();
                    else markDmAsRead();
                  }}
                  unreadChatCount={unreadChatCount}
                  unreadDmCount={unreadDmCount}
                  dmTargetUser={dmTargetUser}
                  onClearDmTarget={() => setDmTargetUser(null)}
                  onStartDirectMessage={(target) => {
                    setDmTargetUser(target);
                    setMessengerSubTab('dm');
                    markDmAsRead();
                  }}
                  onOpenPromoModal={onOpenPromoModal}
                  onOpenPlansModal={() => setPlansModalOpen(true)}
                  onSelectSymbol={(sym) => {
                    onSelectSymbol(sym);
                    setActiveMainView('chart');
                    setActiveView('chart');
                  }}
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
                    user={user}
                    isVIP={isVIP}
                    userRole={user.role}
                    isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'ANALYSER'}
                    tickers={tickers}
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={onSelectSymbol}
                    onOpenPromoModal={onOpenPromoModal}
                    onOpenPlansModal={() => setPlansModalOpen(true)}
                    lang={lang}
                  />
                )}

                {/* VIEW 2: TRADINGVIEW LIVE ADVANCED CHART VIEW */}
                {activeView === 'chart' && (
                  <div className="flex flex-col space-y-4 w-full">
                    <div className={`${isBottomFolded ? 'h-[calc(100vh-280px)] min-h-[380px]' : 'h-[450px] sm:h-[500px]'} w-full rounded-xl overflow-hidden border border-[#2a2e39] shadow-2xl relative transition-all duration-300 shrink-0`}>
                      <TradingViewChart
                        symbol={selectedSymbol}
                        onSymbolChange={onSelectSymbol}
                        tickers={tickers}
                      />
                    </div>
                    <div className="w-full animate-in fade-in transition-all shrink-0">
                      <MarketInsightsWidget
                        selectedSymbol={selectedSymbol}
                        onSymbolChange={onSelectSymbol}
                        lang={lang}
                        activeTicker={activeTicker}
                      />
                    </div>
                  </div>
                )}

                {/* VIEW 4: AI MARKET ANALYST FULL VIEW */}
                {activeView === 'ai' && (
                  <div className="min-h-[calc(100vh-150px)] rounded-2xl overflow-hidden border border-[#2a2e39]">
                    <TradingViewAIPanel
                      user={user}
                      isVIP={isVIP}
                      activeSymbol={selectedSymbol}
                      currentPrice={activeTicker?.price || 20850}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      lang={lang}
                    />
                  </div>
                )}

                {/* FREE TIER BASIC TOOL: PAPER TRADING */}
                {activeView === 'paper' && (
                  <PaperTrading
                    tickers={tickers}
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={onSelectSymbol}
                  />
                )}

                {/* FREE TIER BASIC TOOL: ECONOMIC CALENDAR */}
                {activeView === 'calendar' && <EconomicCalendarPanel lang={lang} />}

                {/* FREE TIER BASIC TOOL: ACADEMY */}
                {activeView === 'academy' && <TradingAcademyPanel lang={lang} />}

                {/* ELITE LOCKED MODULES HUB */}
                {activeView === 'elite' && (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#1e222d] border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400">
                          <Gem className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                            <span>🔒 {isAr ? 'وحدات باقة Elite المؤسسية ($500/mo)' : 'Elite Tier Modules ($500/mo)'}</span>
                          </h2>
                          <p className="text-xs text-[#8a93a6] mt-0.5">{ELITE_LOCK_BADGE_TEXT}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setPlansModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        {isAr ? 'عرض مقارنة الباقات' : 'Compare Plans'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-[#1e222d] p-1.5 rounded-xl border border-[#2a2e39]">
                      {[
                        { id: 'superAi' as const, labelAr: '🔒 Super AI', labelEn: '🔒 Super AI' },
                        { id: 'copyTrading' as const, labelAr: '🔒 Copy Trading', labelEn: '🔒 Copy Trading' },
                        { id: 'autoBotTrader' as const, labelAr: '🔒 Auto Bot Trader', labelEn: '🔒 Auto Bot Trader' },
                        { id: 'tradingCourse' as const, labelAr: '🔒 Trading Course', labelEn: '🔒 Trading Course' },
                        { id: 'indicatorsStore' as const, labelAr: '🔒 Indicators Store', labelEn: '🔒 Indicators Store' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setActiveEliteTab(tab.id);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            activeEliteTab === tab.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-[#8a93a6] hover:text-white'
                          }`}
                        >
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>{isAr ? tab.labelAr.replace('🔒 ', '') : tab.labelEn.replace('🔒 ', '')}</span>
                        </button>
                      ))}
                    </div>

                    {activeEliteTab === 'superAi' && (
                      <EliteLockedModule
                        titleAr="المساعد الفائق (Super AI)"
                        titleEn="Super AI"
                        subtitleAr="المساعد الصوتي المباشر، تحليل الشارت بالرؤية الذكية، وإدارة المحافظ الآلية."
                        subtitleEn="Live voice assistant, Chart Vision OCR, and autonomous portfolio AI."
                        lang={lang}
                        onViewPlans={() => setPlansModalOpen(true)}
                      />
                    )}
                    {activeEliteTab === 'copyTrading' && (
                      <CopyTradingPanel lang={lang} onViewPlans={() => setPlansModalOpen(true)} />
                    )}
                    {activeEliteTab === 'autoBotTrader' && (
                      <AutoBotPanel lang={lang} onViewPlans={() => setPlansModalOpen(true)} />
                    )}
                    {activeEliteTab === 'tradingCourse' && (
                      <EliteLockedModule
                        titleAr="الدورة الاحترافية للتداول (Trading Course)"
                        titleEn="Institutional Trading Course"
                        subtitleAr="منهج احترافي متكامل بالفيديو لاستراتيجيات السيولة والأسواق المؤسسية."
                        subtitleEn="Full video masterclass covering liquidity sweeps and institutional execution."
                        lang={lang}
                        onViewPlans={() => setPlansModalOpen(true)}
                      />
                    )}
                    {activeEliteTab === 'indicatorsStore' && (
                      <IndicatorsStorePanel lang={lang} onViewPlans={() => setPlansModalOpen(true)} />
                    )}
                  </div>
                )}

                {/* VIEW 5: EXPANDED NEWS WIRES */}
                {activeView === 'news' && (
                  <div className="space-y-4">
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-[#089981]" />
                        <h2 className="text-sm font-bold text-white">
                          {isAr ? 'أخبار MBK' : 'MBK News'}
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-[#089981]">MBK NEWS</span>
                    </div>

                    <LiveNewsTicker lang={lang} isFullPage={true} />
                  </div>
                )}

                {/* VIEW 6: DEDICATED ADMIN CONTROL CENTER (Backed by Firestore & RBAC) */}
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
          {chatPosition === 'bottom' && !(isMobile && activeView === 'chart') && (
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

                  {/* 3 Unified Institutional Companion Tabs: Signals | Messenger | Analyst AI */}
                  <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633] min-w-0 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => {
                        handleSelectTopic('trades');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span className={isBottomFolded ? 'hidden sm:inline' : ''}>
                        {isAr ? 'الإشارات' : 'Signals'}
                      </span>
                      {unreadTradesCount > 0 && (
                        <span className="font-mono text-[10px] text-[#10b981] font-bold">
                          ({unreadTradesCount > 99 ? '99+' : unreadTradesCount})
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('chat');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'chat' || sideDrawerView === 'dm'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className={isBottomFolded ? 'hidden sm:inline' : ''}>
                        {isAr ? 'الماسنجر' : 'Messenger'}
                      </span>
                      {unreadChatCount + unreadDmCount > 0 && (
                        <span className="font-mono text-[10px] text-[#e11d48] font-bold">
                          ({unreadChatCount + unreadDmCount > 99 ? '99+' : unreadChatCount + unreadDmCount})
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('ai');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'ai'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className={isBottomFolded ? 'hidden sm:inline' : ''}>
                        {isAr ? 'التحليل الذكي' : 'Analyst AI'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Move Helping Panel Controls: Left / Down / Right */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-[#8b95a5] font-medium hidden md:inline">
                    {isAr ? 'موضع اللوحة:' : 'Dock:'}
                  </span>
                  <ChatDockControls
                    currentPosition={chatPosition}
                    onSelectPosition={handleSetChatPosition}
                    isAr={isAr}
                    compact
                  />
                </div>
              </div>

              {/* Bottom Helping Panel Content Body */}
              {!isBottomFolded && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {sideDrawerView === 'trades' ? (
                    <DailyTradesPanel
                      user={user}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'ANALYSER'}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      lang={lang}
                      isCompact={false}
                    />
                  ) : sideDrawerView === 'chat' || sideDrawerView === 'dm' ? (
                    <UnifiedMessengerHub
                      user={user}
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'MODERATOR'}
                      isMutedFromChat={user.isMutedFromChat}
                      activeTab={sideDrawerView === 'dm' ? 'dm' : messengerSubTab}
                      onSelectTab={(tab) => {
                        setMessengerSubTab(tab);
                        setSideDrawerView(tab === 'dm' ? 'dm' : 'chat');
                        if (tab === 'general') markChatAsRead();
                        else markDmAsRead();
                      }}
                      unreadChatCount={unreadChatCount}
                      unreadDmCount={unreadDmCount}
                      dmTargetUser={dmTargetUser}
                      onClearDmTarget={() => setDmTargetUser(null)}
                      onStartDirectMessage={(target) => {
                        setDmTargetUser(target);
                        setMessengerSubTab('dm');
                        setSideDrawerView('dm');
                        markDmAsRead();
                      }}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      onSelectSymbol={onSelectSymbol}
                      lang={lang}
                      isCompact={true}
                    />
                  ) : (
                    <TradingViewAIPanel
                      user={user}
                      isVIP={isVIP}
                      activeSymbol={selectedSymbol}
                      currentPrice={activeTicker?.price || 20850}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      lang={lang}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* FLEXIBLE RESIZABLE BORDER DIVIDER */}
        {isSidebarVisible && activeMainView === 'chart' && (
          <div
            onMouseDown={handleStartResize}
            onTouchStart={handleStartResize}
            onDoubleClick={handleResetSidebarWidth}
            className={`w-2.5 -mx-1 hover:w-3 transition-colors cursor-col-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${getSidePanelOrder()} ${
              isResizingSidebar ? 'bg-[#2a3446]' : 'hover:bg-[#1e2633]'
            }`}
            title={isAr ? 'اسحب لتغيير العرض أو انقر مرتين للضبط التلقائي' : 'Drag to resize or double click to reset'}
          >
            <div
              className={`w-[1px] h-full transition-colors ${
                isResizingSidebar ? 'bg-white' : 'bg-[#1e2633] group-hover:bg-[#8b95a5]'
              }`}
            />
            {isResizingSidebar && (
              <div className="absolute top-12 z-50 px-2 py-0.5 rounded-[2px] bg-[#0a0d12] border border-[#2a3446] text-[10px] font-mono font-bold text-white whitespace-nowrap">
                {customSidebarWidth}px
              </div>
            )}
          </div>
        )}

        {/* 4. COMPANION SIDEBAR (DOCKABLE LEFT / RIGHT — 3 CLEAN MONOCHROME TABS) */}
        {isSidebarVisible && activeMainView === 'chart' && (
          <aside
            style={getSidebarWidthStyle()}
            className={`flex flex-col h-full shrink-0 z-30 bg-[#10141c] border-s border-[#1e2633] select-none overflow-hidden ${getSidePanelOrder()} ${
              isResizingSidebar ? 'transition-none' : 'transition-all duration-200'
            }`}
          >
            <div className={`p-1.5 border-b border-[#1e2633] flex ${isSidebarShrinked ? 'flex-col items-center py-2 gap-2.5 h-full' : 'items-center justify-between'} bg-[#10141c] shrink-0 overflow-hidden`}>
              {isSidebarShrinked ? (
                /* Folded Slim Strip View (68px wide with written topic labels on every button) */
                <div className="flex flex-col items-center gap-2 w-full h-full justify-between py-1">
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <button
                      onClick={handleToggleShrink}
                      className="w-full py-1 px-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[#8b95a5] hover:text-white transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 shrink-0"
                      title={isAr ? 'توسيع اللوحة الجانبية' : 'Expand Panel'}
                    >
                      {chatPosition === 'right' ? (
                        <ChevronLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[9px] font-medium leading-tight">
                        {isAr ? 'توسيع' : 'Expand'}
                      </span>
                    </button>

                    <div className="w-full h-[1px] bg-[#1e2633]" />

                    <button
                      onClick={() => {
                        handleSelectTopic('trades');
                        setIsSidebarShrinked(false);
                      }}
                      className={`w-full py-1.5 px-1 rounded-[3px] flex flex-col items-center justify-center gap-1 relative transition-colors cursor-pointer ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'بوت وتوصيات MBK' : 'MBK Bot & Signals'}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'الإشارات' : 'Signals'}
                      </span>
                      {unreadTradesCount > 0 && (
                        <span className="absolute top-0.5 end-0.5 min-w-[13px] h-[13px] px-0.5 rounded-[2px] bg-[#10b981] text-white text-[8px] font-mono font-bold flex items-center justify-center">
                          {unreadTradesCount > 99 ? '99+' : unreadTradesCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('chat');
                        setIsSidebarShrinked(false);
                      }}
                      className={`w-full py-1.5 px-1 rounded-[3px] flex flex-col items-center justify-center gap-1 relative transition-colors cursor-pointer ${
                        sideDrawerView === 'chat' || sideDrawerView === 'dm'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'الشات العام والرسائل الخاصة' : 'Trading Floor & Direct DMs'}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'الماسنجر' : 'Messenger'}
                      </span>
                      {unreadChatCount + unreadDmCount > 0 && (
                        <span className="absolute top-0.5 end-0.5 min-w-[13px] h-[13px] px-0.5 rounded-[2px] bg-[#e11d48] text-white text-[8px] font-mono font-bold flex items-center justify-center">
                          {unreadChatCount + unreadDmCount > 99 ? '99+' : unreadChatCount + unreadDmCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('ai');
                        setIsSidebarShrinked(false);
                      }}
                      className={`w-full py-1.5 px-1 rounded-[3px] flex flex-col items-center justify-center gap-1 relative transition-colors cursor-pointer ${
                        sideDrawerView === 'ai'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'المحلل الكمي الذكي' : 'Analyst AI'}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'التحليل' : 'Analyst'}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-1 pt-2 border-t border-[#1e2633] w-full">
                    <ChatDockControls
                      currentPosition={chatPosition}
                      onSelectPosition={handleSetChatPosition}
                      isAr={isAr}
                      compact
                    />
                  </div>
                </div>
              ) : (
                /* Expanded Companion Header: 3 Clean Monochrome Tabs with Written Topic Descriptions */
                <div className="w-full flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <button
                      onClick={handleToggleShrink}
                      className="px-2 py-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[#8b95a5] hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
                      title={isAr ? 'طي اللوحة الجانبية' : 'Fold Panel'}
                    >
                      {chatPosition === 'right' ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronLeft className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px] font-medium">{isAr ? 'طي اللوحة' : 'Fold Panel'}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <ChatDockControls
                        currentPosition={chatPosition}
                        onSelectPosition={handleSetChatPosition}
                        isAr={isAr}
                        compact
                      />
                    </div>
                  </div>

                  {/* Full-Width 3-Tab Grid: Signals | Messenger | Analyst AI with Topic Subtitle */}
                  <div className="grid grid-cols-3 gap-1 bg-[#0a0d12] p-1 rounded-[3px] border border-[#1e2633] w-full">
                    <button
                      onClick={() => handleSelectTopic('trades')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'الإشارات' : 'Signals'}</span>
                        {unreadTradesCount > 0 && (
                          <span className="font-mono text-[9px] text-[#10b981] font-bold">
                            ({unreadTradesCount > 99 ? '99+' : unreadTradesCount})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'صفقات VIP والبوت' : 'VIP & Bot Stream'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectTopic('chat')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'chat' || sideDrawerView === 'dm'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'الماسنجر' : 'Messenger'}</span>
                        {unreadChatCount + unreadDmCount > 0 && (
                          <span className="font-mono text-[9px] text-[#e11d48] font-bold">
                            ({unreadChatCount + unreadDmCount > 99 ? '99+' : unreadChatCount + unreadDmCount})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'الشات والرسائل' : 'Chat & Direct DMs'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectTopic('ai')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'ai'
                          ? 'bg-[#161c26] text-white border border-[#2a3446]'
                          : 'text-[#8b95a5] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'التحليل' : 'Analyst'}</span>
                      </div>
                      <span className="text-[9px] text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'المحلل الكمي' : 'Market Analysis'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            {!isSidebarShrinked && (
              <div
                className={`flex-1 min-h-0 flex flex-col relative ${
                  sideDrawerView === 'chat' || sideDrawerView === 'dm'
                    ? 'overflow-hidden p-0 h-full w-full'
                    : 'overflow-y-auto p-2.5'
                }`}
              >
                <div className="flex-1 min-h-0 flex flex-col">
                  {sideDrawerView === 'trades' ? (
                    <DailyTradesPanel
                      user={user}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'ANALYSER'}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      lang={lang}
                      isCompact={false}
                    />
                  ) : sideDrawerView === 'chat' || sideDrawerView === 'dm' ? (
                    <UnifiedMessengerHub
                      user={user}
                      currentUserName={user.name || user.email.split('@')[0]}
                      isVIP={isVIP}
                      userRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin || user.role === 'MODERATOR'}
                      isMutedFromChat={user.isMutedFromChat}
                      activeTab={sideDrawerView === 'dm' ? 'dm' : messengerSubTab}
                      onSelectTab={(tab) => {
                        setMessengerSubTab(tab);
                        setSideDrawerView(tab === 'dm' ? 'dm' : 'chat');
                        if (tab === 'general') markChatAsRead();
                        else markDmAsRead();
                      }}
                      unreadChatCount={unreadChatCount}
                      unreadDmCount={unreadDmCount}
                      dmTargetUser={dmTargetUser}
                      onClearDmTarget={() => setDmTargetUser(null)}
                      onStartDirectMessage={(target) => {
                        setDmTargetUser(target);
                        setMessengerSubTab('dm');
                        setSideDrawerView('dm');
                        markDmAsRead();
                      }}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
                      onSelectSymbol={onSelectSymbol}
                      lang={lang}
                      isCompact={true}
                    />
                  ) : (
                    <TradingViewAIPanel
                      user={user}
                      isVIP={isVIP}
                      activeSymbol={selectedSymbol}
                      currentPrice={activeTicker?.price || 20850}
                      onOpenPromoModal={onOpenPromoModal}
                      onOpenPlansModal={() => setPlansModalOpen(true)}
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

      {/* Quick Slide-Over Signal Publisher Drawer (Accessible from any screen for Admin/Analysts) */}
      <QuickSignalDrawer
        isOpen={quickSignalDrawerOpen}
        onClose={() => setQuickSignalDrawerOpen(false)}
        currentUserRole={user.role}
        currentUserName={user.name || user.email.split('@')[0]}
        lang={lang}
      />

      {/* Trader Utility Modals (Support, Risk Calculator, Sessions, Profile, Plans, Payment) */}
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
        onOpenPlansModal={() => setPlansModalOpen(true)}
        onOpenSupportModal={() => setSupportModalOpen(true)}
        onNavigateAdmin={() => setActiveView('admin')}
        lang={lang}
        onToggleLang={onToggleLang}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />

      <SubscriptionPlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        user={user}
        onSelectPlan={(plan) => {
          setSelectedCheckoutPlan(plan);
          setPaymentModalOpen(true);
        }}
        onOpenPromoModal={onOpenPromoModal}
        lang={lang}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        selectedPlan={selectedCheckoutPlan}
        onContactSupport={() => setSupportModalOpen(true)}
        lang={lang}
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

      {/* 1-Hour Macro Event Warning (CPI/Fed) & Tab-Targeted Admin Popup Announcements */}
      <MacroEventAndAnnouncementPopup
        user={user}
        activeView={activeMainView === 'heatmap' ? 'heatmap' : activeView}
        lang={lang}
        onOpenPlansModal={() => setPlansModalOpen(true)}
        onOpenPromoModal={onOpenPromoModal}
        onNavigateToCalendar={() => {
          setActiveMainView('chart');
          setActiveView('calendar');
        }}
      />
    </div>
  );
};
