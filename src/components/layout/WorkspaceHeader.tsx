import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  ChevronDown,
  PanelRight,
  User as UserIcon,
  Crown,
  Key,
  Sun,
  Moon,
  Monitor,
  Globe,
  Download,
  ShieldCheck,
  Radio,
  LogOut,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { UserProfile, MarketSymbol, MarketTicker } from '../../types/trading';
import { ThemeMode } from '../../context/ThemeContext';

const CANONICAL_SYMBOLS: Array<{
  symbol: MarketSymbol;
  labelAr: string;
  labelEn: string;
  fallbackPrice: number;
}> = [
  { symbol: 'XAUUSD', labelAr: 'الذهب XAUUSD', labelEn: 'Gold XAUUSD', fallbackPrice: 2745.5 },
  { symbol: 'US100', labelAr: 'ناسداك US100', labelEn: 'Nasdaq US100', fallbackPrice: 20850.0 },
  { symbol: 'EURUSD', labelAr: 'اليورو EURUSD', labelEn: 'Euro EURUSD', fallbackPrice: 1.0845 },
  { symbol: 'GBPUSD', labelAr: 'الباوند GBPUSD', labelEn: 'Pound GBPUSD', fallbackPrice: 1.2965 },
  { symbol: 'WTI', labelAr: 'النفط WTI', labelEn: 'Crude Oil WTI', fallbackPrice: 70.45 },
  { symbol: 'BTCUSD', labelAr: 'بيتكوين BTCUSD', labelEn: 'Bitcoin BTCUSD', fallbackPrice: 91250.0 },
];

