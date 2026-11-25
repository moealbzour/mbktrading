import React from 'react';
import {
  Target,
  BarChart2,
  Grid,
  Newspaper,
  Calendar,
  MessageSquare,
  Bot,
  Layers,
  GraduationCap,
  Crown,
  Calculator,
  Clock,
  Headphones,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Wrench,
  Radio,
} from 'lucide-react';
import { WorkspaceView } from './TradingViewWorkspace';

export type MobilePrimaryTab = 'signals' | 'markets' | 'community' | 'tools' | 'helper';
export type MobileMarketSubTab = 'chart' | 'heatmap' | 'news' | 'calendar';

export interface WorkspaceNavProps {
  lang: 'ar' | 'en';
  activeView: WorkspaceView;
  activeMainView: 'chart' | 'heatmap';
  isMobileToolsHubOpen: boolean;
  onSelectWorkspaceView: (view: WorkspaceView, mainView?: 'chart' | 'heatmap') => void;
  onOpenMobileToolsHub: () => void;
  // Helping Panel
  isHelperOpen: boolean;
  onToggleHelper: () => void;
  // Collapsible Desktop Sidebar State
  isRailExpanded: boolean;
  onToggleRailExpanded: () => void;
  // Unread Counters
  unreadTradesCount: number;
  unreadChatCount: number;
  unreadDmCount: number;
  // Quick Utility Modals
  onOpenCalculatorModal: () => void;
  onOpenSessionsModal: () => void;
  onOpenSupportModal: () => void;
  onOpenQuickSignalDrawer?: () => void;
  canPublishQuickSignals?: boolean;
  isAdminOrStaff: boolean;
}

/**
 * Desktop (`md+`, 768px and above):
 * ONE sleek collapsible vertical sidebar rail (`w-56` expanded with crisp topic labels,
 * `w-16` collapsed with icon + short written label underneath) grouping all existing modules cleanly.
 */
