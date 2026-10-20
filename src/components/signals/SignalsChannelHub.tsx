import React, { useState, useEffect } from 'react';
import {
  Radio,
  Lock,
  Unlock,
  Copy,
  CheckCircle2,
  Share2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Bot,
  Crown,
  KeyRound,
  Send,
  AlertTriangle,
  PlusCircle,
  ExternalLink,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { MarketTicker, MarketSymbol } from '../../types/trading';

export interface ChannelSignalItem {
  id: string;
  channel: 'free' | 'vip' | 'bot';
  symbol: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  pips: number;
  strategy: string;
  timeframe: string;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED';
  instructionsAr: string;
  instructionsEn: string;
  timeAgo: string;
  confidence: number;
  isBlurredForFree: boolean;
}

interface Props {
  isVIP: boolean;
  userRole?: string;
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onOpenPromoModal?: () => void;
  onOpenBrokerModal?: () => void;
  lang?: 'ar' | 'en';
}

export const SignalsChannelHub: React.FC<Props> = ({
  isVIP,
  userRole,
  tickers,
  selectedSymbol,
  onSelectSymbol,
  onOpenPromoModal,
  onOpenBrokerModal,
  lang = 'ar'
}) => {
  const [activeChannel, setActiveChannel] = useState<'free' | 'vip' | 'bot'>('free');
  const [signals, setSignals] = useState<ChannelSignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Unlocking Webhook Bot Signals for Free Users
  const [unlockedViaCode, setUnlockedViaCode] = useState<boolean>(() => {
    return localStorage.getItem('mbk_bot_unlocked') === 'true';
  });
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  // Admin Publishing Modal State
  const [adminPublishOpen, setAdminPublishOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [newSigChannel, setNewSigChannel] = useState<'free' | 'vip'>('free');
  const [newSigSymbol, setNewSigSymbol] = useState<string>('US100');
  const [newSigAction, setNewSigAction] = useState<'BUY' | 'SELL'>('BUY');
  const [newSigEntry, setNewSigEntry] = useState('');
  const [newSigTp1, setNewSigTp1] = useState('');
  const [newSigTp2, setNewSigTp2] = useState('');
  const [newSigSl, setNewSigSl] = useState('');
  const [newSigStrategy, setNewSigStrategy] = useState('MBK Scalp Breakout & FVG');
  const [newSigNotes, setNewSigNotes] = useState('');

  const isAr = lang === 'ar';
  const hasFullAccess = isVIP || unlockedViaCode || userRole === 'VIP' || userRole === 'ADMIN';

  // Fetch Signals from backend
  const fetchSignals = async () => {
    try {
      const res = await fetch('/api/signals/channels');
      if (res.ok) {
        const data = await res.json();
        if (data.signals && Array.isArray(data.signals)) {
          setSignals(data.signals);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch channel signals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleCopyLevels = (text: string, id: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleVerifyUnlockCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    try {
      const res = await fetch('/api/signals/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: unlockCodeInput })
      });
      const data = await res.json();
      if (data.success && data.unlocked) {
        soundManager.playProfitChime();
        confetti({ particleCount: 70, spread: 60 });
        setUnlockedViaCode(true);
        localStorage.setItem('mbk_bot_unlocked', 'true');
        setUnlockSuccess(true);
        setTimeout(() => {
          setUnlockModalOpen(false);
          setUnlockSuccess(false);
        }, 1800);
      } else {
        soundManager.playClick();
        setUnlockError(data.message || (isAr ? 'رمز غير صحيح' : 'Invalid code'));
      }
    } catch {
      setUnlockError(isAr ? 'فشل التحقق من الرمز' : 'Verification failed');
    }
  };

  const handlePublishSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSigEntry || !newSigTp1 || !newSigSl) return;
    try {
      const res = await fetch('/api/signals/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: newSigChannel,
          symbol: newSigSymbol,
          action: newSigAction,
          entryPrice: newSigEntry,
          tp1: newSigTp1,
          tp2: newSigTp2,
          sl: newSigSl,
          strategy: newSigStrategy,
          instructionsAr: newSigNotes,
          instructionsEn: newSigNotes
        })
      });
      if (res.ok) {
        soundManager.playProfitChime();
        confetti({ particleCount: 80, spread: 70 });
        setAdminPublishOpen(false);
        fetchSignals();
        // Reset form
        setNewSigEntry('');
        setNewSigTp1('');
        setNewSigTp2('');
        setNewSigSl('');
        setNewSigNotes('');
      }
    } catch (err) {
      console.warn('Publish signal error:', err);
    }
  };

  // Filter signals by current channel tab
  const channelSignals = signals.filter((s) => s.channel === activeChannel);

  return (
    <div className="space-y-4">
      {/* 1. CHANNEL SELECTION BAR (ZERO DUPLICATE PILLS - CLEAN TRADINGVIEW SEGMENTED HEADER) */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        {/* Channel Segmented Tabs */}
        <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39] overflow-x-auto smooth-scroll-x">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('free');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'free'
                ? 'bg-white text-[#131722] font-bold shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#089981]" />
            <span>{isAr ? 'القناة المجانية العامة' : 'Free Public Channel'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('vip');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'vip'
                ? 'bg-white text-[#131722] font-bold shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'قناة النخبة VIP (المحللين)' : 'VIP Analyst Channel'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('bot');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'bot'
                ? 'bg-white text-[#131722] font-bold shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[#089981]" />
            <span>{isAr ? 'إشارات روبوت TradingView' : 'TradingView Webhook Bot'}</span>
            {!hasFullAccess && (
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        </div>

        {/* Channel Status & Admin Post Quick Trigger */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#787b86] font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
            <span>{channelSignals.length} {isAr ? 'صفقات نشطة' : 'Active setups'}</span>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              setAdminPublishOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-[#d1d4dc] hover:text-white border border-[#363a45] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            title={isAr ? 'نشر توصية جديدة للمشرف' : 'Admin publish signal'}
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#089981]" />
            <span>{isAr ? 'نشر توصية' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* 2. CHANNEL DESCRIPTION BANNER */}
      <div className="p-3 rounded-lg bg-[#1e222d]/70 border border-[#2a2e39] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          {activeChannel === 'free' ? (
            <p className="text-[#d1d4dc]">
              📢 <strong className="text-white">{isAr ? 'القناة المجانية المفتوحة:' : 'Public Free Channel:'}</strong>{' '}
              {isAr
                ? 'توصيات يومية مدروسة مع تعليمات واضحة لإدارة رأس المال، متاحة لكافة المتداولين دون أي قيود.'
                : 'Curated daily trade setups with risk parameters, open for all traders.'}
            </p>
          ) : activeChannel === 'vip' ? (
            <p className="text-[#d1d4dc]">
              👑 <strong className="text-amber-400">{isAr ? 'قناة كبار المتداولين VIP:' : 'VIP Institutional Channel:'}</strong>{' '}
              {isAr
                ? 'صفقات لحظية مباشرة من فريق أبحاث MBK مع أهداف متتالية وتنبيهات صوتية فورية وإرشادات تفصيلية.'
                : 'Direct institutional setups from MBK research team with tiered profit targets and instant audio notifications.'}
            </p>
          ) : (
            <p className="text-[#d1d4dc]">
              ⚡ <strong className="text-[#089981]">{isAr ? 'إشارات TradingView Webhook الآلية:' : 'Automated TradingView Webhook Feed:'}</strong>{' '}
              {isAr
                ? 'ربط مباشر مع مؤشرات Pine Script (Alligator & FVG) لإرسال الصفقات لحظة ظهور الشمعة فوراً.'
                : 'Direct algorithmic webhook stream from TradingView Pine Script indicators.'}
            </p>
          )}
        </div>

        {/* Free users prompt for locked bot signals */}
        {activeChannel === 'bot' && !hasFullAccess && (
          <button
            onClick={() => {
              soundManager.playClick();
              setUnlockModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isAr ? 'إلغاء حجب الإشارات برمز' : 'Unlock Bot Signals with Code'}</span>
          </button>
        )}
      </div>

      {/* 3. SIGNALS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channelSignals.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-[#1e222d] border border-[#2a2e39] rounded-xl text-[#787b86]">
            <Radio className="w-8 h-8 mx-auto mb-2 text-[#787b86] opacity-60" />
            <p className="text-sm font-semibold">{isAr ? 'لا توجد صفقات معلقة في هذه القناة حالياً' : 'No active trades in this channel right now'}</p>
            <p className="text-xs text-[#787b86] mt-1">{isAr ? 'سيتم بث الإشارات لحظة استيفاء شروط السيولة' : 'New setups will broadcast upon liquidity confirmation'}</p>
          </div>
        ) : (
          channelSignals.map((signal) => {
            const isBotLocked = signal.channel === 'bot' && !hasFullAccess;
            const isVipLocked = signal.channel === 'vip' && !hasFullAccess;
            const isLocked = isBotLocked || isVipLocked;

            return (
              <div
                key={signal.id}
                className="bg-[#1e222d] border border-[#2a2e39] hover:border-[#363a45] rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all group"
              >
                <div>
                  {/* Card Header: Symbol, Side, Badge, Timestamp */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                          signal.action === 'BUY'
                            ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                            : 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                        }`}
                      >
                        {signal.action}
                      </span>
                      <span className="text-base font-mono font-bold text-white tracking-wide">
                        {signal.symbol}
                      </span>
                      <span className="text-[11px] text-[#787b86] font-mono">{signal.timeframe}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {signal.status === 'TP2_HIT' ? (
                        <span className="px-2 py-0.5 rounded bg-[#089981]/15 text-[#089981] font-bold border border-[#089981]/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>TP2 HIT (+{signal.pips} Pips)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#131722] text-[#089981] font-bold border border-[#2a2e39] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-ping" />
                          <span>LIVE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Strategy and Channel badge */}
                  <div className="flex items-center justify-between text-xs text-[#787b86] pb-2 mb-3 border-b border-[#2a2e39]">
                    <span className="truncate">{signal.strategy}</span>
                    <span className="font-mono text-[11px] shrink-0 text-[#089981]">
                      {signal.timeAgo}
                    </span>
                  </div>

                  {/* NUMERICAL MATRIX (BLURRED TEASER IF LOCKED, CRYSTAL CLEAR IF UNLOCKED) */}
                  <div className="relative mb-3">
                    <div
                      className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-center transition-all ${
                        isLocked ? 'filter blur-[5px] select-none opacity-60' : ''
                      }`}
                    >
                      <div className="bg-[#131722] p-2 rounded-lg border border-[#2a2e39]">
                        <div className="text-[10px] text-[#787b86]">ENTRY</div>
                        <div className="text-xs font-bold text-white" dir="ltr">
                          {signal.entryPrice.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#131722] p-2 rounded-lg border border-[#2a2e39]">
                        <div className="text-[10px] text-[#f23645]">SL</div>
                        <div className="text-xs font-bold text-[#f23645]" dir="ltr">
                          {signal.sl.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#131722] p-2 rounded-lg border border-[#2a2e39]">
                        <div className="text-[10px] text-[#089981]">TP1</div>
                        <div className="text-xs font-bold text-[#089981]" dir="ltr">
                          {signal.tp1.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#131722] p-2 rounded-lg border border-[#2a2e39]">
                        <div className="text-[10px] text-[#089981]">TP2</div>
                        <div className="text-xs font-bold text-[#089981]" dir="ltr">
                          {signal.tp2.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* FROSTED GLASS LOCK OVERLAY FOR BLURRED BOT / VIP SIGNALS */}
                    {isLocked && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-lg p-2 text-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {signal.channel === 'bot'
                              ? isAr ? 'إشارة روبوت آلية حصرية' : 'Exclusive Bot Signal'
                              : isAr ? 'توصية خاصة بـ VIP' : 'VIP Setup'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#d1d4dc] max-w-[240px] mb-2 leading-tight">
                          {isAr
                            ? 'أدخل رمز تفعيل أو اشترك في VIP لإظهار أسعار الدخول والأهداف'
                            : 'Enter unlock code or upgrade to reveal numerical levels'}
                        </p>
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            if (signal.channel === 'bot') {
                              setUnlockModalOpen(true);
                            } else if (onOpenPromoModal) {
                              onOpenPromoModal();
                            }
                          }}
                          className="px-3 py-1 rounded bg-white text-[#131722] text-[11px] font-bold hover:bg-[#d1d4dc] transition-all cursor-pointer shadow-sm"
                        >
                          {isAr ? 'إلغاء الحجب الآن 🔓' : 'Unlock Levels 🔓'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Trade Instructions / Notes */}
                  <p className="text-xs text-[#787b86] leading-relaxed mb-3">
                    {isLocked
                      ? isAr
                        ? 'إشارة خوارزمية مؤكدة بنسبة ثقة 94%. المستويات الدقيقة مشفرة لحسابات VIP والمصرح لهم.'
                        : 'Algorithmic confirmation active (94% confidence). Exact levels encrypted for VIP access.'
                      : isAr
                      ? signal.instructionsAr
                      : signal.instructionsEn}
                  </p>
                </div>

                {/* Card Actions: Copy Levels / View Chart */}
                <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectSymbol(signal.symbol as MarketSymbol)}
                    className="py-1.5 px-3 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{isAr ? 'عرض الشارت' : 'Chart'}</span>
                  </button>

                  {!isLocked ? (
                    <button
                      onClick={() =>
                        handleCopyLevels(
                          `${signal.symbol} ${signal.action} @ ${signal.entryPrice} | TP1: ${signal.tp1} | TP2: ${signal.tp2} | SL: ${signal.sl}`,
                          signal.id
                        )
                      }
                      className={`py-1.5 px-3 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        copiedId === signal.id
                          ? 'bg-[#089981] text-[#131722]'
                          : 'bg-white text-[#131722] hover:bg-[#d1d4dc]'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === signal.id ? (isAr ? '✓ تم النسخ' : 'Copied!') : (isAr ? 'نسخ المستويات' : 'Copy')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setUnlockModalOpen(true);
                      }}
                      className="py-1.5 px-3 rounded bg-[#2a2e39] hover:bg-[#363a45] text-amber-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isAr ? 'فك التشفير' : 'Unlock'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. UNLOCK BOT SIGNALS MODAL FOR FREE USERS */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-[#1e222d] border border-[#363a45] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#d1d4dc]">
            <button
              onClick={() => setUnlockModalOpen(false)}
              className="absolute top-4 end-4 p-1.5 rounded-lg bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'إلغاء حجب إشارات روبوت TradingView' : 'Unlock TradingView Bot Signals'}
              </h3>
              <p className="text-xs text-[#787b86] mt-1">
                {isAr
                  ? 'أدخل رمز دعوة الإدارة أو رمز المشترك لفتح أسعار الدخول والأهداف اللحظية لجميع إشارات الروبوت:'
                  : 'Enter generated access code or VIP pass to reveal real-time bot entry and targets:'}
              </p>
            </div>

            {unlockSuccess ? (
              <div className="p-4 bg-[#089981]/15 border border-[#089981]/30 rounded-xl text-center text-xs text-[#089981] font-bold space-y-1 mb-4">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-[#089981]" />
                <div>{isAr ? 'تهانينا! تم إلغاء حجب جميع إشارات الروبوت بنجاح' : 'Success! All bot signals are now unlocked'}</div>
              </div>
            ) : (
              <form onSubmit={handleVerifyUnlockCode} className="space-y-3 mb-4">
                <div>
                  <input
                    type="text"
                    value={unlockCodeInput}
                    onChange={(e) => setUnlockCodeInput(e.target.value)}
                    placeholder={isAr ? 'أدخل الرمز (مثال: MBK2026 أو VIP2026)' : 'Enter Code (e.g. MBK2026 or VIP2026)'}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-4 py-2.5 text-center text-sm font-mono text-white placeholder-[#787b86] uppercase tracking-wider focus:outline-none focus:border-[#089981]"
                  />
                  {unlockError && (
                    <p className="text-xs text-[#f23645] mt-1 text-center font-medium">{unlockError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-white text-[#131722] hover:bg-[#d1d4dc] font-bold text-xs transition-all shadow-sm cursor-pointer"
                >
                  {isAr ? 'تأكيد الرمز وفتح الإشارات' : 'Verify Code & Unlock'}
                </button>
              </form>
            )}

            {/* Alternative: Lifetime Free VIP via Partner Broker */}
            <div className="pt-3 border-t border-[#2a2e39] text-center space-y-2">
              <span className="text-[11px] text-[#787b86] block">
                {isAr ? 'أو احصل على اشتراك VIP مجاني مدى الحياة عبر الوسيط الشريك:' : 'Or get lifetime free VIP via partner broker:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setUnlockModalOpen(false);
                  if (onOpenBrokerModal) onOpenBrokerModal();
                }}
                className="w-full py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-[#089981]" />
                <span>{isAr ? 'فتح حساب شريك والحصول على VIP مجاناً' : 'Get Free Lifetime VIP via Broker'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADMIN PUBLISHING MODAL (Replacing Telegram completely) */}
      {adminPublishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-[#1e222d] border border-[#363a45] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-[#d1d4dc] max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setAdminPublishOpen(false)}
              className="absolute top-4 end-4 p-1.5 rounded-lg bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
            >
              ✕
            </button>

            {!adminUnlocked ? (
              /* PIN Verification Step */
              <div className="space-y-4 text-center my-4">
                <div className="w-12 h-12 rounded-xl bg-[#131722] border border-[#2a2e39] flex items-center justify-center mx-auto text-[#089981]">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {isAr ? 'لوحة المشرف: نشر التوصيات والتعليمات' : 'Admin Signal Publishing Desk'}
                  </h3>
                  <p className="text-xs text-[#787b86]">
                    {isAr ? 'أدخل رمز أمان المشرف (PIN 2026) لنشر صفقة جديدة للمتداولين فوراً:' : 'Enter admin PIN (2026) to broadcast new trade setup:'}
                  </p>
                </div>

                <div className="max-w-xs mx-auto space-y-3">
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="PIN: 2026"
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-4 py-2 text-center text-sm font-mono text-white tracking-widest focus:outline-none focus:border-[#089981]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (adminPinInput === '2026') {
                        soundManager.playProfitChime();
                        setAdminUnlocked(true);
                      } else {
                        soundManager.playClick();
                        alert(isAr ? 'رمز غير صحيح! الرمز الافتراضي هو 2026' : 'Invalid PIN! Use 2026');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-white text-[#131722] font-bold text-xs hover:bg-[#d1d4dc] transition-all cursor-pointer"
                  >
                    {isAr ? 'تأكيد الرمز ودخول اللوحة' : 'Unlock Publishing Desk'}
                  </button>
                </div>
              </div>
            ) : (
              /* Signal Creation Form */
              <form onSubmit={handlePublishSignal} className="space-y-3.5">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#2a2e39]">
                  <Send className="w-4 h-4 text-[#089981]" />
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'بث توصية تداول جديدة (بديل تيليجرام المباشر)' : 'Broadcast Live Trade Setup (Telegram Alternative)'}
                  </h3>
                </div>

                {/* Target Channel */}
                <div>
                  <label className="text-xs text-[#787b86] block mb-1">{isAr ? 'القناة المستهدفة:' : 'Target Channel:'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSigChannel('free')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        newSigChannel === 'free'
                          ? 'bg-white text-[#131722] border-white shadow-sm'
                          : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
                      }`}
                    >
                      {isAr ? '📢 القناة العامة المجانية' : '📢 Public Free'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSigChannel('vip')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        newSigChannel === 'vip'
                          ? 'bg-amber-400 text-[#131722] border-amber-400 shadow-sm'
                          : 'bg-[#131722] border-[#2a2e39] text-[#787b86]'
                      }`}
                    >
                      {isAr ? '👑 قناة النخبة VIP' : '👑 VIP Only'}
                    </button>
                  </div>
                </div>

                {/* Symbol & Direction */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#787b86] block mb-1">{isAr ? 'الأصل:' : 'Asset:'}</label>
                    <select
                      value={newSigSymbol}
                      onChange={(e) => setNewSigSymbol(e.target.value)}
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#089981]"
                    >
                      <option value="US100">ناسداك (US100)</option>
                      <option value="XAUUSD">الذهب (XAUUSD)</option>
                      <option value="EURUSD">EUR/USD</option>
                      <option value="BTCUSD">البيتكوين (BTCUSD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#787b86] block mb-1">{isAr ? 'نوع الصفقة:' : 'Side:'}</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewSigAction('BUY')}
                        className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          newSigAction === 'BUY'
                            ? 'bg-[#089981] text-white shadow-sm'
                            : 'bg-[#131722] text-[#787b86] border border-[#2a2e39]'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSigAction('SELL')}
                        className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          newSigAction === 'SELL'
                            ? 'bg-[#f23645] text-white shadow-sm'
                            : 'bg-[#131722] text-[#787b86] border border-[#2a2e39]'
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Numerical Levels (Entry, SL, TP1, TP2) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div>
                    <label className="text-[10px] text-[#787b86] block mb-1">ENTRY</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newSigEntry}
                      onChange={(e) => setNewSigEntry(e.target.value)}
                      placeholder="20840"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#f23645] block mb-1">SL</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newSigSl}
                      onChange={(e) => setNewSigSl(e.target.value)}
                      placeholder="20790"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-[#f23645] focus:outline-none focus:border-[#f23645]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#089981] block mb-1">TP1</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newSigTp1}
                      onChange={(e) => setNewSigTp1(e.target.value)}
                      placeholder="20920"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-[#089981] focus:outline-none focus:border-[#089981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#089981] block mb-1">TP2</label>
                    <input
                      type="number"
                      step="any"
                      value={newSigTp2}
                      onChange={(e) => setNewSigTp2(e.target.value)}
                      placeholder="21000"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-[#089981] focus:outline-none focus:border-[#089981]"
                    />
                  </div>
                </div>

                {/* Instructions / Notes */}
                <div>
                  <label className="text-xs text-[#787b86] block mb-1">{isAr ? 'تعليمات الصفقة والشرح:' : 'Trade Notes & Instructions:'}</label>
                  <textarea
                    rows={3}
                    value={newSigNotes}
                    onChange={(e) => setNewSigNotes(e.target.value)}
                    placeholder={isAr ? 'سحب سيولة قاع لندن وإعادة اختبار FVG... انقل الوقف لنقطة الدخول عند ضرب TP1.' : 'London liquidity sweep confirmed... Move stop to BE at TP1.'}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-white text-[#131722] font-bold text-xs hover:bg-[#d1d4dc] transition-all cursor-pointer shadow-md"
                  >
                    {isAr ? 'نشر الإشارة للمتداولين فوراً' : 'Broadcast Signal Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminPublishOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] text-xs text-[#787b86] hover:text-white"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
