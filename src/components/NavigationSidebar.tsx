import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Cpu,
  Copy,
  Briefcase,
  Boxes,
  Sparkles,
  TrendingUp,
  LineChart,
  MessageSquare,
  Calendar,
  CreditCard,
  Settings,
  ShieldCheck,
  ChevronLeft,
  Flame,
  Award
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'signals'
  | 'bot'
  | 'copytrading'
  | 'accounts'
  | 'indicators'
  | 'aisentiment'
  | 'technical'
  | 'charts'
  | 'chat'
  | 'calendar'
  | 'subscription'
  | 'settings';

interface Props {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeSignalsCount: number;
  botRunning: boolean;
  onOpenBrokerModal: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const NavigationSidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  activeSignalsCount,
  botRunning,
  onOpenBrokerModal,
  isOpenMobile,
  setIsOpenMobile
}) => {
  const menuItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'الرئيسية والمؤشرات',
      icon: LayoutDashboard,
      badge: 'عام'
    },
    {
      id: 'signals' as ActiveTab,
      label: 'إشارات التداول الحية',
      icon: Radio,
      badge: `${activeSignalsCount} نشطة`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'bot' as ActiveTab,
      label: 'البوت الآلي (Auto Bot)',
      icon: Cpu,
      badge: botRunning ? 'يعمل 🟢' : 'متوقف ⚪',
      badgeColor: botRunning ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-700 text-slate-400'
    },
    {
      id: 'copytrading' as ActiveTab,
      label: 'نسخ الصفقات (Copy Trading)',
      icon: Copy,
      badge: '+342%'
    },
    {
      id: 'accounts' as ActiveTab,
      label: 'إدارة الحسابات (VIP Portfolio)',
      icon: Briefcase
    },
    {
      id: 'indicators' as ActiveTab,
      label: 'مؤشرات MBK الخاصة (Pine Script)',
      icon: Boxes,
      badge: 'v4.2',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'aisentiment' as ActiveTab,
      label: 'التحليل الاصطناعي (AI Sentiment)',
      icon: Sparkles,
      badge: 'Batch AI',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    {
      id: 'technical' as ActiveTab,
      label: 'التحليل الفني والأسواق',
      icon: TrendingUp
    },
    {
      id: 'charts' as ActiveTab,
      label: 'الرسوم البيانية (TradingView)',
      icon: LineChart
    },
    {
      id: 'chat' as ActiveTab,
      label: 'المجتمع والدردشة الحية',
      icon: MessageSquare,
      badge: '1K+ VIP'
    },
    {
      id: 'calendar' as ActiveTab,
      label: 'الأخبار الاقتصادية (Calendar)',
      icon: Calendar
    },
    {
      id: 'subscription' as ActiveTab,
      label: 'إدارة الاشتراك والترقية',
      icon: CreditCard
    },
    {
      id: 'settings' as ActiveTab,
      label: 'إعدادات المنصة والربط',
      icon: Settings
    }
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-72 bg-[#0d131f] border-l border-slate-800 flex flex-col z-50 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-cyan-400 font-mono tracking-wider text-base">MBK</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-slate-100 text-sm tracking-wide font-mono">MBK TRADING</h1>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[10px] text-cyan-400 font-semibold">المنصة المؤسسية للتداول المالي</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Live Connectivity Badge */}
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>خادم الويب هوك: متصل بنجاح</span>
          </div>
          <span className="text-slate-500 font-mono">v3.4 PRO</span>
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-l from-cyan-600/20 to-sky-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Partner Broker IB Banner (Bottom Conversion Engine) */}
        <div className="p-3 border-t border-slate-800 bg-gradient-to-t from-amber-950/20 to-transparent">
          <div className="rounded-xl p-3 bg-gradient-to-br from-[#1a2333] to-[#161c28] border border-amber-500/30 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

            <div className="flex items-center gap-2 text-amber-400 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-black">شراكة الوسيط المعتمد ECN</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug mb-2.5">
              احصل على اشتراك <strong className="text-amber-300">VIP مجاني مدى الحياة</strong> وبوت التداول ومؤشرات MBK عند فتح حساب تحت وكالتنا.
            </p>

            <button
              onClick={onOpenBrokerModal}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>انضم الآن للوسيط المعتمد</span>
              <Flame className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
