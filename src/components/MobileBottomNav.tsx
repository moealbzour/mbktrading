import React from 'react';
import {
  Radio,
  Users,
  Bot,
  BookOpen,
  Menu,
  Shield,
  Layers,
  Repeat,
  Volume2,
  VolumeX,
  LogOut,
  Download,
  X
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type DashboardTab =
  | 'signals'
  | 'traders'
  | 'indicators'
  | 'copy_trading'
  | 'ai_agent'
  | 'journal'
  | 'admin';

interface Props {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  lang?: 'ar' | 'en';
  signalsCount?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onLogout?: () => void;
  onOpenBrokerModal?: () => void;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  lang = 'ar',
  signalsCount = 2,
  isMuted = false,
  onToggleMute,
  onLogout,
  onOpenBrokerModal
}) => {
  const [moreDrawerOpen, setMoreDrawerOpen] = React.useState(false);
  const isAr = lang === 'ar';

  const mainTabs = [
    {
      id: 'signals' as DashboardTab,
      labelAr: 'الإشارات',
      labelEn: 'Signals',
      icon: Radio,
      badge: signalsCount > 0 ? `${signalsCount}` : undefined,
      color: '#089981'
    },
    {
      id: 'traders' as DashboardTab,
      labelAr: 'المحللون',
      labelEn: 'Analysts',
      icon: Users,
      badge: 'PRO',
      color: '#f59e0b'
    },
    {
      id: 'ai_agent' as DashboardTab,
      labelAr: 'المستشار AI',
      labelEn: 'AI Agent',
      icon: Bot,
      color: '#3b82f6'
    },
    {
      id: 'journal' as DashboardTab,
      labelAr: 'المفكرة $100K',
      labelEn: 'Journal Desk',
      icon: BookOpen,
      badge: '+$4.8K',
      color: '#089981'
    }
  ];

  return (
    <>
      {/* NATIVE-FEELING MOBILE BOTTOM NAVIGATION DOCK */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#131722]/95 backdrop-blur-md border-t border-[#2a2e39] pb-safe shadow-[0_-8px_25px_rgba(0,0,0,0.6)] select-none"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-around px-1 py-1">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundManager.playClick();
                  setMoreDrawerOpen(false);
                  onChangeTab(tab.id);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 relative transition-all duration-150 cursor-pointer ${
                  isActive ? 'text-white' : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full"
                    style={{
                      backgroundColor: tab.color,
                      boxShadow: `0 0 8px ${tab.color}`
                    }}
                  />
                )}

                {/* Icon with optional badge */}
                <div className="relative my-0.5">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110' : 'opacity-80'
                    }`}
                    style={{ color: isActive ? tab.color : undefined }}
                  />

                  {tab.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold leading-none ${
                        tab.badge === 'PRO'
                          ? 'bg-amber-500 text-black'
                          : 'bg-[#089981] text-white'
                      }`}
                      dir="ltr"
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] font-medium leading-tight truncate max-w-[64px] ${
                    isActive ? 'font-bold text-white' : 'text-[#787b86]'
                  }`}
                >
                  {isAr ? tab.labelAr : tab.labelEn}
                </span>
              </button>
            );
          })}

          {/* MORE / EXTRA MENU BUTTON */}
          <button
            onClick={() => {
              soundManager.playClick();
              setMoreDrawerOpen(!moreDrawerOpen);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 relative transition-all duration-150 cursor-pointer ${
              activeTab === 'indicators' ||
              activeTab === 'copy_trading' ||
              activeTab === 'admin' ||
              moreDrawerOpen
                ? 'text-white'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {(activeTab === 'indicators' ||
              activeTab === 'copy_trading' ||
              activeTab === 'admin') && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full bg-white shadow-[0_0_8px_white]" />
            )}

            <div className="relative my-0.5">
              <Menu className="w-5 h-5" />
            </div>

            <span className="text-[10px] font-medium leading-tight">
              {isAr ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      </nav>

      {/* MORE ACTIONS BOTTOM DRAWER (POPUP SHEET FOR MOBILE) */}
      {moreDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-fade-in"
          onClick={() => setMoreDrawerOpen(false)}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div
            className="bg-[#1e222d] border-t border-[#2a2e39] rounded-t-2xl p-4 shadow-2xl space-y-3 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#089981]" />
                <span className="text-xs font-bold text-white">
                  {isAr ? 'القائمة والأدوات الإضافية' : 'Additional Tools & Services'}
                </span>
              </div>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1 text-[#787b86] hover:text-white rounded-md hover:bg-[#2a2e39] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Additional Tab Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setMoreDrawerOpen(false);
                  onChangeTab('indicators');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                  activeTab === 'indicators'
                    ? 'bg-white text-[#131722] border-white font-bold'
                    : 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc] hover:border-[#787b86]'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {isAr ? 'متجر المؤشرات' : 'Indicators'}
                  </div>
                  <div className="text-[10px] text-[#787b86] truncate">
                    Pine Script VIP
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setMoreDrawerOpen(false);
                  onChangeTab('copy_trading');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left rtl:text-right transition-all cursor-pointer ${
                  activeTab === 'copy_trading'
                    ? 'bg-white text-[#131722] border-white font-bold'
                    : 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc] hover:border-[#787b86]'
                }`}
              >
                <Repeat className="w-4 h-4 shrink-0 text-[#089981]" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {isAr ? 'نسخ الصفقات' : 'Copy Trading'}
                  </div>
                  <div className="text-[10px] text-[#787b86] truncate">
                    {isAr ? 'وسطاء معتمدون' : 'Broker Sync'}
                  </div>
                </div>
              </button>
            </div>

            {/* CEO Admin Command Center */}
            <button
              onClick={() => {
                soundManager.playClick();
                setMoreDrawerOpen(false);
                onChangeTab('admin');
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-[#131722] border-white font-bold'
                  : 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc] hover:border-[#787b86]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">
                  {isAr ? 'لوحة تحكم الإدارة (Command Center)' : 'Admin Command Center'}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#2a2e39] text-[#787b86]">
                PIN 2026
              </span>
            </button>

            {/* Quick Actions (Sound & Logout) */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#2a2e39]">
              {onToggleMute && (
                <button
                  onClick={() => {
                    onToggleMute();
                    soundManager.playClick();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#131722] border border-[#2a2e39] text-xs text-[#d1d4dc] hover:text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[#f23645]" />
                      <span>{isAr ? 'تشغيل الصوت' : 'Unmute Sound'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#089981]" />
                      <span>{isAr ? 'كتم الصوت' : 'Mute Sound'}</span>
                    </>
                  )}
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setMoreDrawerOpen(false);
                    onLogout();
                  }}
                  className="py-2 px-4 rounded-xl bg-[#f23645]/15 hover:bg-[#f23645]/25 border border-[#f23645]/30 text-xs font-bold text-[#f23645] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isAr ? 'خروج' : 'Logout'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
