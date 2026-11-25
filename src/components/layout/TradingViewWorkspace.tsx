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
  Monitor,
  Compass
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { getEffectiveTier, ELITE_LOCK_BADGE_TEXT } from '../../utils/entitlements';
import { hasAnyStaffPermission, hasStaffPermission } from '../../utils/rbac';
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
import { EconomicCalendarPanel } from '../EconomicCalendarPanel';
import { TradingAcademyPanel } from '../tic/TradingAcademyPanel';
import { CopyTradingPanel } from '../CopyTradingPanel';
import { AutoBotPanel } from '../AutoBotPanel';
import { IndicatorsStorePanel } from '../store/IndicatorsStorePanel';
import { MarketAnalysisHub } from '../analysis/MarketAnalysisHub';
import { EliteLockedModule } from '../common/EliteLockedModule';
import { MacroEventAndAnnouncementPopup } from '../common/MacroEventAndAnnouncementPopup';
import {
  OnboardingTourModal,
  hasCompletedOnboardingTour,
  hasCompletedPostVipTour
} from '../common/OnboardingTourModal';
import { MBKProCanvasChart } from '../charts/MBKProCanvasChart';

// Utility Modals
import { SupportDeskModal } from '../modals/SupportDeskModal';
import { RiskCalculatorModal } from '../modals/RiskCalculatorModal';
import { MarketSessionsModal } from '../modals/MarketSessionsModal';
import { UserProfileModal } from '../modals/UserProfileModal';
import { SubscriptionPlansModal } from '../modals/SubscriptionPlansModal';
import { PaymentModal } from '../modals/PaymentModal';
import { PriceAlertsModal, usePriceAlertsManager } from '../modals/PriceAlertsModal';