export interface WorkspaceHeaderProps {
  user: UserProfile;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (symbol: MarketSymbol) => void;
  // Helping Panel Toggle
  isHelperOpen: boolean;
  onToggleHelper: () => void;
  unreadTradesCount: number;
  unreadChatCount: number;
  unreadDmCount: number;
  // Alerts & Display Controls
  isMuted: boolean;
  onToggleMute: () => void;
  notificationPermission: string;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  showPriceTicker: boolean;
  onTogglePriceTicker: () => void;
  showNewsBanner: boolean;
  onToggleNewsBanner: () => void;
  // Account & Theme & PWA & Staff
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  onOpenProfileModal: () => void;
  onOpenPlansModal: () => void;
  onOpenPromoModal: () => void;
  onOpenQuickSignalDrawer: () => void;
  canPublishQuickSignals: boolean;
  isAdminOrStaff: boolean;
  onNavigateAdmin: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onLogout: () => void;
  onNavigateLogo?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  user,
  lang,
  onToggleLang,
  tickers,
  selectedSymbol,
  onSelectSymbol,
  isHelperOpen,
  onToggleHelper,
  unreadTradesCount,
  unreadChatCount,
  unreadDmCount,
  isMuted,
  onToggleMute,
  notificationPermission,
  notificationsEnabled,
  onToggleNotifications,
  showPriceTicker,
  onTogglePriceTicker,
  showNewsBanner,
  onToggleNewsBanner,
  theme,
  setTheme,
  onOpenProfileModal,
  onOpenPlansModal,
  onOpenPromoModal,
  onOpenQuickSignalDrawer,
  canPublishQuickSignals,
  isAdminOrStaff,
  onNavigateAdmin,
  canInstallPwa,
  onInstallPwa,
  onLogout,
  onNavigateLogo,
}) => {
  const isAr = lang === 'ar';
  const [symbolMenuOpen, setSymbolMenuOpen] = useState(false);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const symbolRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (symbolRef.current && !symbolRef.current.contains(target)) {
        setSymbolMenuOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(target)) {
        setAlertsMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const combinedUnreadCount = unreadTradesCount + unreadChatCount + unreadDmCount;

  const findTicker = (sym: string) => {
    const norm = sym.toUpperCase();
    return tickers.find((t) => {
      const tSym = t.symbol.toUpperCase();
      if (norm === 'US100') return tSym.includes('US100') || tSym.includes('NAS100') || tSym.includes('NDX');
      if (norm === 'WTI') return tSym.includes('WTI') || tSym.includes('USOIL') || tSym.includes('OIL');
      return tSym.includes(norm);
    });
  };

  const activeTicker = findTicker(selectedSymbol);
  const activeMeta =
    CANONICAL_SYMBOLS.find((s) => selectedSymbol.toUpperCase().includes(s.symbol)) || CANONICAL_SYMBOLS[0];
  const displayPrice = activeTicker?.price ?? activeMeta.fallbackPrice;
  const displayChange = activeTicker?.changePercent ?? 0;
  const isPositive = displayChange >= 0;

  const formatPrice = (sym: string, price: number) => {
    const upper = sym.toUpperCase();
    if (upper.includes('EUR') || upper.includes('GBP')) return price.toFixed(4);
    if (upper.includes('BTC') || upper.includes('US100')) return price.toFixed(1);
    return price.toFixed(2);
  };

  const getTierBadge = () => {
    const role = (user.role || '').toLowerCase();
    const tier = (user.tier || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin' || role === 'moderator' || role === 'analyst') {
      return {
        label: 'ADMIN',
        className: 'bg-[#2962FF]/15 text-[#2962FF] border-[#2962FF]/40',
      };
    }
    if (tier === 'elite' || role === 'elite') {
      return {
        label: 'ELITE',
        className: 'bg-[#2962FF]/15 text-[#2962FF] border-[#2962FF]/40',
      };
    }
    if (tier === 'vip' || tier === 'pro' || role === 'vip' || user.isVip) {
      return {
        label: 'VIP',
        className: 'bg-[#089981]/15 text-[#089981] border-[#089981]/40',
      };
    }
    return {
      label: 'FREE',
      className: 'bg-[#242834] text-[#787B86] border-[#2A2E39]',
    };
  };

  const tierBadge = getTierBadge();
  const userInitial = (user.name || user.email || 'M').trim().charAt(0).toUpperCase();

  return (
    <header className="h-12 bg-[#1E222D] border-b border-[#2A2E39] px-2.5 md:px-4 flex items-center justify-between shrink-0 z-40 select-none">
      {/* Start (RTL Right): Compact MBK Logo + Active Symbol Selector Pill */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          type="button"
          onClick={onNavigateLogo}
          className="flex items-center gap-2 shrink-0 focus:outline-none cursor-pointer group"
          title="MBK Trading"
        >
          <div className="w-7 h-7 rounded bg-[#131722] border border-[#2A2E39] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#2962FF] transition-colors">
            <img
              src="/mbk-logo.png?v=8"
              alt="MBK"
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-xs font-extrabold tracking-tight text-[#D1D4DC]">MBK</span>
            <span className="text-[9px] font-mono text-[#787B86] uppercase tracking-wider">TERMINAL</span>
          </div>
        </button>

        <div className="h-5 w-[1px] bg-[#2A2E39] hidden sm:block" />

        {/* Clickable Active Symbol Selector Pill */}
        <div className="relative" ref={symbolRef}>
          <button
            type="button"
            onClick={() => setSymbolMenuOpen((prev) => !prev)}
            className="h-8 px-2.5 rounded bg-[#131722] hover:bg-[#242834] border border-[#2A2E39] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-[#D1D4DC] font-mono tracking-tight">
              {activeMeta.symbol}
            </span>
            <span
              className={`text-xs font-mono tabular-nums font-semibold ${
                isPositive ? 'text-[#089981]' : 'text-[#F23645]'
              }`}
            >
              {formatPrice(activeMeta.symbol, displayPrice)}
            </span>
            <span
              className={`hidden md:inline-flex items-center text-[10px] font-mono tabular-nums px-1 py-0.5 rounded ${
                isPositive
                  ? 'bg-[#089981]/15 text-[#089981]'
                  : 'bg-[#F23645]/15 text-[#F23645]'
              }`}
            >
              {isPositive ? '+' : ''}
              {displayChange.toFixed(2)}%
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#787B86]" />
          </button>

          {symbolMenuOpen && (
            <div className="absolute top-full mt-1.5 start-0 w-64 bg-[#1E222D] border border-[#2A2E39] rounded shadow-xl py-1 z-50">
              <div className="px-3 py-1.5 border-b border-[#2A2E39] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                  {isAr ? 'اختر أصل التداول' : 'Select Instrument'}
                </span>
                <span className="text-[10px] font-mono text-[#787B86]">LIVE</span>
              </div>
              {CANONICAL_SYMBOLS.map((item) => {
                const tk = findTicker(item.symbol);
                const price = tk?.price ?? item.fallbackPrice;
                const chg = tk?.changePercent ?? 0;
                const up = chg >= 0;
                const isSelected = activeMeta.symbol === item.symbol;
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      setSymbolMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-start transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#242834] text-[#D1D4DC]'
                        : 'hover:bg-[#242834]/60 text-[#D1D4DC]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {up ? (
                        <TrendingUp className="w-3.5 h-3.5 text-[#089981] shrink-0" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-[#F23645] shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-bold font-mono text-[#D1D4DC]">{item.symbol}</div>
                        <div className="text-[10px] text-[#787B86] truncate">
                          {isAr ? item.labelAr : item.labelEn}
                        </div>
                      </div>
                    </div>
                    <div className="text-end font-mono tabular-nums">
                      <div className="text-xs font-semibold text-[#D1D4DC]">
                        {formatPrice(item.symbol, price)}
                      </div>
                      <div className={`text-[10px] ${up ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                        {up ? '+' : ''}
                        {chg.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* End (RTL Left) — Strictly 3 Clean Controls:
          1. Helping Panel Toggle
          2. Alerts & Display Popover
          3. Account Menu */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Control 1: Helping Panel Toggle (المساعد / Helper) */}
        <button
          type="button"
          onClick={onToggleHelper}
          className={`relative h-8 px-2.5 rounded border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isHelperOpen
              ? 'bg-[#2962FF] text-white border-[#2962FF]'
              : 'bg-[#131722] hover:bg-[#242834] text-[#D1D4DC] border-[#2A2E39]'
          }`}
          title={isAr ? 'لوحة المساعد الجانبية' : 'Toggle Helping Panel'}
        >
          <PanelRight className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-bold">{isAr ? 'المساعد' : 'Helper'}</span>
          {combinedUnreadCount > 0 && (
            <span className="px-1.5 py-0.2 min-w-[18px] h-[18px] rounded bg-[#F23645] text-white text-[10px] font-mono tabular-nums font-bold flex items-center justify-center">
              {combinedUnreadCount > 99 ? '99+' : combinedUnreadCount}
            </span>
          )}
        </button>

        {/* Control 2: Alerts & Display Popover */}
        <div className="relative" ref={alertsRef}>
          <button
            type="button"
            onClick={() => setAlertsMenuOpen((prev) => !prev)}
            className={`relative h-8 w-8 rounded border flex items-center justify-center transition-colors cursor-pointer ${
              alertsMenuOpen
                ? 'bg-[#242834] text-[#D1D4DC] border-[#2962FF]'
                : 'bg-[#131722] hover:bg-[#242834] text-[#D1D4DC] border-[#2A2E39]'
            }`}
            title={isAr ? 'التنبيهات والعرض' : 'Alerts & Display'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#F23645]" />
            ) : (
              <Bell className="w-4 h-4 text-[#D1D4DC]" />
            )}
            {notificationsEnabled && notificationPermission === 'granted' && !isMuted && (
              <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-[#089981]" />
            )}
          </button>

          {alertsMenuOpen && (
            <div className="absolute top-full mt-1.5 end-0 w-64 bg-[#1E222D] border border-[#2A2E39] rounded shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-[#2A2E39] text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
                {isAr ? 'التنبيهات وشريط الأسعار' : 'Alerts & Display'}
              </div>

              {/* Sound Mute Toggle */}
              <button
                type="button"
                onClick={onToggleMute}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#F23645]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#089981]" />
                  )}
                  <span>{isAr ? 'صوت التنبيهات' : 'Alert Sounds'}</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    !isMuted
                      ? 'bg-[#089981]/15 text-[#089981]'
                      : 'bg-[#F23645]/15 text-[#F23645]'
                  }`}
                >
                  {!isMuted ? (isAr ? 'مفعل' : 'ON') : isAr ? 'مكتوم' : 'MUTED'}
                </span>
              </button>

              {/* Browser Push Notification Permission Toggle */}
              <button
                type="button"
                onClick={onToggleNotifications}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-[#2962FF]" />
                  <span>{isAr ? 'إشعارات المتصفح' : 'Browser Notifications'}</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    notificationsEnabled && notificationPermission === 'granted'
                      ? 'bg-[#089981]/15 text-[#089981]'
                      : 'bg-[#242834] text-[#787B86]'
                  }`}
                >
                  {notificationsEnabled && notificationPermission === 'granted'
                    ? isAr
                      ? 'مفعل'
                      : 'ON'
                    : isAr
                    ? 'تفعيل'
                    : 'OFF'}
                </span>
              </button>

              <div className="my-1 border-t border-[#2A2E39]" />

              {/* Price Ticker Strip Toggle */}
              <button
                type="button"
                onClick={onTogglePriceTicker}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {showPriceTicker ? (
                    <Eye className="w-3.5 h-3.5 text-[#089981]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#787B86]" />
                  )}
                  <span>{isAr ? 'شريط الأسعار المباشر' : 'Live Price Ticker'}</span>
                </span>
                {showPriceTicker && <Check className="w-3.5 h-3.5 text-[#089981]" />}
              </button>

              {/* News Strip Toggle */}
              <button
                type="button"
                onClick={onToggleNewsBanner}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {showNewsBanner ? (
                    <Eye className="w-3.5 h-3.5 text-[#089981]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#787B86]" />
                  )}
                  <span>{isAr ? 'شريط الأخبار العاجلة' : 'Breaking News Strip'}</span>
                </span>
                {showNewsBanner && <Check className="w-3.5 h-3.5 text-[#089981]" />}
              </button>
            </div>
          )}
        </div>

        {/* Control 3: Account Menu */}
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className="h-8 px-2 rounded bg-[#131722] hover:bg-[#242834] border border-[#2A2E39] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded bg-[#242834] border border-[#2A2E39] flex items-center justify-center text-[11px] font-bold text-[#D1D4DC]">
              {userInitial}
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${tierBadge.className}`}
            >
              {tierBadge.label}
            </span>
            <ChevronDown className="w-3 h-3 text-[#787B86]" />
          </button>

          {accountMenuOpen && (
            <div className="absolute top-full mt-1.5 end-0 w-64 bg-[#1E222D] border border-[#2A2E39] rounded shadow-xl py-1.5 z-50">
              {/* User Identity Header */}
              <div className="px-3 py-2 border-b border-[#2A2E39]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#D1D4DC] truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${tierBadge.className}`}
                  >
                    {tierBadge.label}
                  </span>
                </div>
                <div className="text-[11px] text-[#787B86] truncate font-mono mt-0.5">
                  {user.email}
                </div>
              </div>

              {/* Profile & Subscription Actions */}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#787B86]" />
                <span>{isAr ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenPlansModal();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-[#2962FF]" />
                <span>{isAr ? 'باقات الاشتراك (VIP / Elite)' : 'Subscription Plans'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenPromoModal();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-[#089981]" />
                <span>{isAr ? 'تفعيل مفتاح اشتراك' : 'Redeem Activation Key'}</span>
              </button>

              {/* Staff / Admin Strictly Gated Shortcuts */}
              {(isAdminOrStaff || canPublishQuickSignals) && (
                <>
                  <div className="my-1 border-t border-[#2A2E39]" />
                  {canPublishQuickSignals && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenQuickSignalDrawer();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#089981] font-semibold transition-colors cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نشر صفقة سريعة' : 'Publish Quick Signal'}</span>
                    </button>
                  )}
                  {isAdminOrStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigateAdmin();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#2962FF] font-semibold transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}</span>
                    </button>
                  )}
                </>
              )}

              <div className="my-1 border-t border-[#2A2E39]" />

              {/* Theme Selector (Dark / Light / Auto) */}
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs text-[#787B86]">{isAr ? 'المظهر' : 'Theme'}</span>
                <div className="flex items-center bg-[#131722] border border-[#2A2E39] rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#2962FF] text-white'
                        : 'text-[#787B86] hover:text-[#D1D4DC]'
                    }`}
                    title={isAr ? 'داكن' : 'Dark'}
                  >
                    <Moon className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#2962FF] text-white'
                        : 'text-[#787B86] hover:text-[#D1D4DC]'
                    }`}
                    title={isAr ? 'فاتح' : 'Light'}
                  >
                    <Sun className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('auto')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      theme === 'auto'
                        ? 'bg-[#2962FF] text-white'
                        : 'text-[#787B86] hover:text-[#D1D4DC]'
                    }`}
                    title={isAr ? 'تلقائي' : 'Auto'}
                  >
                    <Monitor className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Language Toggle (عربي / EN) */}
              <button
                type="button"
                onClick={() => {
                  onToggleLang();
                  setAccountMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#242834] text-xs text-[#D1D4DC] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="w-3.5 h-3.5 text-[#787B86]" />
                  <span>{isAr ? 'اللغة / Language' : 'Language / اللغة'}</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#242834] text-[#D1D4DC] border border-[#2A2E39]">
                  {isAr ? 'EN' : 'عربي'}
                </span>
              </button>

              {/* Install App (PWA) */}
              {canInstallPwa && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onInstallPwa();
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#242834] text-xs text-[#2962FF] font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تثبيت التطبيق على الجهاز' : 'Install App (PWA)'}</span>
                </button>
              )}

              <div className="my-1 border-t border-[#2A2E39]" />

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onLogout();
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#F23645]/10 text-xs text-[#F23645] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