export const WorkspaceDesktopRail: React.FC<WorkspaceNavProps> = ({
  lang,
  activeView,
  activeMainView,
  isMobileToolsHubOpen,
  onSelectWorkspaceView,
  isRailExpanded,
  onToggleRailExpanded,
  unreadTradesCount,
  unreadChatCount,
  unreadDmCount,
  onOpenCalculatorModal,
  onOpenSessionsModal,
  onOpenSupportModal,
  onOpenQuickSignalDrawer,
  canPublishQuickSignals,
  isAdminOrStaff,
}) => {
  const isAr = lang === 'ar';
  const communityUnread = unreadChatCount + unreadDmCount;

  const isChartActive = !isMobileToolsHubOpen && activeView === 'chart' && activeMainView === 'chart';
  const isHeatmapActive = !isMobileToolsHubOpen && activeMainView === 'heatmap';

  const navItems: Array<{
    id: string;
    labelAr: string;
    shortAr: string;
    labelEn: string;
    shortEn: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: 'signals',
      labelAr: 'الإشارات وبوت MBK',
      shortAr: 'الإشارات',
      labelEn: 'Signals & Bot',
      shortEn: 'Signals',
      icon: Target,
      isActive: !isMobileToolsHubOpen && activeMainView === 'chart' && activeView === 'signals',
      badge: unreadTradesCount,
      onClick: () => onSelectWorkspaceView('signals', 'chart'),
    },
    {
      id: 'chart',
      labelAr: 'الشارت المباشر',
      shortAr: 'الشارت',
      labelEn: 'Live Chart',
      shortEn: 'Chart',
      icon: BarChart2,
      isActive: isChartActive,
      onClick: () => onSelectWorkspaceView('chart', 'chart'),
    },
    {
      id: 'heatmap',
      labelAr: 'خريطة السيولة',
      shortAr: 'السيولة',
      labelEn: 'Market Heatmap',
      shortEn: 'Heatmap',
      icon: Grid,
      isActive: isHeatmapActive,
      onClick: () => onSelectWorkspaceView('chart', 'heatmap'),
    },
    {
      id: 'news',
      labelAr: 'الأخبار والتحليلات',
      shortAr: 'الأخبار',
      labelEn: 'News & Analysis',
      shortEn: 'News',
      icon: Newspaper,
      isActive: !isMobileToolsHubOpen && activeView === 'news',
      onClick: () => onSelectWorkspaceView('news', 'chart'),
    },
    {
      id: 'calendar',
      labelAr: 'المفكرة الاقتصادية',
      shortAr: 'المفكرة',
      labelEn: 'Economic Calendar',
      shortEn: 'Calendar',
      icon: Calendar,
      isActive: !isMobileToolsHubOpen && activeView === 'calendar',
      onClick: () => onSelectWorkspaceView('calendar', 'chart'),
    },
    {
      id: 'community',
      labelAr: 'المجتمع والرسائل',
      shortAr: 'المجتمع',
      labelEn: 'Community & Inbox',
      shortEn: 'Chat',
      icon: MessageSquare,
      isActive: !isMobileToolsHubOpen && (activeView === 'chat' || activeView === 'dm'),
      badge: communityUnread,
      onClick: () => onSelectWorkspaceView('chat', 'chart'),
    },
    {
      id: 'ai',
      labelAr: 'مساعد MBK الذكي',
      shortAr: 'الذكاء AI',
      labelEn: 'MBK AI Assistant',
      shortEn: 'MBK AI',
      icon: Bot,
      isActive: !isMobileToolsHubOpen && activeView === 'ai',
      onClick: () => onSelectWorkspaceView('ai', 'chart'),
    },
    {
      id: 'paper',
      labelAr: 'التداول التجريبي',
      shortAr: 'تجريبي',
      labelEn: 'Paper Trading',
      shortEn: 'Paper',
      icon: Layers,
      isActive: !isMobileToolsHubOpen && activeView === 'paper',
      onClick: () => onSelectWorkspaceView('paper', 'chart'),
    },
    {
      id: 'academy',
      labelAr: 'أكاديمية التداول',
      shortAr: 'الأكاديمية',
      labelEn: 'Trading Academy',
      shortEn: 'Academy',
      icon: GraduationCap,
      isActive: !isMobileToolsHubOpen && activeView === 'academy',
      onClick: () => onSelectWorkspaceView('academy', 'chart'),
    },
    {
      id: 'elite',
      labelAr: 'خزنة النخبة Elite',
      shortAr: 'النخبة',
      labelEn: 'Elite Vault',
      shortEn: 'Elite',
      icon: Crown,
      isActive: !isMobileToolsHubOpen && activeView === 'elite',
      onClick: () => onSelectWorkspaceView('elite', 'chart'),
    },
  ];

  if (isAdminOrStaff) {
    navItems.push({
      id: 'admin',
      labelAr: 'لوحة الإدارة',
      shortAr: 'الإدارة',
      labelEn: 'Admin Panel',
      shortEn: 'Admin',
      icon: ShieldCheck,
      isActive: !isMobileToolsHubOpen && activeView === 'admin',
      onClick: () => onSelectWorkspaceView('admin', 'chart'),
    });
  }

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-[#F8F9FD] dark:bg-[#1E222D] border-e border-[#E0E3EB] dark:border-[#2A2E39] select-none transition-all duration-150 z-30 ${
        isRailExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top Collapse/Expand Header */}
      <div className="h-10 px-2 border-b border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between shrink-0">
        {isRailExpanded && (
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#787B86] truncate">
            {isAr ? 'أقسام المنصة' : 'Workspace'}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleRailExpanded}
          className={`h-7 rounded hover:bg-[#EDF1F7] dark:hover:bg-[#242834] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] flex items-center justify-center transition-colors cursor-pointer ${
            isRailExpanded ? 'px-2 ms-auto' : 'w-full'
          }`}
          title={isRailExpanded ? (isAr ? 'طي القائمة' : 'Collapse sidebar') : isAr ? 'توسيع القائمة' : 'Expand sidebar'}
        >
          {isRailExpanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Modules Navigation List */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative w-full rounded transition-colors cursor-pointer flex ${
                isRailExpanded
                  ? 'h-9 px-2.5 items-center justify-between'
                  : 'py-2 px-1 flex-col items-center justify-center gap-1'
              } ${
                item.isActive
                  ? 'bg-[#2962FF] text-white font-bold'
                  : 'text-[#787B86] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] hover:text-[#131722] dark:hover:text-[#D1D4DC]'
              }`}
            >
              <div className={`flex items-center ${isRailExpanded ? 'gap-2.5 min-w-0' : 'flex-col gap-1'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {isRailExpanded ? (
                  <span className="text-xs truncate">{isAr ? item.labelAr : item.labelEn}</span>
                ) : (
                  <span className="text-[10px] leading-tight font-semibold truncate max-w-[54px]">
                    {isAr ? item.shortAr : item.shortEn}
                  </span>
                )}
              </div>

              {item.badge && item.badge > 0 ? (
                <span
                  className={`font-mono tabular-nums font-bold rounded text-[10px] flex items-center justify-center ${
                    isRailExpanded
                      ? 'px-1.5 min-w-[18px] h-[18px] bg-[#F23645] text-white'
                      : 'absolute top-1 end-1 px-1 min-w-[14px] h-[14px] bg-[#F23645] text-white text-[9px]'
                  }`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Quick Utility Actions Footer (Risk Calculator, Sessions, Support, Staff Quick Signal) */}
      <div className="p-1.5 border-t border-[#E0E3EB] dark:border-[#2A2E39] space-y-0.5 shrink-0">
        {isRailExpanded && (
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#787B86]">
            {isAr ? 'أدوات سريعة' : 'Quick Tools'}
          </div>
        )}

        {canPublishQuickSignals && onOpenQuickSignalDrawer && (
          <button
            type="button"
            onClick={onOpenQuickSignalDrawer}
            className={`w-full rounded text-[#089981] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] transition-colors cursor-pointer flex ${
              isRailExpanded
                ? 'h-8 px-2.5 items-center gap-2.5 text-xs font-semibold'
                : 'py-1.5 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isAr ? (isRailExpanded ? 'نشر صفقة سريعة' : 'صفقة') : isRailExpanded ? 'Quick Signal' : 'Signal'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenCalculatorModal}
          className={`w-full rounded text-[#787B86] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] hover:text-[#131722] dark:hover:text-[#D1D4DC] transition-colors cursor-pointer flex ${
            isRailExpanded
              ? 'h-8 px-2.5 items-center gap-2.5 text-xs'
              : 'py-1.5 flex-col items-center justify-center gap-0.5 text-[9px]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isAr ? (isRailExpanded ? 'حاسبة المخاطر واللوت' : 'الحاسبة') : isRailExpanded ? 'Risk Calculator' : 'Risk'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSessionsModal}
          className={`w-full rounded text-[#787B86] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] hover:text-[#131722] dark:hover:text-[#D1D4DC] transition-colors cursor-pointer flex ${
            isRailExpanded
              ? 'h-8 px-2.5 items-center gap-2.5 text-xs'
              : 'py-1.5 flex-col items-center justify-center gap-0.5 text-[9px]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isAr ? (isRailExpanded ? 'جلسات التداول العالمية' : 'الجلسات') : isRailExpanded ? 'Market Sessions' : 'Sessions'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSupportModal}
          className={`w-full rounded text-[#787B86] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] hover:text-[#131722] dark:hover:text-[#D1D4DC] transition-colors cursor-pointer flex ${
            isRailExpanded
              ? 'h-8 px-2.5 items-center gap-2.5 text-xs'
              : 'py-1.5 flex-col items-center justify-center gap-0.5 text-[9px]'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isAr ? (isRailExpanded ? 'الدعم الفني 24/7' : 'الدعم') : isRailExpanded ? '24/7 Support' : 'Support'}
          </span>
        </button>
      </div>
    </aside>
  );
};

/**
 * Mobile (`< md`, below 768px):
 * Compact top segmented switcher when inside the `Markets` tab: `Chart | Heatmap | News | Calendar`
 */
export const WorkspaceMobileMarketsBar: React.FC<{
  lang: 'ar' | 'en';
  activeSubTab: MobileMarketSubTab;
  onSelectSubTab: (sub: MobileMarketSubTab) => void;
}> = ({ lang, activeSubTab, onSelectSubTab }) => {
  const isAr = lang === 'ar';
  const tabs: Array<{ id: MobileMarketSubTab; labelAr: string; labelEn: string }> = [
    { id: 'chart', labelAr: 'الشارت', labelEn: 'Chart' },
    { id: 'heatmap', labelAr: 'السيولة', labelEn: 'Heatmap' },
    { id: 'news', labelAr: 'الأخبار', labelEn: 'News' },
    { id: 'calendar', labelAr: 'المفكرة', labelEn: 'Calendar' },
  ];

  return (
    <div className="md:hidden h-10 bg-[#F8F9FD] dark:bg-[#1E222D] border-b border-[#E0E3EB] dark:border-[#2A2E39] px-2 flex items-center gap-1 shrink-0">
      {tabs.map((tab) => {
        const isActive = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectSubTab(tab.id)}
            className={`flex-1 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#2962FF] text-white'
                : 'bg-[#FFFFFF] dark:bg-[#131722] text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC] border border-[#E0E3EB] dark:border-[#2A2E39]'
            }`}
          >
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Mobile (`< md`) Tools Hub Grid:
 * Clean flat Tools Hub grid containing cards for:
 * Paper Trading, Risk & Lot Calculator, Market Sessions Clock, Trading Academy,
 * MBK AI Assistant, Elite Vault, 24/7 Support, and Admin Dashboard if staff.
 */
export const WorkspaceMobileToolsHub: React.FC<{
  lang: 'ar' | 'en';
  onSelectView: (view: WorkspaceView) => void;
  onOpenCalculatorModal: () => void;
  onOpenSessionsModal: () => void;
  onOpenSupportModal: () => void;
  isAdminOrStaff: boolean;
}> = ({
  lang,
  onSelectView,
  onOpenCalculatorModal,
  onOpenSessionsModal,
  onOpenSupportModal,
  isAdminOrStaff,
}) => {
  const isAr = lang === 'ar';

  const cards = [
    {
      id: 'paper',
      titleAr: 'التداول التجريبي',
      titleEn: 'Paper Trading',
      descAr: 'اختبر استراتيجياتك بمحفظة افتراضية مباشرة',
      descEn: 'Practice trades risk-free with live market prices',
      icon: Layers,
      accent: 'text-[#2962FF]',
      onClick: () => onSelectView('paper'),
    },
    {
      id: 'calculator',
      titleAr: 'حاسبة المخاطر واللوت',
      titleEn: 'Risk & Lot Calculator',
      descAr: 'احسب حجم العقد ونسبة المخاطرة بدقة مؤسسية',
      descEn: 'Calculate exact position size and stop-loss risk',
      icon: Calculator,
      accent: 'text-[#089981]',
      onClick: onOpenCalculatorModal,
    },
    {
      id: 'sessions',
      titleAr: 'ساعة الجلسات العالمية',
      titleEn: 'Market Sessions Clock',
      descAr: 'مواعيد افتتاح وإغلاق جلسات لندن ونيويورك وطوكيو',
      descEn: 'Live London, New York, Tokyo & Sydney session hours',
      icon: Clock,
      accent: 'text-[#2962FF]',
      onClick: onOpenSessionsModal,
    },
    {
      id: 'academy',
      titleAr: 'أكاديمية التداول',
      titleEn: 'Trading Academy',
      descAr: 'دروس احترافية في إدارة رأس المال والتحليل الفني',
      descEn: 'Institutional courses on price action & risk management',
      icon: GraduationCap,
      accent: 'text-[#089981]',
      onClick: () => onSelectView('academy'),
    },
    {
      id: 'ai',
      titleAr: 'مساعد MBK الذكي',
      titleEn: 'MBK AI Assistant',
      descAr: 'تحليل فوري للذهب والناسداك والفوركس بالذكاء الاصطناعي',
      descEn: 'Instant AI market structure & macro analysis',
      icon: Bot,
      accent: 'text-[#2962FF]',
      onClick: () => onSelectView('ai'),
    },
    {
      id: 'elite',
      titleAr: 'خزنة النخبة Elite',
      titleEn: 'Elite Vault',
      descAr: 'أدوات واستراتيجيات حصرية لأعضاء النخبة',
      descEn: 'Exclusive institutional setups & VIP research',
      icon: Crown,
      accent: 'text-[#2962FF]',
      onClick: () => onSelectView('elite'),
    },
    {
      id: 'support',
      titleAr: 'الدعم الفني 24/7',
      titleEn: '24/7 Support Desk',
      descAr: 'تواصل مباشر مع فريق دعم MBK Trading',
      descEn: 'Direct assistance from the MBK support team',
      icon: Headphones,
      accent: 'text-[#089981]',
      onClick: onOpenSupportModal,
    },
  ];

  if (isAdminOrStaff) {
    cards.push({
      id: 'admin',
      titleAr: 'لوحة تحكم الإدارة',
      titleEn: 'Admin Dashboard',
      descAr: 'إدارة الأعضاء، المفاتيح، الإشارات، والنسخ الاحتياطي',
      descEn: 'Manage users, activation keys, signals & system backups',
      icon: ShieldCheck,
      accent: 'text-[#2962FF]',
      onClick: () => onSelectView('admin'),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFFFFF] dark:bg-[#131722] p-3 pb-20">
      <div className="max-w-xl mx-auto">
        <div className="mb-3 pb-2 border-b border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#131722] dark:text-[#D1D4DC]">
              {isAr ? 'مركز أدوات المتداول' : 'Trader Tools Hub'}
            </h2>
            <p className="text-[11px] text-[#787B86]">
              {isAr
                ? 'جميع أدوات الحسابات والتدريب والذكاء الاصطناعي في مكان واحد'
                : 'Calculators, simulator, academy & AI assistant in one place'}
            </p>
          </div>
          <Wrench className="w-4 h-4 text-[#1E53E5] dark:text-[#2962FF]" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className="p-3 rounded bg-[#F8F9FD] dark:bg-[#1E222D] hover:bg-[#EDF1F7] dark:hover:bg-[#242834] border border-[#E0E3EB] dark:border-[#2A2E39] text-start flex flex-col justify-between gap-2 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${card.accent}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#131722] dark:text-[#D1D4DC] leading-snug">
                    {isAr ? card.titleAr : card.titleEn}
                  </div>
                  <div className="text-[10px] text-[#787B86] mt-0.5 line-clamp-2 leading-relaxed">
                    {isAr ? card.descAr : card.descEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile (`< md`, below 768px):
 * Fixed 5-Tab Bottom Navigation Bar (`h-14` + `.pb-safe`, `#1E222D`, `1px` top border `#2A2E39`,
 * `#787B86` inactive icons, `#2962FF` active icon + crisp Arabic/English label underneath)
 */
export const WorkspaceMobileBottomBar: React.FC<{
  lang: 'ar' | 'en';
  activePrimaryTab: MobilePrimaryTab;
  isHelperOpen: boolean;
  onSelectSignals: () => void;
  onSelectMarkets: () => void;
  onSelectCommunity: () => void;
  onSelectTools: () => void;
  onToggleHelper: () => void;
  unreadTradesCount: number;
  unreadCommunityCount: number;
}> = ({
  lang,
  activePrimaryTab,
  isHelperOpen,
  onSelectSignals,
  onSelectMarkets,
  onSelectCommunity,
  onSelectTools,
  onToggleHelper,
  unreadTradesCount,
  unreadCommunityCount,
}) => {
  const isAr = lang === 'ar';

  const tabs: Array<{
    id: MobilePrimaryTab;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: 'signals',
      labelAr: 'الإشارات',
      labelEn: 'Signals',
      icon: Target,
      isActive: !isHelperOpen && activePrimaryTab === 'signals',
      badge: unreadTradesCount,
      onClick: onSelectSignals,
    },
    {
      id: 'markets',
      labelAr: 'الأسواق',
      labelEn: 'Markets',
      icon: BarChart2,
      isActive: !isHelperOpen && activePrimaryTab === 'markets',
      onClick: onSelectMarkets,
    },
    {
      id: 'community',
      labelAr: 'المجتمع',
      labelEn: 'Community',
      icon: MessageSquare,
      isActive: !isHelperOpen && activePrimaryTab === 'community',
      badge: unreadCommunityCount,
      onClick: onSelectCommunity,
    },
    {
      id: 'tools',
      labelAr: 'الأدوات',
      labelEn: 'Tools',
      icon: Wrench,
      isActive: !isHelperOpen && activePrimaryTab === 'tools',
      onClick: onSelectTools,
    },
    {
      id: 'helper',
      labelAr: 'المساعد',
      labelEn: 'Helper',
      icon: PanelRight,
      isActive: isHelperOpen,
      onClick: onToggleHelper,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 pb-safe bg-[#F8F9FD] dark:bg-[#1E222D] border-t border-[#E0E3EB] dark:border-[#2A2E39] flex items-center justify-around z-40 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              tab.isActive ? 'text-[#1E53E5] dark:text-[#2962FF]' : 'text-[#787B86] hover:text-[#131722] dark:hover:text-[#D1D4DC]'
            }`}
          >
            {tab.isActive && (
              <span className="absolute top-0 inset-x-4 h-[2px] bg-[#2962FF]" />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-bold leading-tight">
              {isAr ? tab.labelAr : tab.labelEn}
            </span>
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute top-1.5 end-1/4 px-1 min-w-[15px] h-[15px] rounded bg-[#F23645] text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
