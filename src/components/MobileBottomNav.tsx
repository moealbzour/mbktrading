import React from 'react';
import {
  BarChart2,
  Target,
  Brain,
  MessageSquare,
  User,
  Crown
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type MobileTab = 'chart' | 'signals' | 'ai' | 'chat' | 'profile';

interface Props {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  isVip?: boolean;
  signalsCount?: number;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  isVip = false,
  signalsCount = 3
}) => {
  const tabs: Array<{
    id: MobileTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    defaultColor: string;
  }> = [
    {
      id: 'chart',
      label: 'الرسم البياني',
      icon: <BarChart2 className="w-5 h-5" />,
      defaultColor: '#00E676'
    },
    {
      id: 'signals',
      label: 'التوصيات',
      icon: <Target className="w-5 h-5" />,
      badge: signalsCount,
      defaultColor: '#00E676'
    },
    {
      id: 'ai',
      label: 'الذكاء الاصطناعي',
      icon: <Brain className="w-5 h-5" />,
      defaultColor: '#00E676'
    },
    {
      id: 'chat',
      label: 'غرفة VIP',
      icon: isVip ? <Crown className="w-5 h-5 text-amber-400" /> : <MessageSquare className="w-5 h-5" />,
      badge: isVip ? 'VIP' : undefined,
      defaultColor: '#D4AF37'
    },
    {
      id: 'profile',
      label: 'حسابي',
      icon: <User className="w-5 h-5" />,
      defaultColor: '#D4AF37'
    }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#06080C]/90 backdrop-blur-md border-t border-[#1E2638] pb-safe font-['Cairo',sans-serif] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      <div className="flex items-center justify-around px-1 py-1 relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          // Active Tab Indicator: Highlight active icon with #00E676 (Bullish Green) or Gold #D4AF37
          const activeColor = tab.id === 'chat' || tab.id === 'profile' ? '#D4AF37' : '#00E676';

          return (
            <button
              key={tab.id}
              onClick={() => {
                soundManager.playClick();
                onChangeTab(tab.id);
              }}
              className="flex-1 flex flex-col items-center justify-center py-2 px-1 relative transition-all duration-200 cursor-pointer select-none group"
            >
              {/* Top ambient glow line for active tab */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full"
                  style={{
                    backgroundColor: activeColor,
                    boxShadow: `0 0 14px 2px ${activeColor}`
                  }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative mb-1">
                <div
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-115 transform -translate-y-0.5' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  style={{
                    color: isActive ? activeColor : undefined
                  }}
                >
                  {tab.icon}
                </div>

                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black font-mono shadow-sm ${
                      tab.badge === 'VIP'
                        ? 'bg-amber-500 text-slate-950 border border-amber-400/60'
                        : 'bg-emerald-500 text-slate-950 border border-emerald-400/60'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Label */}
              <span
                className={`text-[10px] font-bold tracking-tight transition-colors ${
                  isActive ? 'text-slate-100 font-extrabold' : 'text-slate-400 group-hover:text-slate-300'
                }`}
                style={{
                  color: isActive ? activeColor : undefined
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
