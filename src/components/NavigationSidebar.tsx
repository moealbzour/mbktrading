import React from 'react';
import {
  Globe2,
  LineChart,
  BookOpen,
  Layers,
  Brain,
  FlaskConical,
  Wallet,
  Radio,
  Cpu,
  Copy,
  MessageSquare,
  CreditCard,
  Settings,
  ChevronLeft,
  Award,
  Sparkles,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type ActiveTab =
  | 'desk'
  | 'chart'
  | 'journal'
  | 'playbooks'
  | 'aicoach'
  | 'paper'
  | 'backtest'
  | 'signals'
  | 'bot'
  | 'copytrading'
  | 'community'
  | 'pricing'
  | 'settings';

interface Props {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeSignalsCount: number;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isVIP?: boolean;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

export const NavigationSidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  activeSignalsCount,
  isOpenMobile,
  setIsOpenMobile,
  isVIP
}) => {
  const navSections: NavSection[] = [
    {
      group: 'غرفة الأسواق والتحليل (Market Desk)',
      items: [
        {
          id: 'desk' as ActiveTab,
          label: 'غرفة الأسواق (MBK Desk)',
          sublabel: 'جلسات التداول والأجندة اللحظية',
          icon: Globe2,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        },
        {
          id: 'chart' as ActiveTab,
          label: 'الرسم البياني (TradingView)',
          sublabel: 'محطة الشارت والتحليل الفني',
          icon: LineChart
        }
      ]
    },
    {
      group: 'سجل الصفقات والنماذج (Journal & Playbooks)',
      items: [
        {
          id: 'journal' as ActiveTab,
          label: 'سجل الصفقات (Smart Journal)',
          sublabel: 'كاشف العادات والتحليل النفسي',
          icon: BookOpen,
          badge: 'AI Habits',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        },
        {
          id: 'playbooks' as ActiveTab,
          label: 'نماذج التداول (Playbooks)',
          sublabel: 'استراتيجيات SMC وشروط الدخول',
          icon: Layers,
          badge: 'Edge',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        },
        {
          id: 'backtest' as ActiveTab,
          label: 'مختبر الباك تيست (Backtest Lab)',
          sublabel: 'محاكاة الجدوى الإحصائية للمحفظة',
          icon: FlaskConical
        }
      ]
    },
    {
      group: 'الذكاء الاصطناعي والإشارات (AI & Alpha)',
      items: [
        {
          id: 'aicoach' as ActiveTab,
          label: 'الموجّه الذكي (AI Coach)',
          sublabel: 'مراجعة الصفقات ومستشار الشارت',
          icon: Brain,
          badge: 'Gemini 3.8',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        },
        {
          id: 'signals' as ActiveTab,
          label: 'إشارات التداول (Alpha Signals)',
          sublabel: 'إشارات مؤسسية فورية مع مناطق SMC',
          icon: Radio,
          badge: `${activeSignalsCount} نشطة`,
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }
      ]
    },
    {
      group: 'التنفيذ والمحافظ (Execution & Portfolio)',
      items: [
        {
          id: 'paper' as ActiveTab,
          label: 'المحفظة الافتراضية (Paper Trading)',
          sublabel: 'تداول تجريبي برأس مال 100K$',
          icon: Wallet,
          badge: '$100K',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        },
        {
          id: 'bot' as ActiveTab,
          label: 'البوت الآلي (Auto MT5 Bot)',
          sublabel: 'تنفيذ خوارزمي على خوادم ميتاتريدر',
          icon: Cpu,
          badge: 'قريباً'
        },
        {
          id: 'copytrading' as ActiveTab,
          label: 'نسخ الصفقات (Copy Trading)',
          sublabel: 'نسخ محافظ محللي MBK المعتمدين',
          icon: Copy,
          badge: '+342%'
        }
      ]
    },
    {
      group: 'المجتمع والترقية (Community & Account)',
      items: [
        {
          id: 'community' as ActiveTab,
          label: 'غرفة المجتمع (Community Chat)',
          sublabel: 'نقاشات المتداولين وتحليلات VIP',
          icon: MessageSquare,
          badge: 'Live'
        },
        {
          id: 'pricing' as ActiveTab,
          label: 'باقات الاشتراك (MBK Plans)',
          sublabel: 'الترقية إلى Pro و Elite AI',
          icon: CreditCard,
          badge: isVIP ? 'VIP 👑' : 'ترقية'
        },
        {
          id: 'settings' as ActiveTab,
          label: 'إعدادات المنصة (Settings)',
          sublabel: 'ربط الوسطاء ومظهر حماية العين',
          icon: Settings
        }
      ]
    }
  ];

  const handleSelect = (tab: ActiveTab) => {
    soundManager.playClick();
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
        className={`fixed lg:sticky top-0 right-0 h-screen w-72 border-l border-slate-800 flex flex-col z-50 transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Brand Header */}
        <div
          className="p-4 border-b border-slate-800/80 flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-cyan-400 font-mono tracking-wider text-base">MBK</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-slate-100 text-sm tracking-wide font-mono">MBK Trading</h1>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[10px] text-cyan-400 font-semibold">غرفة الأسواق وسجل التداول الذكي</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Ribbon */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>بيانات السوق الحية: متصل</span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">MBK Desk v4.0</span>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 px-3 tracking-wider block uppercase mb-1">
                {sec.group}
              </span>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-right transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600/30 to-sky-600/20 text-white border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal leading-tight">
                          {item.sublabel}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom VIP Ribbon / Status */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs">
          {isVIP ? (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-black text-[11px] block">عضوية VIP مفعلة 👑</span>
                <span className="text-[10px] text-amber-400/80">وصول كامل لجميع أدوات MBK Trading</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleSelect('pricing')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ترقية إلى Pro / Elite AI</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
