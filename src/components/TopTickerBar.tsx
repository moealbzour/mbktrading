import React, { useState } from 'react';
import { MarketTicker } from '../types/trading';
import {
  Bell,
  Search,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  tickers: MarketTicker[];
  onSelectSymbol: (symbol: any) => void;
  onlineUsersCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenBrokerModal: () => void;
}

export const TopTickerBar: React.FC<Props> = ({
  tickers,
  onSelectSymbol,
  onlineUsersCount,
  isMuted,
  onToggleMute,
  onOpenBrokerModal
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, text: 'تحقق الهدف الأول لصفقة الذهب XAUUSD (+100 نقطة)!', time: 'منذ 12 دقيقة', type: 'PROFIT' },
    { id: 2, text: 'البوت الآلي أغلق صفقة ناسداك بربح +$1,250.00', time: 'منذ 34 دقيقة', type: 'BOT' },
    { id: 3, text: 'تحديث تحليل جلسة نيويورك عبر الذكاء الاصطناعي متاح الآن', time: 'منذ ساعة', type: 'AI' }
  ];

  return (
    <div className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Upper Running Ticker Bar */}
      <div className="border-b border-slate-800/60 bg-[#070b12] py-1.5 px-4 overflow-hidden flex items-center justify-between text-xs">
        {/* Ticker items marquee / scroll */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>بث الأسعار الحية:</span>
          </div>

          {tickers.map((ticker) => (
            <button
              key={ticker.symbol}
              onClick={() => onSelectSymbol(ticker.symbol)}
              className="flex items-center gap-2 hover:bg-slate-800/80 px-2 py-0.5 rounded transition-colors shrink-0 group"
            >
              <span className="font-bold text-slate-300 group-hover:text-cyan-300 font-mono">
                {ticker.symbol}
              </span>
              <span className="text-slate-100 font-mono font-medium tabular-nums">
                {ticker.price.toLocaleString(undefined, { minimumFractionDigits: ticker.digits })}
              </span>
              <span
                className={`flex items-center text-[10px] font-mono px-1 rounded ${
                  ticker.isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {ticker.isUp ? '+' : ''}
                {ticker.changePercent}%
              </span>
            </button>
          ))}
        </div>

        {/* Live session & community pulse */}
        <div className="hidden lg:flex items-center gap-4 shrink-0 text-slate-400 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">جلسة نيويورك:</span>
            <span className="text-emerald-400 font-semibold">مفتوحة (أعلى سيولة)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">المتداولون النشطون:</span>
            <span className="font-bold text-emerald-400 font-mono tabular-nums">{onlineUsersCount}</span>
          </div>
        </div>
      </div>

      {/* Main Bar Navigation & Utility Tools */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Right Brand info & Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Search box for symbols and tools */}
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن أصل مالي (US100, XAUUSD...) أو مؤشر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b]/80 border border-slate-700/80 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          {/* Quick Telegram Button */}
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30 transition-all text-xs font-semibold"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>مجتمع تيليجرام (1,000+ عضو)</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Left Utilities & User Profile */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'تفعيل تنبيهات الصوت' : 'كتم الصوت'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs font-bold text-slate-200">
                  <span>التنبيهات الفورية (Live Alerts)</span>
                  <span className="text-cyan-400 text-[10px]">3 جديدة</span>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-medium">
                        <span>{n.text}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Partner Broker Quick CTA */}
          <button
            onClick={onOpenBrokerModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all text-xs font-bold shadow-sm shadow-amber-500/10"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>حساب VIP مجاني (الوسيط المعتمد)</span>
          </button>

          {/* User Profile Tag */}
          <div className="flex items-center gap-2.5 pr-2 border-r border-slate-800">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-cyan-500 p-0.5 flex items-center justify-center">
                <span className="font-bold text-xs text-slate-950 font-mono">MBK</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0f172a] absolute -bottom-0.5 -right-0.5"></span>
            </div>

            <div className="hidden xl:block text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-200">عضوية MBK الخاصة</span>
                <span className="bg-amber-500/20 text-amber-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-500/30">
                  VIP ELITE
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">حساب حقيقي مرتبط</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
