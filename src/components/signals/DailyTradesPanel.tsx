import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Bot,
  Crown,
  Radio,
  Clock,
  Target,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Filter,
  RefreshCw,
  Copy,
  ChevronRight,
  Flame,
  Award,
  BarChart3,
  KeyRound
} from 'lucide-react';
import { DailyTrade, DailyTradesStats } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface Props {
  isVIP: boolean;
  userRole?: string;
  onOpenPromoModal?: () => void;
  lang?: 'ar' | 'en';
  isCompact?: boolean;
}

export const DailyTradesPanel: React.FC<Props> = ({
  isVIP,
  userRole,
  onOpenPromoModal,
  lang = 'ar',
  isCompact = false
}) => {
  const isAr = lang === 'ar';
  const [trades, setTrades] = useState<DailyTrade[]>([]);
  const [stats, setStats] = useState<DailyTradesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BOT_WEBHOOK' | 'VIP_MANUAL' | 'FREE_PUBLIC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'WIN' | 'LOSS'>('ALL');

  // Code unlock state
  const [unlockedViaCode, setUnlockedViaCode] = useState<boolean>(() => {
    return localStorage.getItem('mbk_bot_unlocked') === 'true';
  });
  const [showCodeInputModal, setShowCodeInputModal] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const hasFullAccess = isVIP || unlockedViaCode || userRole === 'VIP' || userRole === 'ADMIN';

  const fetchDailyTrades = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/trades/daily');
      if (res.ok) {
        const data = await res.json();
        if (data.trades) setTrades(data.trades);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch daily trades:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyTrades();
    const interval = setInterval(fetchDailyTrades, 12000); // 12-second live refresh
    return () => clearInterval(interval);
  }, []);

  const handleCopyLevels = (trade: DailyTrade) => {
    soundManager.playClick();
    const text = `${trade.symbol} ${trade.action}\nEntry: ${trade.entryPrice}\nSL: ${trade.sl}\nTP: ${trade.tp1}`;
    navigator.clipboard.writeText(text);
    setCopiedId(trade.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInputValue.trim().toUpperCase();
    if (['MBK2026', 'VIP2026', 'BOTACCESS', '2026'].includes(clean) || clean.startsWith('MBK') || clean.startsWith('VIP')) {
      soundManager.playProfitChime();
      setUnlockedViaCode(true);
      localStorage.setItem('mbk_bot_unlocked', 'true');
      setShowCodeInputModal(false);
      setCodeError(null);
    } else {
      soundManager.playClick();
      setCodeError(isAr ? 'رمز الدخول غير صحيح' : 'Invalid code');
    }
  };

  // Filtered trades
  const filteredTrades = trades.filter((t) => {
    if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;
    if (statusFilter === 'RUNNING' && t.status !== 'RUNNING') return false;
    if (statusFilter === 'WIN' && (t.status === 'RUNNING' || t.pips <= 0)) return false;
    if (statusFilter === 'LOSS' && (t.status === 'RUNNING' || t.pips >= 0)) return false;
    return true;
  });

  return (
    <div className="space-y-2.5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP HEADER & REFRESH (Only in full mode, or minimal in compact) */}
      {!isCompact ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#089981]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{isAr ? 'سجل صفقات اليوم الإحصائي' : 'Today\'s Trades & Stats'}</span>
                <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
              </h3>
              <p className="text-[10px] text-[#787b86]">
                {isAr ? 'جميع الصفقات: البوت الآلي + صفقات المحللين + العامة' : 'Unified Bot, VIP & Free Signals'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              fetchDailyTrades();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isAr ? 'تحديث فوري' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#089981]' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
            <span>{isAr ? 'إحصائيات صفقات اليوم' : 'Daily Trades'}</span>
          </span>
          <button
            onClick={() => {
              soundManager.playClick();
              fetchDailyTrades();
            }}
            disabled={refreshing}
            className="p-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#089981]' : ''}`} />
          </button>
        </div>
      )}

      {/* 2. STATISTICAL PERFORMANCE HUD */}
      {stats && (
        isCompact ? (
          /* COMPACT HUD (FITS COMPACT SHRINKED SIDEBAR ~230PX) */
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-2.5 shadow-md space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#787b86] font-medium">{isAr ? 'صافي اليوم' : 'Net Pips'}</span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className={`text-base font-black ${stats.netPips >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {stats.netPips >= 0 ? `+${stats.netPips}` : stats.netPips}
                </span>
                <span className="text-[9px] text-[#787b86] font-bold">pips</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#2a2e39]/50 font-mono">
              <span className="text-amber-400 font-bold">{stats.winRate}% {isAr ? 'ربح' : 'Win'}</span>
              <span className="text-[#089981] font-bold">+{stats.grossGainPips}p</span>
              <span className="text-[#f23645] font-bold">-{stats.grossLossPips}p</span>
              <span className="text-white/80 font-bold">({stats.runningTrades}⚡)</span>
            </div>
          </div>
        ) : (
          /* FULL WIDE HUD */
          <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3 shadow-lg space-y-2.5">
            {/* Main Net Pips & Win Rate Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Net Pips */}
              <div className="p-2.5 rounded-lg bg-[#1e222d]/80 border border-[#2a2e39] flex flex-col justify-between">
                <span className="text-[10px] text-[#787b86] font-medium">
                  {isAr ? 'صافي نقاط اليوم' : 'Today\'s Net Pips'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-lg font-black font-mono tracking-tight ${
                      stats.netPips >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}
                  >
                    {stats.netPips >= 0 ? `+${stats.netPips}` : stats.netPips}
                  </span>
                  <span className="text-[10px] text-[#787b86] font-bold">Pips</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                  <span className="text-[#089981] font-bold">+{stats.grossGainPips} ربح</span>
                  <span className="text-[#787b86]">•</span>
                  <span className="text-[#f23645] font-bold">-{stats.grossLossPips} خسارة</span>
                </div>
              </div>

              {/* Win Rate */}
              <div className="p-2.5 rounded-lg bg-[#1e222d]/80 border border-[#2a2e39] flex flex-col justify-between">
                <span className="text-[10px] text-[#787b86] font-medium">
                  {isAr ? 'نسبة الصفقات الرابحة' : 'Win Rate'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black font-mono text-amber-400">
                    {stats.winRate}%
                  </span>
                  <span className="text-[10px] text-amber-400/70 font-bold">
                    ({stats.winTrades}/{stats.closedTrades})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-[#787b86] mt-1">
                  <span className="text-white font-bold">{stats.totalTrades} صفقات</span>
                  <span>({stats.runningTrades} جارية الآن ⚡)</span>
                </div>
              </div>
            </div>

            {/* Source Breakdown (Bot vs VIP vs Free) */}
            <div className="pt-2 border-t border-[#2a2e39]/60 grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 rounded bg-[#1e222d]/50 border border-[#2a2e39]/40">
                <div className="text-[9px] text-[#787b86] flex items-center justify-center gap-1">
                  <Bot className="w-2.5 h-2.5 text-purple-400" />
                  <span>{isAr ? 'البوت' : 'Bot'}</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#089981] mt-0.5">
                  +{stats.botNetPips}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[#1e222d]/50 border border-[#2a2e39]/40">
                <div className="text-[9px] text-[#787b86] flex items-center justify-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>{isAr ? 'يدوي VIP' : 'VIP'}</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#089981] mt-0.5">
                  +{stats.vipNetPips}
                </div>
              </div>

              <div className="p-1.5 rounded bg-[#1e222d]/50 border border-[#2a2e39]/40">
                <div className="text-[9px] text-[#787b86] flex items-center justify-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-blue-400" />
                  <span>{isAr ? 'عامة' : 'Free'}</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#089981] mt-0.5">
                  +{stats.freeNetPips}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* 3. FILTER CONTROLS */}
      <div className="space-y-1.5">
        {/* Source Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('ALL');
            }}
            className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
              sourceFilter === 'ALL'
                ? 'bg-white text-[#131722]'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
            }`}
          >
            {isAr ? `الكل (${trades.length})` : `All (${trades.length})`}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('BOT_WEBHOOK');
            }}
            className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              sourceFilter === 'BOT_WEBHOOK'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-[#1e222d] text-purple-400/80 hover:text-purple-300 border border-[#2a2e39]'
            }`}
          >
            <Bot className="w-2.5 h-2.5" />
            <span>{isAr ? 'بوت Webhook' : 'Bot'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('VIP_MANUAL');
            }}
            className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              sourceFilter === 'VIP_MANUAL'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-[#1e222d] text-amber-400/80 hover:text-amber-300 border border-[#2a2e39]'
            }`}
          >
            <Crown className="w-2.5 h-2.5" />
            <span>{isAr ? 'يدوي VIP' : 'VIP'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('FREE_PUBLIC');
            }}
            className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              sourceFilter === 'FREE_PUBLIC'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-[#1e222d] text-blue-400/80 hover:text-blue-300 border border-[#2a2e39]'
            }`}
          >
            <Radio className="w-2.5 h-2.5" />
            <span>{isAr ? 'عامة' : 'Free'}</span>
          </button>
        </div>

        {/* Status Filter Sub-bar */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'text-white font-bold bg-[#2a2e39]' : 'text-[#787b86] hover:text-white'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setStatusFilter('RUNNING')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
              statusFilter === 'RUNNING' ? 'text-amber-400 font-bold bg-[#2a2e39]' : 'text-[#787b86] hover:text-amber-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{isAr ? 'جارية الآن' : 'Running'}</span>
          </button>
          <button
            onClick={() => setStatusFilter('WIN')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              statusFilter === 'WIN' ? 'text-[#089981] font-bold bg-[#2a2e39]' : 'text-[#787b86] hover:text-[#089981]'
            }`}
          >
            {isAr ? 'أهداف محققة 🎯' : 'Wins'}
          </button>
          <button
            onClick={() => setStatusFilter('LOSS')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              statusFilter === 'LOSS' ? 'text-[#f23645] font-bold bg-[#2a2e39]' : 'text-[#787b86] hover:text-[#f23645]'
            }`}
          >
            {isAr ? 'وقف خسارة 🛑' : 'Losses'}
          </button>
        </div>
      </div>

      {/* 4. TRADES LIST */}
      {loading ? (
        <div className="py-12 text-center text-[#787b86] text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#089981]" />
          <span>{isAr ? 'جاري مزامنة صفقات اليوم...' : 'Loading today\'s trades...'}</span>
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="py-10 text-center text-[#787b86] text-xs bg-[#131722] rounded-xl border border-[#2a2e39] p-4">
          <Activity className="w-6 h-6 mx-auto mb-2 opacity-40 text-[#787b86]" />
          <p>{isAr ? 'لا توجد صفقات تطابق هذا التصنيف اليوم' : 'No trades found matching this filter.'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTrades.map((trade) => {
            const isRunning = trade.status === 'RUNNING';
            const isWin = trade.pips > 0;
            const isLoss = trade.pips < 0;

            // Running trades blurred condition for free users
            const shouldBlurEntireRunningCard = isRunning && !hasFullAccess;

            if (isCompact) {
              return (
                <div
                  key={trade.id}
                  className={`relative rounded-xl border p-2.5 transition-all overflow-hidden ${
                    isRunning
                      ? 'bg-[#1e222d] border-amber-500/40 shadow-sm'
                      : isWin
                      ? 'bg-[#1e222d] border-[#2a2e39]'
                      : 'bg-[#1e222d] border-[#2a2e39]'
                  }`}
                >
                  {/* Blur overlay for free users on running trade */}
                  {shouldBlurEntireRunningCard && (
                    <div className="absolute inset-0 z-20 backdrop-blur-md bg-[#131722]/90 flex flex-col items-center justify-center p-2 text-center border border-amber-500/30">
                      <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold mb-1">
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? 'صفقة جارية (VIP)' : 'Live Running'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      </div>
                      <div className="text-[9px] text-[#787b86] mb-1.5">{trade.symbol} • {trade.action}</div>
                      <button
                        onClick={() => onOpenPromoModal ? onOpenPromoModal() : setShowCodeInputModal(true)}
                        className="px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold cursor-pointer hover:brightness-110"
                      >
                        {isAr ? 'فتح الصفقات VIP' : 'Unlock VIP'}
                      </button>
                    </div>
                  )}

                  <div className={`space-y-1.5 ${shouldBlurEntireRunningCard ? 'filter blur-[4px] select-none pointer-events-none' : ''}`}>
                    {/* Row 1: Symbol + Action + Pips */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          trade.action === 'BUY' ? 'bg-[#089981]/20 text-[#089981]' : 'bg-[#f23645]/20 text-[#f23645]'
                        }`}>
                          {trade.action}
                        </span>
                        <span className="font-bold text-white font-mono text-xs">{trade.symbol}</span>
                      </div>
                      <span className={`font-mono font-bold text-xs ${
                        isRunning ? 'text-amber-400' : isWin ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}>
                        {isRunning ? `+${trade.pips}p ⚡` : isWin ? `+${trade.pips}p` : `${trade.pips}p`}
                      </span>
                    </div>

                    {/* Row 2: Source badge + Status / Levels */}
                    <div className="flex items-center justify-between text-[9px] text-[#787b86] pt-1 border-t border-[#2a2e39]/50">
                      <span className="flex items-center gap-1 font-medium">
                        {trade.source === 'BOT_WEBHOOK' ? (
                          <span className="text-purple-400">🤖 بوت</span>
                        ) : trade.source === 'VIP_MANUAL' ? (
                          <span className="text-amber-400">👑 VIP</span>
                        ) : (
                          <span className="text-blue-400">📡 عامة</span>
                        )}
                      </span>
                      <span className="font-mono text-white/90">
                        {isRunning ? (
                          hasFullAccess ? `دخول: ${trade.entryPrice}` : '•••• [مخفي]'
                        ) : trade.status === 'TP_HIT' ? (
                          <span className="text-[#089981] font-semibold">🎯 هدف محقق</span>
                        ) : trade.status === 'SL_HIT' ? (
                          <span className="text-[#f23645] font-semibold">🛑 وقف خسارة</span>
                        ) : (
                          'تعادل'
                        )}
                      </span>
                      <span>{trade.openTime}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={trade.id}
                className={`relative rounded-xl border transition-all overflow-hidden ${
                  isRunning
                    ? 'bg-gradient-to-b from-[#1e222d] to-[#161a25] border-amber-500/40 shadow-md'
                    : isWin
                    ? 'bg-[#1e222d] border-[#2a2e39] hover:border-[#089981]/40'
                    : 'bg-[#1e222d] border-[#2a2e39] hover:border-[#f23645]/40'
                }`}
              >
                {/* BLUR & LOCK OVERLAY FOR RUNNING TRADES (FREE USERS) */}
                {shouldBlurEntireRunningCard && (
                  <div className="absolute inset-0 z-20 backdrop-blur-md bg-[#131722]/85 flex flex-col items-center justify-center p-3 text-center border border-amber-500/30">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-1.5 text-amber-400">
                      <Lock className="w-4 h-4" />
                    </div>

                    <h4 className="text-xs font-bold text-white mb-0.5 flex items-center gap-1">
                      <span>{isAr ? 'صفقة جارية ومباشرة الآن ⚡' : 'Live Running Trade'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    </h4>

                    <p className="text-[10px] text-[#787b86] line-clamp-2 max-w-[260px] mb-2 leading-relaxed">
                      {isAr
                        ? `صفقة ${trade.nameAr} (${trade.symbol}) نشطة الآن (${trade.sourceLabelAr}). نقاط الدخول والوقف محجوبة ومحمية لحين الإغلاق.`
                        : `Active ${trade.symbol} trade running now. Entry & SL levels locked for VIP.`}
                    </p>

                    <div className="flex items-center gap-1.5">
                      {onOpenPromoModal && (
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onOpenPromoModal();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] font-bold shadow-sm hover:brightness-110 cursor-pointer flex items-center gap-1"
                        >
                          <Crown className="w-3 h-3" />
                          <span>{isAr ? 'ترقية VIP لفتح الصفقات' : 'Upgrade VIP'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setShowCodeInputModal(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3 text-amber-400" />
                        <span>{isAr ? 'رمز الدخول' : 'Access Code'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TRADE CARD BODY (Content behind blur for running free, or visible) */}
                <div className={`p-3 space-y-2 ${shouldBlurEntireRunningCard ? 'filter blur-[5px] select-none pointer-events-none' : ''}`}>
                  {/* Top Bar: Symbol, Action, Source, Status Badge */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          trade.action === 'BUY'
                            ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                            : 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                        }`}
                      >
                        {trade.action === 'BUY' ? 'BUY' : 'SELL'}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs font-mono">{trade.symbol}</span>
                          <span className="text-[10px] text-[#787b86]">({trade.nameAr})</span>
                        </div>
                        <div className="text-[9px] text-[#787b86] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{trade.openTime}</span>
                          {trade.duration && (
                            <>
                              <span>•</span>
                              <span>{trade.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Source Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 ${
                          trade.source === 'BOT_WEBHOOK'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            : trade.source === 'VIP_MANUAL'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {trade.source === 'BOT_WEBHOOK' ? (
                          <Bot className="w-2.5 h-2.5 text-purple-400" />
                        ) : trade.source === 'VIP_MANUAL' ? (
                          <Crown className="w-2.5 h-2.5 text-amber-400" />
                        ) : (
                          <Radio className="w-2.5 h-2.5 text-blue-400" />
                        )}
                        <span>{isAr ? trade.sourceLabelAr : trade.sourceLabelEn}</span>
                      </span>

                      {/* Status / Outcome Badge */}
                      {isRunning ? (
                        <span className="text-[9px] font-bold text-amber-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          <span>{isAr ? 'قيد التداول ⚡' : 'RUNNING'}</span>
                        </span>
                      ) : isWin ? (
                        <span className="text-[9px] font-bold text-[#089981] font-mono flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isAr ? 'هدف محقق 🎯' : 'PROFIT'}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-[#f23645] font-mono flex items-center gap-0.5">
                          <XCircle className="w-3 h-3" />
                          <span>{isAr ? 'وقف خسارة 🛑' : 'STOP LOSS'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PIPS RESULT & GAIN/LOSS (ALWAYS VISIBLE TO FREE USERS AS REQUESTED) */}
                  <div className="p-2 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#787b86]">
                        {isRunning
                          ? isAr
                            ? 'النقاط العائمة الحالية'
                            : 'Floating Pips'
                          : isAr
                          ? 'نتيجة الصفقة بالنقاط'
                          : 'Pips Result'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className={`text-base font-black font-mono tracking-tight ${
                            trade.pips >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                          }`}
                        >
                          {trade.pips >= 0 ? `+${trade.pips}` : trade.pips}
                        </span>
                        <span className="text-[10px] text-[#787b86] font-bold">Pips</span>
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="text-[10px] text-[#787b86]">
                        {isAr ? 'العائد للمخاطرة' : 'Risk : Reward'}
                      </div>
                      <div className="text-xs font-mono font-bold text-white mt-0.5">
                        {trade.riskReward}
                      </div>
                    </div>
                  </div>

                  {/* TRADE LEVELS: ENTRY & SL (HIDDEN FOR FREE USERS, VISIBLE FOR VIP) */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                    {/* Entry Price */}
                    <div className="p-1.5 rounded bg-[#131722]/60 border border-[#2a2e39]/50 text-center">
                      <div className="text-[9px] text-[#787b86]">
                        {isAr ? 'سعر الدخول' : 'Entry'}
                      </div>
                      {hasFullAccess ? (
                        <div className="font-bold text-white mt-0.5 truncate">
                          {trade.entryPrice}
                        </div>
                      ) : (
                        <div
                          className="font-bold text-amber-400/90 mt-0.5 flex items-center justify-center gap-0.5"
                          title={isAr ? 'مخفي للأعضاء المجانيين - يتطلب VIP' : 'VIP Only'}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span className="text-[9px] tracking-wider">•••••</span>
                        </div>
                      )}
                    </div>

                    {/* Stop Loss (SL) */}
                    <div className="p-1.5 rounded bg-[#131722]/60 border border-[#2a2e39]/50 text-center">
                      <div className="text-[9px] text-[#f23645]">
                        {isAr ? 'وقف الخسارة' : 'SL'}
                      </div>
                      {hasFullAccess ? (
                        <div className="font-bold text-[#f23645] mt-0.5 truncate">
                          {trade.sl}
                        </div>
                      ) : (
                        <div
                          className="font-bold text-amber-400/90 mt-0.5 flex items-center justify-center gap-0.5"
                          title={isAr ? 'مخفي للأعضاء المجانيين - يتطلب VIP' : 'VIP Only'}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span className="text-[9px] tracking-wider">•••••</span>
                        </div>
                      )}
                    </div>

                    {/* Target (TP) */}
                    <div className="p-1.5 rounded bg-[#131722]/60 border border-[#2a2e39]/50 text-center">
                      <div className="text-[9px] text-[#089981]">
                        {isAr ? 'الهدف TP1' : 'Target'}
                      </div>
                      {hasFullAccess ? (
                        <div className="font-bold text-[#089981] mt-0.5 truncate">
                          {trade.tp1}
                        </div>
                      ) : (
                        <div
                          className="font-bold text-amber-400/90 mt-0.5 flex items-center justify-center gap-0.5"
                          title={isAr ? 'مخفي للأعضاء المجانيين - يتطلب VIP' : 'VIP Only'}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span className="text-[9px] tracking-wider">•••••</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategy & Notes */}
                  <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-1 border-t border-[#2a2e39]/40">
                    <span className="truncate max-w-[210px]">{trade.strategy}</span>

                    {hasFullAccess && (
                      <button
                        onClick={() => handleCopyLevels(trade)}
                        className="text-[#787b86] hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[9px]"
                        title={isAr ? 'نسخ مستويات الصفقة' : 'Copy levels'}
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>{copiedId === trade.id ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. ACCESS CODE UNLOCK MODAL */}
      {showCodeInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-white">
              {isAr ? 'إدخال رمز فك الحجب (Access Code)' : 'Enter Access Code'}
            </h3>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'أدخل الرمز الممنوح لك من قبل الإدارة (جرب MBK2026 أو VIP2026) لفتح صفقات البوت والصفقات الجارية.'
                : 'Enter your admin generated access code (e.g. MBK2026) to reveal running trades.'}
            </p>

            <form onSubmit={handleVerifyCode} className="space-y-3 pt-2">
              <input
                type="text"
                value={codeInputValue}
                onChange={(e) => setCodeInputValue(e.target.value)}
                placeholder="MBK2026"
                className="w-full px-3 py-2 rounded-xl bg-[#131722] border border-[#2a2e39] text-center font-mono text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-amber-400"
                autoFocus
              />

              {codeError && (
                <p className="text-xs text-[#f23645] font-semibold">{codeError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCodeInputModal(false)}
                  className="flex-1 py-2 rounded-xl bg-[#2a2e39] text-white text-xs font-bold hover:bg-[#363a45] cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  {isAr ? 'تأكيد الرمز' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