export type WorkspaceView =
  | 'signals'
  | 'analysis'
  | 'chat'
  | 'dm'
  | 'news'
  | 'ai'
  | 'chart'
  | 'proChart'
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
    <div className="flex items-center gap-0.5 bg-[#F0F3FA] dark:bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#E0E3EB] dark:border-[#1e2633] shrink-0">
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
                ? 'bg-[#EDF1F7] dark:bg-[#2a3446] text-[#131722] dark:text-white'
                : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#161c26]'
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
  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'academy' || params.get('academyVideo')) {
          return 'academy';
        }
      } catch {
        // ignore URL parse error
      }
    }
    return 'signals';
  });
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
  }, [user?.uid, user?.id, user?.name, user?.role, user?.avatar]);

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
  const CHART_QUICK_SYMBOLS: MarketSymbol[] = ['XAUUSD', 'US100', 'EURUSD', 'BTCUSD'];

  const triggerRotatePhoneNotification = () => {
    setShowRotatePrompt(true);
    addToast({
      title: lang === 'ar' ? 'تدوير الهاتف للشارت الكامل 📱🔄' : 'Rotate Phone for Full Chart 📱🔄',
      message:
        lang === 'ar'
          ? 'قم بتدوير الهاتف أفقياً (Landscape) للحصول على عرض الشارت الكامل بأفضل دقة.'
          : 'Rotate your phone horizontally (Landscape) to get the best Full Chart view.',
      type: 'info',
      timestamp: lang === 'ar' ? 'الآن' : 'Now'
    });
    setTimeout(() => {
      setShowRotatePrompt(false);
    }, 6000);
  };

  const handleEnableAnalysisMode = () => {
    setIsAnalysisMode(true);
    triggerRotatePhoneNotification();
  };

  useEffect(() => {
    if (activeMainView === 'chart' && activeView === 'chart' && isMobile) {
      setShowRotatePrompt(true);
      const timer = setTimeout(() => {
        setShowRotatePrompt(false);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [activeMainView, activeView, isMobile]);

  // Trader Utility Modals State (Support, Risk Calculator, Sessions, Price Alerts, Profile, Plans, Payment)
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [priceAlertsModalOpen, setPriceAlertsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<'vip' | 'elite'>('vip');
  const [activeEliteTab, setActiveEliteTab] = useState<'superAi' | 'copyTrading' | 'autoBotTrader' | 'tradingCourse' | 'indicatorsStore'>('superAi');

  // Lightweight Zero-Quota Interactive Onboarding Tour State (strictly localStorage — 0 Firestore reads/writes)
  const [onboardingTourOpen, setOnboardingTourOpen] = useState<boolean>(false);
  const [onboardingTourPostVip, setOnboardingTourPostVip] = useState<boolean>(false);
  const [isAnnouncementPopupVisible, setIsAnnouncementPopupVisible] = useState<boolean>(false);
  const [pendingTourTrigger, setPendingTourTrigger] = useState<'none' | 'initial' | 'post_vip'>('none');
  const [tourMountSettled, setTourMountSettled] = useState<boolean>(false);

  // Brief settle delay on mount so MacroEventAndAnnouncementPopup evaluates first and never overlaps
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTourMountSettled(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  // Queue initial first-time tour once for authenticated users who haven't seen v2.1 tour
  useEffect(() => {
    if (!tourMountSettled) return;
    if (!user?.uid && !user?.id) return;
    if (!hasCompletedOnboardingTour()) {
      setPendingTourTrigger((prev) => (prev === 'none' ? 'initial' : prev));
    }
  }, [tourMountSettled, user?.uid, user?.id]);

  // Queue post-activation tour immediately after a new VIP/Elite key is redeemed (if not yet seen)
  useEffect(() => {
    const handleSubscriptionActivated = () => {
      if (!hasCompletedPostVipTour()) {
        setPendingTourTrigger('post_vip');
      }
    };
    window.addEventListener('mbk-subscription-activated', handleSubscriptionActivated);
    return () => window.removeEventListener('mbk-subscription-activated', handleSubscriptionActivated);
  }, []);

  // Show queued tour strictly when MacroEventAndAnnouncementPopup is NOT visible
  useEffect(() => {
    if (pendingTourTrigger === 'none') return;
    if (isAnnouncementPopupVisible) return;
    if (onboardingTourOpen) return;

    setOnboardingTourPostVip(pendingTourTrigger === 'post_vip');
    setOnboardingTourOpen(true);
    setPendingTourTrigger('none');
  }, [pendingTourTrigger, isAnnouncementPopupVisible, onboardingTourOpen]);

  const handleOpenOnboardingTourManual = () => {
    soundManager.playClick();
    setOnboardingTourPostVip(false);
    setOnboardingTourOpen(true);
  };

  const {
    alerts: priceAlerts,
    activeAlertsCount: activePriceAlertsCount,
    addPriceAlert,
    removePriceAlert,
    reactivatePriceAlert,
    clearTriggeredAlerts
  } = usePriceAlertsManager({
    uid: user.uid || user.id,
    tickers,
    lang,
    addToast
  });

  // Collapsible Widgets State (Price Ticker & News Banner)
  const [showPriceTicker, setShowPriceTicker] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_show_price_ticker') !== 'false';
  });
  const [showNewsBanner, setShowNewsBanner] = useState<boolean>(() => {
    return localStorage.getItem('mbk_tv_show_news_banner') !== 'false';
  });

  // Flexible Chat Docking State ('left' | 'right' | 'bottom' | 'hide')
  // Never initialize to 'hide' so the slidable Helping Panel (Bot, Trades, Messenger, AI) is always accessible
  const [chatPosition, setChatPosition] = useState<ChatDockPosition>(() => {
    const saved = localStorage.getItem('mbk_tv_chat_dock_position') as ChatDockPosition;
    if (saved === 'left' || saved === 'right' || saved === 'bottom') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'bottom';
    }
    return 'left';
  });

  useEffect(() => {
    if (chatPosition === 'hide') {
      const fallback: ChatDockPosition = window.innerWidth < 640 ? 'bottom' : 'left';
      setChatPosition(fallback);
      localStorage.setItem('mbk_tv_chat_dock_position', fallback);
    }
  }, [chatPosition]);

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
  const [rightMenuDrawerOpen, setRightMenuDrawerOpen] = useState(false);
  const touchSwipeRef = React.useRef<{ startX: number; startY: number; startTime: number } | null>(null);

  const handleWorkspaceTouchStart = (e: React.TouchEvent) => {
    if (isResizingSidebar || isResizingBottom || e.touches.length !== 1) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl.closest('[data-no-drawer-swipe="true"]')) {
      touchSwipeRef.current = null;
      return;
    }
    const t = e.touches[0];
    touchSwipeRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now()
    };
  };

  const handleWorkspaceTouchEnd = (e: React.TouchEvent) => {
    if (!touchSwipeRef.current || isResizingSidebar || isResizingBottom) return;
    const start = touchSwipeRef.current;
    touchSwipeRef.current = null;
    if (e.changedTouches.length === 0) return;

    const endTouch = e.changedTouches[0];
    const deltaX = endTouch.clientX - start.startX;
    const deltaY = endTouch.clientY - start.startY;
    const elapsed = Date.now() - start.startTime;

    if (elapsed > 650) return;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;

    // Ignore swipes originating inside form inputs or resizer handles
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl.closest('input, textarea, select, [data-no-drawer-swipe="true"]')) {
      return;
    }

    // Swiping left (deltaX < -55) opens the right-side transparent menu drawer
    if (!rightMenuDrawerOpen && deltaX < -55 && start.startX > window.innerWidth * 0.25) {
      soundManager.playClick();
      setRightMenuDrawerOpen(true);
    } else if (rightMenuDrawerOpen && deltaX > 50) {
      // Swiping right closes the right-side drawer
      soundManager.playClick();
      setRightMenuDrawerOpen(false);
    }
  };

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
    const safePos: ChatDockPosition = pos === 'hide' ? 'bottom' : pos;
    setChatPosition(safePos);
    localStorage.setItem('mbk_tv_chat_dock_position', safePos);

    if (safePos === 'left' || safePos === 'right') {
      setIsSidebarShrinked(false);
      localStorage.setItem('mbk_tv_sidebar_shrinked', 'false');
    } else if (safePos === 'bottom') {
      setIsBottomFolded(false);
      localStorage.setItem('mbk_tv_bottom_panel_folded', 'false');
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
    e.stopPropagation();
    setIsResizingBottom(true);
    soundManager.playClick();
  };

  useEffect(() => {
    if (!isResizingBottom) return;

    const handleMove = (clientY: number) => {
      const windowHeight = window.innerHeight;
      const calculatedHeight = windowHeight - clientY;
      const minH = 130;
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
    e.stopPropagation();
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
      const isPhysicalLeft = chatPosition === 'left';
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
      if (e.touches[0]) handleMove(e.touches[0].clientY !== undefined ? e.touches[0].clientX : 0);
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

  const isAr = lang === 'ar';

  // Layout order helpers based on RTL/LTR and chat docking position so divider is ALWAYS between sidebar and main view
  const isSidebarAtFlexStart =
    (chatPosition === 'right' && isAr) || (chatPosition === 'left' && !isAr);

  const getSidePanelOrder = (): string => {
    return isSidebarAtFlexStart ? 'order-1' : 'order-3';
  };

  const getDividerOrder = (): string => {
    return 'order-2';
  };

  const getMainCenterOrder = (): string => {
    return isSidebarAtFlexStart ? 'order-3' : 'order-1';
  };

  const handleSelectTopic = (topic: 'trades' | 'chat' | 'dm' | 'ai') => {
    soundManager.playClick();
    setSideDrawerView(topic);
    localStorage.setItem('mbk_tv_sidebar_view', topic);
    if (topic === 'trades') markTradesAsRead();
    if (topic === 'chat') markChatAsRead();
    if (topic === 'dm') markDmAsRead();
  };

  const effectiveTier = getEffectiveTier(user);
  const isEliteMember = effectiveTier === 'elite';
  const isVIP = effectiveTier === 'vip' || effectiveTier === 'elite';

  // Find active ticker
  const activeTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];

  const roleUpperForAdmin = (user.role || '').toUpperCase();
  const canPublishQuickSignals =
    hasStaffPermission(user, 'canPostSignals') ||
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
      id: 'proChart' as WorkspaceView | 'heatmap',
      labelAr: 'شارت MBK الاحترافي',
      labelEn: 'MBK Pro Chart',
      shortAr: 'شارت MBK',
      shortEn: 'Pro Chart',
      topicAr: 'لوحة رسم ومؤشرات حية',
      topicEn: 'Live Canvas & VIP Levels',
      icon: Activity
    },
    {
      id: 'analysis' as WorkspaceView | 'heatmap',
      labelAr: 'تحليلات السوق (Analysis)',
      labelEn: 'Market Analysis',
      shortAr: 'التحليلات',
      shortEn: 'Analysis',
      topicAr: 'تحليلات الشارت والسيولة من فريق MBK',
      topicEn: 'MBK Team Chart & Liquidity Analysis',
      icon: BarChart3
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
      labelAr: 'المتجر',
      labelEn: 'Store',
      shortAr: 'المتجر',
      shortEn: 'Store',
      topicAr: 'متجر المؤشرات وروبوتات التداول',
      topicEn: 'Indicators & Algo Bots Store',
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
    // Staff CRM & Admin Dashboard (verified granular RBAC — only shown when staff has at least one Admin-panel permission)
    ...((() => {
      const canAccessAdminPanel =
        hasStaffPermission(user, 'canViewAnalytics') ||
        hasStaffPermission(user, 'canManageUsers') ||
        hasStaffPermission(user, 'canSendPopups') ||
        hasStaffPermission(user, 'canPostSignals') ||
        hasStaffPermission(user, 'canPostAnalysis') ||
        hasStaffPermission(user, 'canManageSystem') ||
        Boolean(user.isAdmin) ||
        user.email?.toLowerCase() === 'moe.albzour@gmail.com';
      if (!canAccessAdminPanel) return [];

      const isAnalyserRole =
        !user.isAdmin &&
        !hasStaffPermission(user, 'canManageUsers') &&
        !hasStaffPermission(user, 'canViewAnalytics') &&
        !hasStaffPermission(user, 'canSendPopups') &&
        !hasStaffPermission(user, 'canManageSystem') &&
        (hasStaffPermission(user, 'canPostSignals') || hasStaffPermission(user, 'canPostAnalysis'));
      const isModOrSales =
        !user.isAdmin &&
        !hasStaffPermission(user, 'canManageSystem') &&
        (hasStaffPermission(user, 'canManageUsers') ||
          hasStaffPermission(user, 'canViewAnalytics') ||
          hasStaffPermission(user, 'canSendPopups'));

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

  const totalMenuUnread = (unreadTradesCount || 0) + (unreadChatCount || 0) + (unreadDmCount || 0);

  return (
    <div
      onTouchStart={handleWorkspaceTouchStart}
      onTouchEnd={handleWorkspaceTouchEnd}
      className="h-screen h-[100dvh] max-h-[100dvh] w-full max-w-full bg-[#F0F3FA] dark:bg-[#0a0d12] text-[#131722] dark:text-[#f1f5f9] flex flex-col font-sans select-none overflow-hidden antialiased relative"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. UNIFIED TOP TICKER BAR — MBK LOGO ON TOP OF TRADINGVIEW WORD + LIVE PRICES + PROFILE ON OTHER SIDE */}
      <header className="relative h-[42px] bg-[#FFFFFF] dark:bg-[#0b0e14] border-b border-[#E0E3EB] dark:border-[#1e2633] shrink-0 z-40 overflow-hidden flex items-center">
        {/* Background Live Price Ticker (Non-clickable so users never leave the site) */}
        <div className="w-full h-full">
          <HeaderTicker tickers={tickers} onSelectSymbol={onSelectSymbol} lang={lang} />
        </div>

        {/* Right Side Overlay (Covers TradingView word/logo watermark on the ticker): MBK Logo + Install */}
        <div className="absolute right-0 top-0 bottom-0 z-30 bg-[#FFFFFF] dark:bg-[#0b0e14] border-l border-[#E0E3EB] dark:border-[#1e2633] px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2 shadow-[-12px_0_18px_#FFFFFF] dark:shadow-[-12px_0_18px_#0b0e14]">
          <div className="flex items-center gap-1.5 shrink-0">
            <img
              src="/mbk-logo.png"
              alt="MBK Trading"
              referrerPolicy="no-referrer"
              className="h-6 sm:h-7 w-auto rounded-[3px] object-contain border border-[#E0E3EB] dark:border-[#1e2633] bg-[#F0F3FA] dark:bg-[#06080c]"
            />
            <span className="font-bold text-[#131722] dark:text-white text-[11px] sm:text-xs tracking-tight whitespace-nowrap">
              MBK TRADING
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              window.dispatchEvent(new CustomEvent('mbk-open-pwa-install'));
            }}
            className="p-1.5 sm:px-2 sm:py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] border border-[#E0E3EB] dark:border-[#1e2633] hover:border-[#CBD2DF] dark:hover:border-[#2a3446] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
            title={isAr ? 'تحميل وتثبيت التطبيق' : 'Download & Install App'}
          >
            <Download className="w-3 h-3 text-[#089981] dark:text-[#10b981] shrink-0" />
            <span className="hidden md:inline">{isAr ? 'تثبيت' : 'Install'}</span>
          </button>
        </div>

        {/* Left Side Overlay (Other Side of the Ticker): User Profile Button */}
        <div className="absolute left-0 top-0 bottom-0 z-30 bg-[#FFFFFF] dark:bg-[#0b0e14] border-r border-[#E0E3EB] dark:border-[#1e2633] px-2 sm:px-2.5 flex items-center gap-1.5 shadow-[12px_0_18px_#FFFFFF] dark:shadow-[12px_0_18px_#0b0e14]">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setProfileModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#06080c] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] border border-[#E0E3EB] dark:border-[#1e2633] hover:border-[#CBD2DF] dark:hover:border-[#2a3446] text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={isAr ? 'الملف الشخصي وإعدادات المنصة' : 'Profile & App Settings'}
          >
            <div className="w-5 h-5 rounded-[2px] bg-[#F8F9FD] dark:bg-[#161c26] border border-[#CBD2DF] dark:border-[#2a3446] text-[#131722] dark:text-white flex items-center justify-center font-mono font-bold text-[10px] uppercase shrink-0 overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : user.name ? (
                user.name[0].toUpperCase()
              ) : (
                <User className="w-3 h-3" />
              )}
            </div>
            <span className="font-semibold text-[#131722] dark:text-white truncate max-w-[75px] sm:max-w-[120px] text-[11px]">
              {user.name || user.email.split('@')[0]}
            </span>
            <span className="text-[10px] font-mono text-[#089981] dark:text-[#10b981] hidden sm:inline">
              · {user.isAdmin || roleUpperForAdmin === 'ADMIN' ? 'ADMIN' : isEliteMember ? 'ELITE' : isVIP ? 'VIP' : 'STD'}
            </span>
            <Sliders className="w-3 h-3 text-[#4A5162] dark:text-[#8b95a5] shrink-0" />
          </button>
        </div>
      </header>

      {/* ONLY MENU TRIGGER: FIXED RIGHT-EDGE SLIDABLE HANDLE WITH ARROW & SMALL MENU LABEL */}
      {!rightMenuDrawerOpen && (
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setRightMenuDrawerOpen(true);
          }}
          onTouchMove={(e) => {
            if (e.touches[0] && window.innerWidth - e.touches[0].clientX > 24) {
              soundManager.playClick();
              setRightMenuDrawerOpen(true);
            }
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 py-3 px-1.5 rounded-l-xl bg-[#F0F3FA]/90 dark:bg-[#06080c]/75 hover:bg-[#10b981]/25 dark:backdrop-blur-xl border border-r-0 border-[#B3E2D9] dark:border-[#10b981]/45 text-[#131722] dark:text-white shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_0_24px_rgba(0,0,0,0.85)] flex flex-col items-center gap-1.5 cursor-pointer transition-all group"
          title={isAr ? 'اسحب لليسار أو اضغط لفتح القائمة' : 'Swipe left or tap to open Menu'}
        >
          <ChevronLeft className="w-4 h-4 text-[#089981] dark:text-[#10b981] group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[9px] font-extrabold tracking-wider text-[#131722] dark:text-[#e2e8f0] group-hover:text-[#10b981] leading-none">
            {isAr ? 'القائمة' : 'MENU'}
          </span>
          {totalMenuUnread > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-ping" />
          )}
        </button>
      )}

      {/* RIGHT-SIDE SLIDABLE TRANSPARENT GLASS DRAWER MENU */}
      {rightMenuDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#131722]/35 dark:bg-black/45 dark:backdrop-blur-[2px] transition-opacity"
          onClick={() => setRightMenuDrawerOpen(false)}
        />
      )}
      <aside
        dir={isAr ? 'rtl' : 'ltr'}
        className={`fixed inset-y-0 right-0 z-50 w-72 sm:w-80 max-w-[86vw] bg-[#FFFFFF] dark:bg-[#06080c]/75 dark:backdrop-blur-2xl border-l border-[#E0E3EB] dark:border-white/15 shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col transition-transform duration-300 ease-out ${
          rightMenuDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3 bg-[#F8F9FD] dark:bg-[#06080c]/60 border-b border-[#E0E3EB] dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/mbk-logo.png"
              alt="MBK Trading"
              referrerPolicy="no-referrer"
              className="h-6 w-auto rounded-[3px] object-contain border border-[#CBD2DF] dark:border-white/15 bg-[#F0F3FA] dark:bg-[#06080c]"
            />
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#131722] dark:text-white">
                {isAr ? 'قائمة أقسام المنصة' : 'Workspace Sections'}
              </h3>
              <p className="text-[10px] text-[#4A5162] dark:text-[#9db2c6]">
                {isAr ? 'اسحب لليمين أو اضغط خارج القائمة للإغلاق' : 'Swipe right or tap outside to close'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setRightMenuDrawerOpen(false);
            }}
            className="p-1.5 rounded-lg bg-[#F8F9FD] dark:bg-white/5 hover:bg-[#EDF1F7] dark:hover:bg-white/15 border border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#9db2c6] hover:text-[#131722] dark:hover:text-white cursor-pointer"
            title={isAr ? 'إغلاق القائمة' : 'Close Menu'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Sections List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              item.id === 'heatmap'
                ? activeMainView === 'heatmap'
                : activeMainView === 'chart' && activeView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={`drawer-nav-${item.id}`}
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
                  setRightMenuDrawerOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border text-start flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 border-[#B3E2D9] dark:border-[#10b981]/50 text-[#131722] dark:text-white shadow-md'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-[#E0E3EB] dark:border-white/10 text-[#131722] dark:text-[#d1d4dc]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#10b981] border-[#10b981] text-[#06080c]'
                        : 'bg-[#FFFFFF]/95 dark:bg-[#0b0e14]/80 border-[#E0E3EB] dark:border-white/10 text-[#089981] dark:text-[#10b981]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#131722] dark:text-white truncate">
                      {isAr ? item.labelAr : item.labelEn}
                    </div>
                    <div className="text-[10px] text-[#4A5162] dark:text-[#9db2c6] truncate">
                      {isAr ? item.topicAr : item.topicEn}
                    </div>
                  </div>
                </div>

                {'badge' in item && Number(item.badge) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#e11d48] text-white font-mono text-[10px] font-bold shrink-0">
                    {Number(item.badge) > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Utility Tools inside Right Drawer */}
          <div className="pt-3 mt-2 border-t border-[#E0E3EB] dark:border-white/10 space-y-1.5">
            <span className="px-1 text-[10px] font-mono font-bold text-[#4A5162] dark:text-[#8b95a5] uppercase tracking-wider block">
              {isAr ? 'أدوات المتداول السريعة' : 'Quick Trader Tools'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setRightMenuDrawerOpen(false);
                  setCalculatorModalOpen(true);
                }}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#131722] dark:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                <span className="truncate">{isAr ? 'حاسبة اللوت' : 'Lot Calc'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setRightMenuDrawerOpen(false);
                  setSessionsModalOpen(true);
                }}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#131722] dark:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400 shrink-0" />
                <span className="truncate">{isAr ? 'جلسات السوق' : 'Sessions'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setRightMenuDrawerOpen(false);
                  setSupportModalOpen(true);
                }}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[#E0E3EB] dark:border-white/10 text-xs font-bold text-[#131722] dark:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Headphones className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                <span className="truncate">{isAr ? 'الدعم والبريد' : 'Support'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setRightMenuDrawerOpen(false);
                  setPlansModalOpen(true);
                }}
                className="p-2 rounded-xl bg-[#FDF6E3] dark:bg-amber-500/15 hover:bg-amber-500/25 border border-[#EFE0B4] dark:border-amber-500/35 text-xs font-bold text-[#9A6700] dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400 shrink-0" />
                <span className="truncate">{isAr ? 'باقات VIP' : 'VIP Plans'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setRightMenuDrawerOpen(false);
                  setPriceAlertsModalOpen(true);
                }}
                className="col-span-2 p-2 rounded-xl bg-[#E6F5F2] dark:bg-[#089981]/15 hover:bg-[#089981]/25 border border-[#B3E2D9] dark:border-[#089981]/40 text-xs font-bold text-[#131722] dark:text-white flex items-center justify-between gap-1.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Bell className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                  <span className="truncate">{isAr ? 'منبه الأسعار الذكي (Price Alerts)' : 'Smart Price Alerts'}</span>
                </span>
                {activePriceAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#10b981] text-[#06080c] font-mono text-[10px] font-black shrink-0">
                    {activePriceAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. REAL RSS FINANCIAL NEWS BANNER (0.25x ULTRA-SMOOTH SPEED) */}
      <div className={`transition-all duration-200 relative group/news overflow-hidden shrink-0 ${
        showNewsBanner ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <LiveNewsTicker lang={lang} onHide={toggleNewsBanner} />
      </div>

      {/* 2b. FOLDED NEWS QUICK-RESTORE SMALL ARROW (0px layout height) */}
      {!showNewsBanner && (
        <div className="relative h-0 shrink-0 z-40">
          <div className="absolute end-1.5 top-0 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleNewsBanner}
              className="p-0.5 rounded-b-[3px] bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white border-x border-b border-[#CBD2DF] dark:border-[#2a3446] shadow-sm transition-colors cursor-pointer flex items-center justify-center"
              title={isAr ? 'إظهار شريط الأخبار' : 'Restore news banner'}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CANVAS (MAIN VIEWPORT + SLIDABLE HELPING PANEL DOCK) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">

        {/* CENTER WORKSPACE: MAIN VIEWPORT + DOCKABLE SLIDABLE BOTTOM HELPING PANEL */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${getMainCenterOrder()} relative`}>
          {/* MAIN VIEWPORT */}
          {activeMainView === 'heatmap' ? (
            <main className="flex-1 min-w-0 h-full w-full overflow-y-auto p-3 sm:p-5 bg-[#F0F3FA] dark:bg-[#0a0d12] z-30">
              <MarketHeatmap lang={lang} />
            </main>
          ) : isAnalysisMode ? (
            <main className="flex-1 min-h-0 h-full w-full overflow-hidden relative bg-[#F0F3FA] dark:bg-[#0a0d12] p-0 z-30">
              <TradingViewChart
                symbol={selectedSymbol}
                onSymbolChange={onSelectSymbol}
                tickers={tickers}
              />
              <div className="absolute top-2.5 right-2.5 z-50 flex flex-wrap items-center justify-end gap-1.5">
                <div className="flex items-center gap-1 bg-[#FFFFFF]/95 dark:bg-[#0b0e14]/90 dark:backdrop-blur-md p-1 rounded-xl border border-[#CBD2DF] dark:border-[#2a3446] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl">
                  {CHART_QUICK_SYMBOLS.map((sym) => {
                    const isActive = selectedSymbol === sym;
                    return (
                      <button
                        key={`full-sym-${sym}`}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onSelectSymbol(sym);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-[#089981] text-white shadow-md shadow-none dark:shadow-[#089981]/30 ring-1 ring-[#089981]/50'
                            : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-white/10'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setPriceAlertsModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#B3E2D9] dark:border-[#089981]/50 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl"
                >
                  <Bell className="w-3.5 h-3.5 text-[#9A6700] dark:text-amber-400" />
                  <span>{isAr ? 'تنبيه سعر' : 'Alert'}</span>
                  {activePriceAlertsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#089981] text-white font-mono text-[9px] font-bold">
                      {activePriceAlertsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setIsAnalysisMode(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#CBD2DF] dark:border-[#2a3446] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#089981]" />
                  <span>{isAr ? 'إنهاء الشارت الكامل' : 'Exit Full Chart'}</span>
                </button>
              </div>
            </main>
          ) : activeView === 'chat' || activeView === 'dm' ? (
            <main className="flex-1 min-h-0 h-full overflow-hidden p-1 sm:p-2.5 flex flex-col bg-[#FFFFFF] dark:bg-[#131722]">
              <div className="flex-1 min-h-0 h-full w-full rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl flex flex-col bg-[#F8F9FD] dark:bg-[#1e222d]">
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
            <main className="flex-1 overflow-y-auto bg-[#FFFFFF] dark:bg-[#131722] p-2 sm:p-4 md:p-5 pb-4 min-w-0 transition-all duration-300">
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
                    onSelectSymbol={(sym) => {
                      onSelectSymbol(sym);
                      setActiveMainView('chart');
                      setActiveView('chart');
                    }}
                    onOpenPromoModal={onOpenPromoModal}
                    onOpenPlansModal={() => setPlansModalOpen(true)}
                    lang={lang}
                  />
                )}

                {/* VIEW 2: TRADINGVIEW LIVE ADVANCED CHART VIEW */}
                {activeView === 'chart' && (
                  <div className="flex flex-col space-y-4 w-full">
                    {isMobile ? (
                      <div className="h-[36vh] min-h-[240px] w-full rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-[#1e2633] bg-[#F0F3FA] dark:bg-[#0a0d12] relative shrink-0">
                        <TradingViewLiteChart
                          symbol={selectedSymbol}
                          onSymbolChange={onSelectSymbol}
                          tickers={tickers}
                          lang={lang}
                        />
                        {/* Top-Right Overlay Over the Chart: Symbol Switcher + Full Chart Button + Rotate Phone Notification */}
                        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5 max-w-[96%]">
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <div className="flex items-center gap-1 bg-[#FFFFFF]/95 dark:bg-[#0b0e14]/90 dark:backdrop-blur-md p-1 rounded-xl border border-[#CBD2DF] dark:border-[#2a3446] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg overflow-x-auto scrollbar-none">
                              {CHART_QUICK_SYMBOLS.map((sym) => {
                                const isActive = selectedSymbol === sym;
                                return (
                                  <button
                                    key={`mob-chart-sym-${sym}`}
                                    type="button"
                                    onClick={() => {
                                      soundManager.playClick();
                                      onSelectSymbol(sym);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                                      isActive
                                        ? 'bg-[#089981] text-white shadow-md shadow-none dark:shadow-[#089981]/30 ring-1 ring-[#089981]/50'
                                        : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-white/10'
                                    }`}
                                  >
                                    {sym}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick();
                                setPriceAlertsModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-[#EFE0B4] dark:border-amber-500/45 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shrink-0"
                            >
                              <Bell className="w-3 h-3 text-[#9A6700] dark:text-amber-400" />
                              <span>{isAr ? 'تنبيه سعر' : 'Alert'}</span>
                              {activePriceAlertsCount > 0 && (
                                <span className="px-1 rounded-full bg-[#089981] text-white font-mono text-[9px] font-bold">
                                  {activePriceAlertsCount}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playClick();
                                handleEnableAnalysisMode();
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-[#B3E2D9] dark:border-[#089981]/50 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg shrink-0"
                            >
                              <Maximize2 className="w-3 h-3 text-[#089981]" />
                              <span>{isAr ? 'شارت كامل' : 'Full Chart'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              handleEnableAnalysisMode();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FDF6E3] dark:bg-amber-500/20 hover:bg-amber-500/30 dark:backdrop-blur-md border border-[#EFE0B4] dark:border-amber-500/45 text-[#9A6700] dark:text-amber-300 text-[9.5px] font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Smartphone className="w-3 h-3 text-[#9A6700] dark:text-amber-400 rotate-90 shrink-0" />
                            <span>
                              {isAr
                                ? 'قم بتدوير الهاتف أفقياً للحصول على الشارت الكامل'
                                : 'Rotate phone horizontally for Full Chart'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${isBottomFolded ? 'h-[calc(100vh-280px)] min-h-[380px]' : 'h-[450px] sm:h-[500px]'} w-full rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-[#2a2e39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative transition-all duration-300 shrink-0`}>
                        <TradingViewChart
                          symbol={selectedSymbol}
                          onSymbolChange={onSelectSymbol}
                          tickers={tickers}
                        />
                        {/* Top-Right Overlay Over the Chart: Symbol Switcher + Price Alert + Full Chart Button */}
                        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 flex-wrap justify-end">
                          <div className="flex items-center gap-1 bg-[#FFFFFF]/95 dark:bg-[#0b0e14]/90 dark:backdrop-blur-md p-1 rounded-xl border border-[#CBD2DF] dark:border-[#2a3446] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl">
                            {CHART_QUICK_SYMBOLS.map((sym) => {
                              const isActive = selectedSymbol === sym;
                              return (
                                <button
                                  key={`desk-chart-sym-${sym}`}
                                  type="button"
                                  onClick={() => {
                                    soundManager.playClick();
                                    onSelectSymbol(sym);
                                  }}
                                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                                    isActive
                                      ? 'bg-[#089981] text-white shadow-md shadow-none dark:shadow-[#089981]/30 ring-1 ring-[#089981]/50'
                                      : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-white/10'
                                  }`}
                                >
                                  {sym}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setPriceAlertsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-[#EFE0B4] dark:border-amber-500/45 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl shrink-0"
                          >
                            <Bell className="w-3 h-3 text-[#9A6700] dark:text-amber-400" />
                            <span>{isAr ? 'تنبيه سعر' : 'Price Alert'}</span>
                            {activePriceAlertsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#089981] text-white font-mono text-[9px] font-bold">
                                {activePriceAlertsCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              handleEnableAnalysisMode();
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#10141c]/95 hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] text-[#131722] dark:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-[#B3E2D9] dark:border-[#089981]/50 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl shrink-0"
                          >
                            <Maximize2 className="w-3 h-3 text-[#089981]" />
                            <span>{isAr ? 'شارت كامل' : 'Full Chart'}</span>
                          </button>
                        </div>
                      </div>
                    )}
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

                {/* VIEW 3B: MBK PRO CANVAS CHART (Native Open-Source Canvas + Drawing Toolbar + Signal Plotter) */}
                {activeView === 'proChart' && (
                  <div className="h-[calc(100vh-150px)] min-h-[540px] rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-white/10 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl bg-[#F0F3FA] dark:bg-[#06080c]">
                    <MBKProCanvasChart
                      lang={lang}
                      activeSymbol={selectedSymbol}
                      onSelectSymbol={(sym) => onSelectSymbol(sym as MarketSymbol)}
                      isAdmin={Boolean(user.isAdmin || roleUpperForAdmin === 'ADMIN')}
                      isAnalyser={
                        hasStaffPermission(user, 'canPostAnalysis') ||
                        hasStaffPermission(user, 'canPostSignals') ||
                        ['ANALYSER', 'ANALYST'].includes(roleUpperForAdmin)
                      }
                      isVip={isVIP}
                      onOpenPlans={() => setPlansModalOpen(true)}
                    />
                  </div>
                )}

                {/* VIEW 4: AI MARKET ANALYST FULL VIEW */}
                {activeView === 'ai' && (
                  <div className="min-h-[calc(100vh-150px)] rounded-2xl overflow-hidden border border-[#E0E3EB] dark:border-[#2a2e39]">
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

                {/* MBK MARKET & CHART ANALYSIS HUB */}
                {activeView === 'analysis' && (
                  <MarketAnalysisHub
                    lang={lang}
                    userProfile={user}
                    isAdmin={Boolean(user.isAdmin || roleUpperForAdmin === 'ADMIN')}
                  />
                )}

                {/* MBK INDICATORS & ALGO BOTS STORE */}
                {activeView === 'paper' && (
                  <IndicatorsStorePanel
                    lang={lang}
                    userProfile={user}
                    isAdmin={Boolean(user.isAdmin || roleUpperForAdmin === 'ADMIN')}
                    onOpenPlans={() => setPlansModalOpen(true)}
                  />
                )}

                {/* FREE TIER BASIC TOOL: ECONOMIC CALENDAR */}
                {activeView === 'calendar' && <EconomicCalendarPanel lang={lang} />}

                {/* FREE TIER BASIC TOOL: ACADEMY */}
                {activeView === 'academy' && (
                  <TradingAcademyPanel
                    lang={lang}
                    userProfile={user}
                    isAdmin={Boolean(user.isAdmin || roleUpperForAdmin === 'ADMIN')}
                    onOpenPlans={() => setPlansModalOpen(true)}
                    onContactSupport={() => setSupportModalOpen(true)}
                  />
                )}

                {/* ELITE LOCKED MODULES HUB */}
                {activeView === 'elite' && (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#EFE0B4] dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FDF6E3] dark:bg-amber-500/15 border border-[#EFE0B4] dark:border-amber-500/35 flex items-center justify-center text-[#9A6700] dark:text-amber-400">
                          <Gem className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-[#131722] dark:text-white flex items-center gap-2">
                            <span>🔒 {isAr ? 'وحدات باقة Elite المؤسسية ($500/mo)' : 'Elite Tier Modules ($500/mo)'}</span>
                          </h2>
                          <p className="text-xs text-[#4A5162] dark:text-[#8a93a6] mt-0.5">{ELITE_LOCK_BADGE_TEXT}</p>
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

                    <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FD] dark:bg-[#1e222d] p-1.5 rounded-xl border border-[#E0E3EB] dark:border-[#2a2e39]">
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
                              ? 'bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-300 border border-[#EFE0B4] dark:border-amber-500/40'
                              : 'text-[#4A5162] dark:text-[#8a93a6] hover:text-[#131722] dark:hover:text-white'
                          }`}
                        >
                          <Lock className="w-3 h-3 text-[#9A6700] dark:text-amber-400" />
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
                      <IndicatorsStorePanel
                        lang={lang}
                        userProfile={user}
                        isAdmin={Boolean(user.isAdmin || roleUpperForAdmin === 'ADMIN')}
                        onOpenPlans={() => setPlansModalOpen(true)}
                      />
                    )}
                  </div>
                )}

                {/* VIEW 5: EXPANDED NEWS WIRES */}
                {activeView === 'news' && (
                  <div className="space-y-4">
                    <div className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-[#089981]" />
                        <h2 className="text-sm font-bold text-[#131722] dark:text-white">
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
                  <div className="min-h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-[#E0E3EB] dark:border-[#2A2E39] shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl">
                    <AdminDashboard
                      userProfile={user}
                      currentRole={user.role}
                      isAdmin={user.role === 'ADMIN' || user.isAdmin}
                      lang={lang}
                      onClose={() => setActiveView('signals')}
                      onStartDirectMessage={(target) => {
                        setDmTargetUser(target);
                        setMessengerSubTab('dm');
                        setActiveMainView('chart');
                        setActiveView('chat');
                        markDmAsRead();
                      }}
                    />
                  </div>
                )}
              </div>
            </main>
          )}

          {/* SLIDABLE HELPING PANEL DOCKED AT BOTTOM (Contains Bot & Trades, Messenger, and MBK AI) */}
          {chatPosition === 'bottom' && (
            <div
              data-no-drawer-swipe="true"
              style={{
                height: isBottomFolded ? '46px' : `${bottomChatHeight}px`,
                maxHeight: isBottomFolded ? '46px' : '82vh',
                minHeight: isBottomFolded ? '46px' : '135px'
              }}
              className={`w-full bg-[#FFFFFF]/95 dark:bg-[#0b0e14]/95 dark:backdrop-blur-xl border-t border-[#CBD2DF] dark:border-white/15 flex flex-col shrink-0 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative z-30 ${
                isResizingBottom ? 'transition-none' : 'transition-all duration-200'
              } ${isBottomFolded ? 'h-[46px] min-h-[46px] max-h-[46px]' : ''}`}
            >
              {/* Always-present Slidable Drag Handle on Top of Bottom Helping Panel (Works even when folded!) */}
              <div
                data-no-drawer-swipe="true"
                onMouseDown={handleStartResizeBottom}
                onTouchStart={handleStartResizeBottom}
                onDoubleClick={handleResetBottomHeight}
                className={`h-3 -mt-1.5 w-full hover:h-3.5 transition-all cursor-row-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${
                  isResizingBottom ? 'bg-[#10b981] shadow-none dark:shadow-[0_0_12px_#10b981]' : 'bg-transparent hover:bg-[#10b981]/40'
                }`}
                title={isAr ? 'اسحب للأعلى أو الأسفل لتحريك اللوحة المساعدة (أو انقر مرتين للضبط التلقائي)' : 'Slide up or down to resize Helping Panel (or double-click to reset)'}
              >
                <div className="w-14 h-1 rounded-full bg-white/35 group-hover:bg-[#10b981] transition-colors" />
                {isResizingBottom && (
                  <div className="absolute -top-7 start-1/2 -translate-x-1/2 z-50 px-2.5 py-0.5 rounded bg-[#F0F3FA] dark:bg-[#06080c] border border-[#10b981] text-[10px] font-mono font-bold text-[#089981] dark:text-[#10b981] whitespace-nowrap shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl pointer-events-none">
                    {bottomChatHeight}px
                  </div>
                )}
              </div>

              {/* Bottom Helping Panel Header Bar */}
              <div className="px-2.5 sm:px-3 py-1 bg-[#FFFFFF] dark:bg-[#10141c] border-b border-[#E0E3EB] dark:border-white/10 flex items-center justify-between shrink-0 gap-2 h-[38px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={toggleBottomFold}
                    className="p-1 sm:px-2 sm:py-1 rounded-lg bg-[#F8F9FD] dark:bg-white/5 hover:bg-[#EDF1F7] dark:hover:bg-white/10 border border-[#E0E3EB] dark:border-white/10 text-[#4A5162] dark:text-[#9db2c6] hover:text-[#131722] dark:hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs shrink-0 group"
                    title={
                      isBottomFolded
                        ? (isAr ? 'توسيع اللوحة المساعدة' : 'Expand Helping Panel')
                        : (isAr ? 'طي اللوحة المساعدة' : 'Fold Helping Panel')
                    }
                  >
                    {isBottomFolded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-[#089981] dark:text-[#10b981] hidden xxs:inline">
                          {isAr ? 'توسيع' : 'Expand'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-[#4A5162] dark:text-[#9db2c6] group-hover:text-[#131722] dark:group-hover:text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-medium hidden xxs:inline">
                          {isAr ? 'طي' : 'Fold'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* 3 Unified Helping Panel Tabs: Bot & Trades | Messenger | MBK AI */}
                  <div className="flex items-center gap-0.5 bg-[#F0F3FA] dark:bg-[#06080c] p-0.5 rounded-[4px] border border-[#E0E3EB] dark:border-[#1e2633] min-w-0 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => {
                        handleSelectTopic('trades');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 text-[#131722] dark:text-white border border-[#B3E2D9] dark:border-[#10b981]/50'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span>{isAr ? 'البوت والصفقات' : 'Bot & Trades'}</span>
                      {unreadTradesCount > 0 && (
                        <span className="font-mono text-[10px] text-[#089981] dark:text-[#10b981] font-bold">
                          ({unreadTradesCount > 99 ? '99+' : unreadTradesCount})
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('chat');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'chat' || sideDrawerView === 'dm'
                          ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 text-[#131722] dark:text-white border border-[#B3E2D9] dark:border-[#10b981]/50'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span>{isAr ? 'الماسنجر' : 'Messenger'}</span>
                      {unreadChatCount + unreadDmCount > 0 && (
                        <span className="font-mono text-[10px] text-[#D93848] dark:text-[#e11d48] font-bold">
                          ({unreadChatCount + unreadDmCount > 99 ? '99+' : unreadChatCount + unreadDmCount})
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        handleSelectTopic('ai');
                        if (isBottomFolded) setIsBottomFolded(false);
                      }}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        sideDrawerView === 'ai'
                          ? 'bg-[#E6F5F2] dark:bg-[#10b981]/20 text-[#131722] dark:text-white border border-[#B3E2D9] dark:border-[#10b981]/50'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span>{isAr ? 'ذكاء MBK' : 'MBK AI'}</span>
                    </button>
                  </div>
                </div>

                {/* Move Helping Panel Controls: Platform Tour + Left / Down / Right */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenOnboardingTourManual}
                    className="px-2 py-1 rounded-[3px] bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#2A2E39] border border-[#E0E3EB] dark:border-[#2A2E39] text-[#131722] dark:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold shrink-0 whitespace-nowrap"
                    title={isAr ? 'جولة تعريفية في المنصة' : 'Platform Tour'}
                  >
                    <Compass className="w-3.5 h-3.5 text-[#B47B00] dark:text-[#F0B90B] shrink-0" />
                    <span className="hidden sm:inline">{isAr ? 'جولة تعريفية' : 'Platform Tour'}</span>
                  </button>
                  <span className="text-[10px] text-[#4A5162] dark:text-[#8b95a5] font-medium hidden md:inline">
                    {isAr ? 'موضع المساعد:' : 'Dock:'}
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

        {/* FLEXIBLE SLIDABLE BORDER DIVIDER (Always placed between Side Helping Panel and Main Viewport) */}
        {isSidebarVisible && (
          <div
            data-no-drawer-swipe="true"
            onMouseDown={handleStartResize}
            onTouchStart={handleStartResize}
            onDoubleClick={handleResetSidebarWidth}
            className={`w-3 -mx-1 hover:w-3.5 transition-colors cursor-col-resize z-40 shrink-0 flex items-center justify-center group select-none relative ${getDividerOrder()} ${
              isResizingSidebar ? 'bg-[#E6F5F2] dark:bg-[#10b981]/30' : 'hover:bg-[#EDF1F7] dark:hover:bg-[#1e2633]'
            }`}
            title={isAr ? 'اسحب لتحريك حجم اللوحة المساعدة أو انقر مرتين للضبط التلقائي' : 'Slide to resize Helping Panel or double-click to reset'}
          >
            <div
              className={`w-[2px] h-full transition-colors ${
                isResizingSidebar ? 'bg-[#10b981]' : 'bg-[#F8F9FD] dark:bg-[#1e2633] group-hover:bg-[#10b981]'
              }`}
            />
            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-full bg-white/30 group-hover:bg-[#10b981] transition-colors pointer-events-none" />
            {isResizingSidebar && (
              <div className="absolute top-12 z-50 px-2 py-0.5 rounded-[2px] bg-[#F0F3FA] dark:bg-[#0a0d12] border border-[#10b981] text-[10px] font-mono font-bold text-[#089981] dark:text-[#10b981] whitespace-nowrap">
                {customSidebarWidth}px
              </div>
            )}
          </div>
        )}

        {/* 4. SLIDABLE SIDE HELPING PANEL (DOCKABLE LEFT / RIGHT — BOT & TRADES | MESSENGER | MBK AI) */}
        {isSidebarVisible && (
          <aside
            data-no-drawer-swipe="true"
            style={getSidebarWidthStyle()}
            className={`flex flex-col h-full shrink-0 z-30 bg-[#FFFFFF] dark:bg-[#10141c] border-s border-[#E0E3EB] dark:border-[#1e2633] select-none overflow-hidden ${getSidePanelOrder()} ${
              isResizingSidebar ? 'transition-none' : 'transition-all duration-200'
            }`}
          >
            <div className={`p-1.5 border-b border-[#E0E3EB] dark:border-[#1e2633] flex ${isSidebarShrinked ? 'flex-col items-center py-2 gap-2.5 h-full' : 'items-center justify-between'} bg-[#FFFFFF] dark:bg-[#10141c] shrink-0 overflow-hidden`}>
              {isSidebarShrinked ? (
                /* Folded Slim Strip View (68px wide with written topic labels on every button) */
                <div className="flex flex-col items-center gap-2 w-full h-full justify-between py-1">
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <button
                      onClick={handleToggleShrink}
                      className="w-full py-1 px-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0a0d12] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] border border-[#E0E3EB] dark:border-[#1e2633] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 shrink-0"
                      title={isAr ? 'توسيع اللوحة المساعدة' : 'Expand Helping Panel'}
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

                    <div className="w-full h-[1px] bg-[#F8F9FD] dark:bg-[#1e2633]" />

                    <button
                      onClick={() => {
                        handleSelectTopic('trades');
                        setIsSidebarShrinked(false);
                      }}
                      className={`w-full py-1.5 px-1 rounded-[3px] flex flex-col items-center justify-center gap-1 relative transition-colors cursor-pointer ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'البوت والصفقات المباشرة' : 'Bot & Live Trades'}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'البوت والصفقات' : 'Trades'}
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
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'الشات العام والرسائل الخاصة' : 'Trading Floor & Direct DMs'}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
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
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#161c26]'
                      }`}
                      title={isAr ? 'ذكاء MBK' : 'MBK AI'}
                    >
                      <Bot className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981]" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'ذكاء MBK' : 'MBK AI'}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-[#E0E3EB] dark:border-[#1e2633] w-full">
                    <button
                      type="button"
                      onClick={handleOpenOnboardingTourManual}
                      className="w-full py-1.5 px-1 rounded-[3px] flex flex-col items-center justify-center gap-1 text-[#4A5162] dark:text-[#94A3B8] hover:text-[#131722] dark:hover:text-white hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] transition-colors cursor-pointer"
                      title={isAr ? 'جولة تعريفية' : 'Platform Tour'}
                    >
                      <Compass className="w-3.5 h-3.5 text-[#B47B00] dark:text-[#F0B90B]" />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                        {isAr ? 'جولة' : 'Tour'}
                      </span>
                    </button>
                    <ChatDockControls
                      currentPosition={chatPosition}
                      onSelectPosition={handleSetChatPosition}
                      isAr={isAr}
                      compact
                    />
                  </div>
                </div>
              ) : (
                /* Expanded Companion Header: 3 Clean Tabs (Bot & Trades | Messenger | MBK AI) */
                <div className="w-full flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <button
                      onClick={handleToggleShrink}
                      className="px-2 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0a0d12] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] border border-[#E0E3EB] dark:border-[#1e2633] text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
                      title={isAr ? 'طي اللوحة المساعدة' : 'Fold Helping Panel'}
                    >
                      {chatPosition === 'right' ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronLeft className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px] font-medium">{isAr ? 'طي المساعد' : 'Fold Helper'}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenOnboardingTourManual}
                        className="px-2 py-1 rounded-[3px] bg-[#F0F3FA] dark:bg-[#0a0d12] hover:bg-[#EDF1F7] dark:hover:bg-[#161c26] border border-[#E0E3EB] dark:border-[#1e2633] text-[#131722] dark:text-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold shrink-0 whitespace-nowrap"
                        title={isAr ? 'جولة تعريفية في المنصة' : 'Platform Tour'}
                      >
                        <Compass className="w-3.5 h-3.5 text-[#B47B00] dark:text-[#F0B90B] shrink-0" />
                        <span>{isAr ? 'جولة تعريفية' : 'Platform Tour'}</span>
                      </button>
                      <ChatDockControls
                        currentPosition={chatPosition}
                        onSelectPosition={handleSetChatPosition}
                        isAr={isAr}
                        compact
                      />
                    </div>
                  </div>

                  {/* Full-Width 3-Tab Grid: Bot & Trades | Messenger | MBK AI */}
                  <div className="grid grid-cols-3 gap-1 bg-[#F0F3FA] dark:bg-[#0a0d12] p-1 rounded-[3px] border border-[#E0E3EB] dark:border-[#1e2633] w-full">
                    <button
                      onClick={() => handleSelectTopic('trades')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'trades'
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'البوت والصفقات' : 'Bot & Trades'}</span>
                        {unreadTradesCount > 0 && (
                          <span className="font-mono text-[9px] text-[#089981] dark:text-[#10b981] font-bold">
                            ({unreadTradesCount > 99 ? '99+' : unreadTradesCount})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#4A5162] dark:text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'صفقات VIP والبوت' : 'VIP & Bot Stream'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectTopic('chat')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'chat' || sideDrawerView === 'dm'
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'الماسنجر' : 'Messenger'}</span>
                        {unreadChatCount + unreadDmCount > 0 && (
                          <span className="font-mono text-[9px] text-[#D93848] dark:text-[#e11d48] font-bold">
                            ({unreadChatCount + unreadDmCount > 99 ? '99+' : unreadChatCount + unreadDmCount})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#4A5162] dark:text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'الشات والرسائل' : 'Chat & Direct DMs'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectTopic('ai')}
                      className={`px-2 py-1.5 rounded-[2px] transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                        sideDrawerView === 'ai'
                          ? 'bg-[#F8F9FD] dark:bg-[#161c26] text-[#131722] dark:text-white border border-[#CBD2DF] dark:border-[#2a3446]'
                          : 'text-[#4A5162] dark:text-[#8b95a5] hover:text-[#131722] dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-[#089981] dark:text-[#10b981] shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{isAr ? 'ذكاء MBK' : 'MBK AI'}</span>
                      </div>
                      <span className="text-[9px] text-[#4A5162] dark:text-[#8492a6] truncate w-full text-center">
                        {isAr ? 'المحلل الذكي' : 'Analyst AI'}
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
        user={user}
        onOpenFullInbox={(topic, targetUid, targetName) => {
          setDmTargetUser({
            uid: targetUid || 'mbktrading',
            displayName: targetName || 'mbktrading',
            role: 'ADMIN',
            initialTopic: topic || 'support',
            isPlatformTicket: true
          });
          setMessengerSubTab('dm');
          setActiveMainView('chart');
          setActiveView('chat');
          markDmAsRead();
        }}
      />

      <RiskCalculatorModal
        isOpen={calculatorModalOpen}
        onClose={() => setCalculatorModalOpen(false)}
        lang={lang}
        defaultSymbol={selectedSymbol}
        tickers={tickers}
      />

      <MarketSessionsModal
        isOpen={sessionsModalOpen}
        onClose={() => setSessionsModalOpen(false)}
        lang={lang}
      />

      <PriceAlertsModal
        isOpen={priceAlertsModalOpen}
        onClose={() => setPriceAlertsModalOpen(false)}
        defaultSymbol={selectedSymbol}
        tickers={tickers}
        alerts={priceAlerts}
        onAddAlert={addPriceAlert}
        onRemoveAlert={removePriceAlert}
        onReactivateAlert={reactivatePriceAlert}
        onClearTriggered={clearTriggeredAlerts}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={requestNotificationPermission}
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
        onOpenCalculatorModal={() => setCalculatorModalOpen(true)}
        onOpenSessionsModal={() => setSessionsModalOpen(true)}
        onOpenQuickSignalDrawer={() => setQuickSignalDrawerOpen(true)}
        canPublishQuickSignals={canPublishQuickSignals}
        onNavigateAdmin={() => setActiveView('admin')}
        lang={lang}
        onToggleLang={onToggleLang}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        showPriceTicker={showPriceTicker}
        onTogglePriceTicker={togglePriceTicker}
        showNewsBanner={showNewsBanner}
        onToggleNewsBanner={toggleNewsBanner}
        isAnalysisMode={isAnalysisMode}
        onToggleAnalysisMode={() => setIsAnalysisMode((prev) => !prev)}
        chatPosition={chatPosition}
        onSetChatPosition={handleSetChatPosition}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleHeaderNotifications}
        onOpenOnboardingTour={handleOpenOnboardingTourManual}
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
        <div className="fixed top-14 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-amber-500 text-black font-bold text-xs shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl flex items-center gap-2 border border-amber-300 animate-bounce pointer-events-auto">
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
        onNavigateToTab={(tab) => {
          if (tab === 'dm') {
            setMessengerSubTab('dm');
            setSideDrawerView('dm');
            setActiveMainView('chart');
            setActiveView('chat');
            markDmAsRead();
          } else if (tab === 'chat') {
            setMessengerSubTab('general');
            setSideDrawerView('chat');
            setActiveMainView('chart');
            setActiveView('chat');
            markChatAsRead();
          } else {
            setActiveMainView('chart');
            setActiveView(tab as any);
          }
        }}
        onOpenSupportChat={() => {
          setDmTargetUser({
            uid: 'mbktrading',
            displayName: 'MBK Trading',
            role: 'ADMIN',
            initialTopic: 'support',
            isPlatformTicket: true
          });
          setMessengerSubTab('dm');
          setSideDrawerView('dm');
          setActiveMainView('chart');
          setActiveView('chat');
          markDmAsRead();
        }}
        onVisibilityChange={setIsAnnouncementPopupVisible}
      />

      {/* Lightweight Zero-Quota Interactive Bilingual Onboarding Tour (localStorage only) */}
      <OnboardingTourModal
        isOpen={onboardingTourOpen}
        onClose={() => setOnboardingTourOpen(false)}
        lang={lang}
        isPostVipActivation={onboardingTourPostVip}
        onNavigateToTab={(tab) => {
          setActiveMainView('chart');
          setActiveView(tab);
        }}
      />
    </div>
  );
};
