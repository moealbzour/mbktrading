import React, { useState, useEffect } from 'react';
import {
  Lock,
  Bot,
  Crown,
  Radio,
  Clock,
  Activity,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Zap,
  CheckCircle2,
  XCircle,
  Layers
} from 'lucide-react';
import { DailyTrade } from '../../types/trading';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expanded trade details state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BOT_WEBHOOK' | 'VIP_MANUAL' | 'FREE_PUBLIC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'CLOSED'>('ALL');

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
    const interval = setInterval(fetchDailyTrades, 10000);
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

  // Filter trades stream (supports all signals: running, tp hit, sl hit, bot webhooks, etc.)
  const displayedTrades = trades.filter((t) => {
    if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;
    if (statusFilter === 'RUNNING' && t.status !== 'RUNNING') return false;
    if (statusFilter === 'CLOSED' && t.status === 'RUNNING') return false;
    return true;
  });

  return (
    <div className="space-y-2" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP COMPACT BAR */}
      <div className="flex items-center justify-between pb-1 border-b border-[#2a2e39]/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
          <h3 className="text-xs font-bold text-white">
            {isAr ? 'تغذية الإشارات الفورية' : 'Live Signal Feed'}
          </h3>
          <span className="text-[10px] text-[#787b86] font-mono">({displayedTrades.length})</span>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            fetchDailyTrades();
          }}
          disabled={refreshing}
          className="p-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
          title={isAr ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#089981]' : ''}`} />
        </button>
      </div>

      {/* 2. MINIMAL ICON-ONLY FILTER PILLS */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('ALL');
            }}
            className={`p-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center justify-center ${
              sourceFilter === 'ALL'
                ? 'bg-white text-[#131722]'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]'
            }`}
            title={isAr ? 'جميع الإشارات' : 'All Signals'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('BOT_WEBHOOK');
            }}
            className={`p-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center justify-center ${
              sourceFilter === 'BOT_WEBHOOK'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-[#1e222d] text-purple-400 hover:text-purple-300 border border-[#2a2e39]'
            }`}
            title={isAr ? 'إشارات البوت الآلي' : 'Bot Signals'}
          >
            <Bot className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('VIP_MANUAL');
            }}
            className={`p-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center justify-center ${
              sourceFilter === 'VIP_MANUAL'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-[#1e222d] text-amber-400 hover:text-amber-300 border border-[#2a2e39]'
            }`}
            title={isAr ? 'إشارات VIP' : 'VIP Signals'}
          >
            <Crown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('FREE_PUBLIC');
            }}
            className={`p-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center justify-center ${
              sourceFilter === 'FREE_PUBLIC'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-[#1e222d] text-blue-400 hover:text-blue-300 border border-[#2a2e39]'
            }`}
            title={isAr ? 'إشارات عامة' : 'Free Signals'}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Toggle Icon Symbols */}
        <div className="flex items-center gap-0.5 bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`p-1 rounded cursor-pointer transition-all ${
              statusFilter === 'ALL' ? 'bg-[#2a2e39] text-white' : 'text-[#787b86] hover:text-white'
            }`}
            title={isAr ? 'جميع الحالات' : 'All Statuses'}
          >
            <Activity className="w-3 h-3" />
          </button>
          <button
            onClick={() => setStatusFilter('RUNNING')}
            className={`p-1 rounded cursor-pointer transition-all ${
              statusFilter === 'RUNNING' ? 'bg-amber-500/20 text-amber-400' : 'text-[#787b86] hover:text-amber-400'
            }`}
            title={isAr ? 'الصفقات النشطة فقط' : 'Live Running Only'}
          >
            <Zap className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. COMPACT SIGNALS STREAM LIST */}
      {loading ? (
        <div className="py-8 text-center text-[#787b86] text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#089981]" />
          <span>{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
        </div>
      ) : displayedTrades.length === 0 ? (
        <div className="py-6 text-center text-[#787b86] text-xs bg-[#131722] rounded-lg border border-[#2a2e39] p-3">
          <Activity className="w-5 h-5 mx-auto opacity-30 mb-1" />
          <p>{isAr ? 'لا توجد إشارات مطابقة' : 'No signals found'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayedTrades.map((trade) => {
            const isVIPOrBot = trade.source === 'VIP_MANUAL' || trade.source === 'BOT_WEBHOOK';
            const shouldBlur = !hasFullAccess && isVIPOrBot;
            const isRunning = trade.status === 'RUNNING';
            const isWin = trade.pips > 0;
            const isExpanded = expandedId === trade.id;

            return (
              <div
                key={trade.id}
                className="rounded-lg border bg-[#1e222d] border-[#2a2e39] hover:border-[#363a45] p-2 space-y-1.5 transition-all text-xs"
              >
                {/* Header Row: Action + Symbol + Source Badge + Outcome Pips */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        trade.action === 'BUY'
                          ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                          : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
                      }`}
                    >
                      {trade.action}
                    </span>

                    <span className="font-bold text-white font-mono text-xs">{trade.symbol}</span>

                    <span className="text-[9px] font-semibold text-[#787b86] flex items-center gap-0.5">
                      {trade.source === 'BOT_WEBHOOK' ? (
                        <span className="text-purple-400">🤖 Bot</span>
                      ) : trade.source === 'VIP_MANUAL' ? (
                        <span className="text-amber-400">👑 VIP</span>
                      ) : (
                        <span className="text-blue-400">📡 Free</span>
                      )}
                    </span>
                  </div>

                  {/* Status / Pips */}
                  <div className="flex items-center gap-1 font-mono font-bold text-[11px]">
                    {isRunning ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>{trade.pips >= 0 ? `+${trade.pips}p` : `${trade.pips}p`}</span>
                      </span>
                    ) : isWin ? (
                      <span className="text-[#089981]">🎯 +{trade.pips}p</span>
                    ) : (
                      <span className="text-[#f23645]">🛑 {trade.pips}p</span>
                    )}
                  </div>
                </div>

                {/* Entry, SL, TP Box (With blur for non-VIP on VIP/Bot) */}
                <div className="relative rounded overflow-hidden">
                  {shouldBlur && (
                    <div className="absolute inset-0 z-10 backdrop-blur-md bg-[#131722]/85 flex items-center justify-between px-2.5 py-1">
                      <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? 'مستويات VIP' : 'VIP Signal'}</span>
                      </div>
                      <button
                        onClick={() => (onOpenPromoModal ? onOpenPromoModal() : setShowCodeInputModal(true))}
                        className="px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold cursor-pointer hover:brightness-110"
                      >
                        {isAr ? 'فتح الصفقات' : 'Unlock'}
                      </button>
                    </div>
                  )}

                  <div
                    className={`grid grid-cols-3 gap-1 bg-[#131722] p-1.5 rounded text-center font-mono ${
                      shouldBlur ? 'filter blur-[4px] select-none pointer-events-none' : ''
                    }`}
                  >
                    <div>
                      <span className="text-[8px] text-[#787b86] block font-sans">{isAr ? 'الدخول' : 'ENTRY'}</span>
                      <span className="font-bold text-white text-[11px]">{trade.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#f23645] block font-sans">{isAr ? 'الوقف SL' : 'SL'}</span>
                      <span className="font-bold text-[#f23645] text-[11px]">{trade.sl}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#089981] block font-sans">{isAr ? 'الهدف TP' : 'TP'}</span>
                      <span className="font-bold text-[#089981] text-[11px]">{trade.tp1}</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible details toggle */}
                <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-0.5">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                    className="p-0.5 text-[#787b86] hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'تفاصيل الإشارة' : 'Signal Details'}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {!shouldBlur && (
                    <button
                      onClick={() => handleCopyLevels(trade)}
                      className="hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[9px]"
                      title={isAr ? 'نسخ' : 'Copy'}
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{copiedId === trade.id ? (isAr ? 'تم' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                    </button>
                  )}
                </div>

                {/* Small Box for Extra Signal Details */}
                {isExpanded && (
                  <div className="p-2 rounded bg-[#131722] border border-[#2a2e39] text-[10px] space-y-1 animate-fade-in">
                    <div className="flex justify-between text-[#d1d4dc]">
                      <span className="text-[#787b86]">{isAr ? 'الإستراتيجية:' : 'Strategy:'}</span>
                      <span>{trade.strategy}</span>
                    </div>
                    <div className="flex justify-between text-[#d1d4dc]">
                      <span className="text-[#787b86]">{isAr ? 'التوقيت:' : 'Time:'}</span>
                      <span>{trade.openTime}</span>
                    </div>
                    {trade.duration && (
                      <div className="flex justify-between text-[#d1d4dc]">
                        <span className="text-[#787b86]">{isAr ? 'مدة الصفقة:' : 'Duration:'}</span>
                        <span>{trade.duration}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ACCESS CODE UNLOCK MODAL */}
      {showCodeInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-3"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-white">
              {isAr ? 'إدخال رمز فك الحجب (Access Code)' : 'Enter Access Code'}
            </h3>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'أدخل الرمز الممنوح لك من قبل الإدارة (جرب MBK2026 أو VIP2026) لفتح صفقات البوت والصفقات الجارية.'
                : 'Enter your access code (e.g. MBK2026) to reveal signals.'}
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

              {codeError && <p className="text-xs text-[#f23645] font-semibold">{codeError}</p>}

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
