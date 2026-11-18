import React, { useState } from 'react';
import {
  Radio,
  Lock,
  Copy,
  CheckCircle2,
  Bot,
  Crown,
  KeyRound,
  Send,
  PlusCircle,
  MessageSquare,
  Trash2,
  Edit3,
  X
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { MarketTicker, MarketSymbol, UserProfile } from '../../types/trading';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useLiveSignals, ChannelSignalItem, BotAlertItem } from '../../hooks/useLiveSignals';
import { hasFeatureAccess } from '../../utils/entitlements';
import { OperationType, reportFirestoreError } from '../../utils/firestoreError';

export type { ChannelSignalItem, BotAlertItem };

interface Props {
  user?: UserProfile | null;
  isVIP: boolean;
  userRole?: string;
  isAdmin?: boolean;
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (sym: MarketSymbol) => void;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  lang?: 'ar' | 'en';
  activeChannel?: 'free' | 'vip' | 'bot';
  onChannelChange?: (ch: 'free' | 'vip' | 'bot') => void;
}

export const SignalsChannelHub: React.FC<Props> = ({
  user,
  isVIP,
  userRole,
  isAdmin = false,
  onSelectSymbol,
  onOpenPromoModal,
  onOpenPlansModal,
  lang = 'ar',
  activeChannel: activeChannelProp,
  onChannelChange
}) => {
  const [internalChannel, setInternalChannel] = useState<'free' | 'vip' | 'bot'>('free');
  const activeChannel = activeChannelProp !== undefined ? activeChannelProp : internalChannel;

  const setActiveChannel = (ch: 'free' | 'vip' | 'bot') => {
    setInternalChannel(ch);
    if (onChannelChange) {
      onChannelChange(ch);
    }
  };

  const { signals, botAlerts, loading, botAlertsLoading, addToast } = useLiveSignals();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDeleteSignal, setPendingDeleteSignal] = useState<{
    id: string;
    label: string;
    targetCollection: 'signals' | 'bot_alerts';
  } | null>(null);
  const [deletingSignal, setDeletingSignal] = useState(false);
  const [deleteSignalError, setDeleteSignalError] = useState<string | null>(null);

  // Admin Publishing Modal State (Direct RBAC — no client PIN bypass)
  const [adminPublishOpen, setAdminPublishOpen] = useState(false);
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
  const roleUpper = (userRole || user?.role || 'FREE').toUpperCase();
  const isRealAdmin = Boolean(isAdmin || user?.isAdmin || ['ADMIN', 'ANALYSER', 'ANALYST'].includes(roleUpper));
  const hasVipSignalsAccess = user
    ? hasFeatureAccess(user, 'vipSignals')
    : Boolean(isVIP || isRealAdmin || ['VIP', 'ELITE', 'MODERATOR'].includes(roleUpper));
  const hasBotSignalsAccess = user
    ? hasFeatureAccess(user, 'botSignals')
    : Boolean(isVIP || isRealAdmin || ['VIP', 'ELITE', 'MODERATOR'].includes(roleUpper));
  const hasFullAccess = hasVipSignalsAccess;

  // Admin Edit Modal state
  const [editingSignal, setEditingSignal] = useState<{
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    entryPrice: number;
    sl: number;
    tp1: number;
    tp2?: number;
    notes: string;
    isBot?: boolean;
  } | null>(null);

  const [editSigSymbol, setEditSigSymbol] = useState('US100');
  const [editSigAction, setEditSigAction] = useState<'BUY' | 'SELL'>('BUY');
  const [editSigEntry, setEditSigEntry] = useState('');
  const [editSigSl, setEditSigSl] = useState('');
  const [editSigTp1, setEditSigTp1] = useState('');
  const [editSigTp2, setEditSigTp2] = useState('');
  const [editSigNotes, setEditSigNotes] = useState('');

  const handleDeleteSignal = (
    id: string,
    isBotAlert?: boolean,
    originCollection?: 'signals' | 'bot_alerts',
    label?: string
  ) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    const targetCollection: 'signals' | 'bot_alerts' =
      originCollection || (isBotAlert || id.startsWith('bot-') ? 'bot_alerts' : 'signals');
    setDeleteSignalError(null);
    setPendingDeleteSignal({
      id,
      label: label || (targetCollection === 'bot_alerts' ? 'TradingView Bot Alert' : id),
      targetCollection
    });
  };

  const handleConfirmDeleteSignal = async () => {
    if (!pendingDeleteSignal || !isRealAdmin || deletingSignal) return;
    const cleanId = pendingDeleteSignal.id.replace(/^bot-/, '');
    const targetCollection = pendingDeleteSignal.targetCollection;

    if (!auth.currentUser) {
      const msg = isAr
        ? 'جلسة تسجيل الدخول غير نشطة في Firebase. يرجى إعادة تسجيل الدخول ثم المحاولة مجدداً.'
        : 'Firebase auth session is not active. Please sign in again and retry.';
      setDeleteSignalError(msg);
      return;
    }

    setDeletingSignal(true);
    setDeleteSignalError(null);
    try {
      await deleteDoc(doc(db, targetCollection, cleanId));
      soundManager.playProfitChime();
      addToast({
        title: isAr ? 'تم حذف الصفقة بنجاح' : 'Trade Deleted',
        message: isAr
          ? `تمت إزالة ${pendingDeleteSignal.label} نهائياً من قاعدة البيانات.`
          : `${pendingDeleteSignal.label} was permanently deleted.`,
        type: targetCollection === 'bot_alerts' ? 'bot' : 'signal',
        timestamp: isAr ? 'الآن' : 'Now'
      });
      setPendingDeleteSignal(null);
    } catch (err: any) {
      const { message } = reportFirestoreError(
        err,
        OperationType.DELETE,
        `${targetCollection}/${cleanId}`
      );
      setDeleteSignalError(message);
      addToast({
        title: isAr ? 'تعذر حذف الصفقة' : 'Delete Failed',
        message,
        type: 'bot',
        timestamp: isAr ? 'الآن' : 'Now'
      });
    } finally {
      setDeletingSignal(false);
    }
  };

  const openSignalEditModal = (item: {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    entryPrice: number;
    sl: number;
    tp1: number;
    tp2?: number;
    notes: string;
    isBot?: boolean;
  }) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    setEditingSignal(item);
    setEditSigSymbol(item.symbol || 'US100');
    setEditSigAction(item.action || 'BUY');
    setEditSigEntry(String(item.entryPrice || ''));
    setEditSigSl(String(item.sl || ''));
    setEditSigTp1(String(item.tp1 || ''));
    setEditSigTp2(String(item.tp2 || ''));
    setEditSigNotes(item.notes || '');
  };

  const handleSaveEditSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSignal || !isRealAdmin) return;

    try {
      const cleanId = editingSignal.id.replace(/^bot-/, '');
      const isBot = Boolean(editingSignal.isBot || editingSignal.id.startsWith('bot-'));

      if (isBot) {
        await updateDoc(doc(db, 'bot_alerts', cleanId), {
          text: editSigNotes
        });
      } else {
        await updateDoc(doc(db, 'signals', cleanId), {
          symbol: editSigSymbol,
          action: editSigAction,
          entryPrice: Number(editSigEntry || 0),
          sl: Number(editSigSl || 0),
          tp1: Number(editSigTp1 || 0),
          tp2: Number(editSigTp2 || 0),
          notesAr: editSigNotes,
          notesEn: editSigNotes,
          instructionsAr: editSigNotes,
          instructionsEn: editSigNotes,
          textMsg: editSigNotes
        });
      }

      soundManager.playProfitChime();
      setEditingSignal(null);
    } catch (err: any) {
      const cleanId = editingSignal.id.replace(/^bot-/, '');
      const isBot = Boolean(editingSignal.isBot || editingSignal.id.startsWith('bot-'));
      const { message } = reportFirestoreError(
        err,
        OperationType.UPDATE,
        `${isBot ? 'bot_alerts' : 'signals'}/${cleanId}`
      );
      addToast({
        title: isAr ? 'تعذر حفظ التعديلات' : 'Edit Failed',
        message,
        type: 'bot',
        timestamp: isAr ? 'الآن' : 'Now'
      });
    }
  };

  const handleCopyLevels = (text: string, id: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePublishSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRealAdmin || !newSigEntry || !newSigTp1 || !newSigSl) return;

    try {
      const isVip = newSigChannel === 'vip';
      const entryNum = Number(newSigEntry);
      const tp1Num = Number(newSigTp1);
      const tp2Num = newSigTp2 ? Number(newSigTp2) : tp1Num;
      const slNum = Number(newSigSl);

      const payload = {
        channel: newSigChannel,
        symbol: newSigSymbol,
        action: newSigAction,
        entryPrice: entryNum,
        tp1: tp1Num,
        tp2: tp2Num,
        sl: slNum,
        strategy: newSigStrategy || 'MBK Strategy',
        notesAr: newSigNotes || 'إشارة جديدة من المشرف',
        notesEn: newSigNotes || 'New admin signal',
        instructionsAr: newSigNotes || 'إشارة جديدة من المشرف',
        instructionsEn: newSigNotes || 'New admin signal',
        status: 'RUNNING',
        openTime: 'الآن',
        duration: 'الآن',
        timeframe: '15m',
        pips: 0,
        confidence: 90,
        accessLevel: isVip ? 'vip' : 'free',
        source: isVip ? 'VIP_MANUAL' : 'FREE_PUBLIC',
        isBlurredForFree: isVip,
        timestampMs: Date.now(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'signals'), payload);

      soundManager.playProfitChime();
      confetti({ particleCount: 80, spread: 70 });
      setAdminPublishOpen(false);

      setNewSigEntry('');
      setNewSigTp1('');
      setNewSigTp2('');
      setNewSigSl('');
      setNewSigNotes('');
    } catch (err: any) {
      const { message } = reportFirestoreError(err, OperationType.CREATE, 'signals');
      addToast({
        title: isAr ? 'تعذر نشر التوصية' : 'Publish Failed',
        message,
        type: 'bot',
        timestamp: isAr ? 'الآن' : 'Now'
      });
    }
  };

  const channelSignals = signals.filter((s) => s.channel === activeChannel).slice(0, 30);

  return (
    <div className="space-y-4">
      {/* 1. CHANNEL SELECTION BAR */}
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
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
            {!hasVipSignalsAccess && <Lock className="w-2.5 h-2.5 text-amber-400" />}
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
            {!hasBotSignalsAccess && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>
        </div>

        {/* Channel Status & Admin-only Publish Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#787b86] font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
            <span>
              {activeChannel === 'bot' ? botAlerts.length : channelSignals.length}{' '}
              {isAr ? 'صفقات نشطة' : 'Active setups'}
            </span>
          </div>

          {isRealAdmin && (
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
          )}
        </div>
      </div>

      {/* 2. CHANNEL DESCRIPTION BANNER */}
      <div className="p-3 rounded-lg bg-[#1e222d]/70 border border-[#2a2e39] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          {activeChannel === 'free' ? (
            <p className="text-[#d1d4dc]">
              📢 <strong className="text-white">{isAr ? 'القناة المجانية المفتوحة:' : 'Public Free Channel:'}</strong>{' '}
              {isAr
                ? 'توصيات يومية مدروسة مع تعليمات واضحة لإدارة رأس المال، متاحة لكافة المتداولين.'
                : 'Curated daily trade setups with risk parameters, open for all traders.'}
            </p>
          ) : activeChannel === 'vip' ? (
            <p className="text-[#d1d4dc]">
              👑 <strong className="text-amber-400">{isAr ? 'قناة كبار المتداولين VIP:' : 'VIP Institutional Channel:'}</strong>{' '}
              {isAr
                ? 'صفقات لحظية مباشرة من فريق أبحاث MBK مع أهداف متتالية وتنبيهات صوتية فورية.'
                : 'Direct institutional setups from MBK research team with instant audio notifications.'}
            </p>
          ) : (
            <p className="text-[#d1d4dc]">
              ⚡ <strong className="text-[#089981]">{isAr ? 'إشارات TradingView Webhook الآلية:' : 'Automated TradingView Webhook Feed:'}</strong>{' '}
              {isAr
                ? 'ربط مباشر مع مؤشرات Pine Script لإرسال التنبيهات لحظة ظهور الفرصة.'
                : 'Direct algorithmic webhook stream from TradingView Pine Script indicators.'}
            </p>
          )}
        </div>

        {((activeChannel === 'bot' && !hasBotSignalsAccess) || (activeChannel === 'vip' && !hasVipSignalsAccess)) && (
          <div className="flex items-center gap-2 shrink-0">
            {onOpenPlansModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isAr ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isAr ? 'تفعيل كود' : 'Redeem Key'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. SIGNALS OR BOT FEED VIEW */}
      {activeChannel === 'bot' ? (
        !hasBotSignalsAccess ? (
          <div className="space-y-4">
            {/* Free Bot Trader Starter Tier Summary */}
            <div className="bg-[#1e222d] border border-[#089981]/35 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#089981]">
                  <Bot className="w-4 h-4" />
                  <span>{isAr ? 'بوت التداول المجاني (Free Bot Trader)' : 'Free Bot Trader (Starter Access)'}</span>
                </div>
                <p className="text-xs text-[#b2b5be] leading-relaxed">
                  {isAr
                    ? 'تحصل على تنبيهات القناة المجانية وحاسبة المخاطر والتداول التجريبي مجاناً. لتفعيل البث اللحظي الكامل لروبوت TradingView Webhook، قم بالترقية إلى باقة VIP.'
                    : 'Your Free Tier includes public setups, risk calculator & paper trading. Upgrade to VIP ($100/mo) or redeem a trial key to unlock the live Webhook Bot stream.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenPlansModal && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onOpenPlansModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    {isAr ? 'عرض الباقات ($100/mo)' : 'View VIP Plan ($100/mo)'}
                  </button>
                )}
                {onOpenPromoModal && (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onOpenPromoModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إدخال كود' : 'Activate Key'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#1e222d] border border-amber-500/30 rounded-xl p-8 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">
                {isAr ? 'تنبيهات روبوت TradingView الفورية مخصصة لباقة VIP' : 'Real-Time TradingView Bot Feed requires VIP'}
              </h4>
              <p className="text-xs text-[#787b86] max-w-md mx-auto">
                {isAr
                  ? 'اشترك في باقة VIP أو فعّل كود التفعيل التجريبي لاستقبال تنبيهات البوت الفورية والصوتية بدون تأخير.'
                  : 'Upgrade to VIP or apply a trial code for real-time TradingView bot signals and instant audio notifications.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#089981]/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? 'قناة تنبيهات TradingView Bot' : 'TradingView Bot Alerts Channel'}
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-[#089981] animate-ping" />
                  </div>
                  <p className="text-[11px] text-[#787b86]">
                    {isAr
                      ? 'آخر 30 تنبيه لحظي مرسل عبر Webhook'
                      : 'Latest 30 live Pine Script alerts via Webhook'}
                  </p>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#131722] border border-[#2a2e39] text-xs font-mono text-[#089981] font-bold">
                {botAlerts.length} {isAr ? 'تنبيهات' : 'alerts'}
              </div>
            </div>

            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 smooth-scroll">
              {botAlertsLoading ? (
                <div className="p-8 text-center text-[#787b86] text-xs">
                  <Bot className="w-6 h-6 animate-bounce mx-auto mb-2 text-[#089981]" />
                  <p>{isAr ? 'جاري الاتصال بقناة التنبيهات المباشرة...' : 'Connecting to live alerts stream...'}</p>
                </div>
              ) : botAlerts.length === 0 ? (
                <div className="p-8 text-center bg-[#131722] border border-[#2a2e39] rounded-xl text-[#787b86]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#089981]" />
                  <p className="text-sm font-semibold">
                    {isAr ? 'لا توجد تنبيهات من بوت TradingView حتى الآن' : 'No TradingView bot alerts received yet'}
                  </p>
                </div>
              ) : (
                botAlerts.map((alertItem) => {
                  const timeStr = alertItem.timestamp
                    ? new Date(alertItem.timestamp).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : 'الآن';

                  return (
                    <div
                      key={alertItem.id}
                      className="bg-[#131722] border border-[#2a2e39] hover:border-[#363a45] rounded-2xl p-4 shadow-md transition-all group animate-fade-in"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2e39]/60">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#089981]" />
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-[#089981]" />
                            <span>TradingView Bot</span>
                          </span>
                          {alertItem.chat_id && (
                            <span className="text-[10px] text-[#787b86] font-mono bg-[#1e222d] px-2 py-0.5 rounded border border-[#2a2e39]">
                              {alertItem.chat_id}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#787b86] font-mono">{timeStr}</span>

                          {isRealAdmin && (
                            <>
                              <button
                                onClick={() =>
                                  openSignalEditModal({
                                    id: alertItem.id,
                                    symbol: 'US100',
                                    action: 'BUY',
                                    entryPrice: 0,
                                    sl: 0,
                                    tp1: 0,
                                    notes: alertItem.text,
                                    isBot: true
                                  })
                                }
                                className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 cursor-pointer"
                                title={isAr ? 'تعديل' : 'Edit'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSignal(
                                    alertItem.id,
                                    true,
                                    'bot_alerts',
                                    'TradingView Bot Alert'
                                  );
                                }}
                                className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 cursor-pointer"
                                title={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleCopyLevels(alertItem.text, alertItem.id)}
                            className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                              copiedId === alertItem.id
                                ? 'bg-[#089981] text-black font-bold'
                                : 'bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white'
                            }`}
                            title={isAr ? 'نسخ النص' : 'Copy message'}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-[#d1d4dc] leading-relaxed whitespace-pre-wrap font-mono bg-[#1a1e29] p-3 rounded-xl border border-[#2a2e39]/80 text-start dir-ltr">
                        {alertItem.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )
      ) : activeChannel === 'vip' && !hasVipSignalsAccess ? (
        <div className="bg-[#1e222d] border border-amber-500/30 rounded-xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Crown className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-white">
            {isAr ? 'قناة التوصيات الحصرية لأعضاء VIP' : 'Exclusive VIP Signals Channel'}
          </h4>
          <p className="text-xs text-[#787b86] max-w-md mx-auto">
            {isAr
              ? 'قم بترقية الباقة أو تفعيل مفتاح العضوية لفتح جميع إشارات النخبة والأهداف ومناطق وقف الخسارة لحظياً.'
              : 'Upgrade to VIP or activate a key to unlock all live VIP signals and institutional targets.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onOpenPlansModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#089981] hover:bg-[#07846f] text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>{isAr ? 'ترقية إلى VIP ($100/mo)' : 'Subscribe VIP ($100/mo)'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#131722] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAr ? 'تفعيل مفتاح VIP الآن' : 'Activate VIP Key'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full p-8 text-center bg-[#1e222d] border border-[#2a2e39] rounded-xl text-[#787b86]">
              <Radio className="w-8 h-8 mx-auto mb-2 text-[#089981] animate-pulse" />
              <p className="text-sm font-semibold">{isAr ? 'جاري تحميل الإشارات...' : 'Loading live signals...'}</p>
            </div>
          ) : channelSignals.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-[#1e222d] border border-[#2a2e39] rounded-xl text-[#787b86]">
              <Radio className="w-8 h-8 mx-auto mb-2 text-[#787b86] opacity-60" />
              <p className="text-sm font-semibold">{isAr ? 'لا توجد إشارات مباشرة حالياً' : 'No live alerts yet'}</p>
              <p className="text-xs text-[#787b86] mt-1">
                {isAr ? 'سيتم بث الإشارات لحظة استيفاء شروط السيولة' : 'New setups will broadcast upon confirmation'}
              </p>
            </div>
          ) : (
            channelSignals.map((signal) => {
              const isLocked = signal.channel !== 'free' && !hasFullAccess;

              return (
                <div
                  key={signal.id}
                  className="bg-[#1e222d] border border-[#2a2e39] hover:border-[#363a45] rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all group"
                >
                  <div>
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

                    <div className="flex items-center justify-between text-xs text-[#787b86] pb-2 mb-3 border-b border-[#2a2e39]">
                      <span className="truncate">{signal.strategy}</span>
                      <span className="font-mono text-[11px] shrink-0 text-[#089981]">{signal.timeAgo}</span>
                    </div>

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

                      {isLocked && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-lg p-2 text-center">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>{isAr ? 'توصية خاصة بـ VIP' : 'VIP Setup'}</span>
                          </div>
                          {onOpenPromoModal && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onOpenPromoModal();
                              }}
                              className="px-3 py-1 rounded bg-white text-[#131722] text-[11px] font-bold hover:bg-[#d1d4dc] transition-all cursor-pointer shadow-sm"
                            >
                              {isAr ? 'تفعيل VIP للفتح 🔓' : 'Unlock VIP 🔓'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#787b86] leading-relaxed mb-3">
                      {isLocked
                        ? isAr
                          ? 'المستويات الدقيقة مخصصة لحسابات VIP النشطة.'
                          : 'Exact levels reserved for active VIP accounts.'
                        : isAr
                        ? signal.instructionsAr
                        : signal.instructionsEn}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectSymbol(signal.symbol as MarketSymbol)}
                        className="py-1.5 px-2.5 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{isAr ? 'عرض الشارت' : 'Chart'}</span>
                      </button>

                      {isRealAdmin && (
                        <>
                          <button
                            onClick={() =>
                              openSignalEditModal({
                                id: signal.id,
                                symbol: signal.symbol,
                                action: signal.action,
                                entryPrice: signal.entryPrice,
                                sl: signal.sl,
                                tp1: signal.tp1,
                                tp2: signal.tp2,
                                notes: signal.instructionsAr || signal.instructionsEn || '',
                                isBot: signal.channel === 'bot'
                              })
                            }
                            className="py-1.5 px-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold transition-all cursor-pointer flex items-center gap-0.5 text-xs"
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSignal(
                                signal.id,
                                signal.channel === 'bot',
                                signal.originCollection,
                                `${signal.action} ${signal.symbol}`
                              );
                            }}
                            className="py-1.5 px-2 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold transition-all cursor-pointer flex items-center gap-0.5 text-xs"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        </>
                      )}
                    </div>

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
                        <span>{copiedId === signal.id ? (isAr ? '✓ تم النسخ' : 'Copied!') : isAr ? 'نسخ المستويات' : 'Copy'}</span>
                      </button>
                    ) : (
                      onOpenPromoModal && (
                        <button
                          onClick={() => {
                            soundManager.playClick();
                            onOpenPromoModal();
                          }}
                          className="py-1.5 px-3 rounded bg-[#2a2e39] hover:bg-[#363a45] text-amber-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تفعيل VIP' : 'Unlock'}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ADMIN PUBLISHING MODAL (Admins / Analysers Only) */}
      {adminPublishOpen && isRealAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="bg-[#1e222d] border border-[#363a45] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-[#d1d4dc] max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setAdminPublishOpen(false)}
              className="absolute top-4 end-4 p-1.5 rounded-lg bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
            >
              ✕
            </button>

            <form onSubmit={handlePublishSignal} className="space-y-3.5">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#2a2e39]">
                <Send className="w-4 h-4 text-[#089981]" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'بث توصية تداول جديدة' : 'Broadcast Live Trade Setup'}
                </h3>
              </div>

              <div>
                <label className="text-xs text-[#787b86] block mb-1">
                  {isAr ? 'القناة المستهدفة:' : 'Target Channel:'}
                </label>
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

              <div>
                <label className="text-xs text-[#787b86] block mb-1">{isAr ? 'الاستراتيجية:' : 'Strategy:'}</label>
                <input
                  type="text"
                  value={newSigStrategy}
                  onChange={(e) => setNewSigStrategy(e.target.value)}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#089981]"
                />
              </div>

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

              <div>
                <label className="text-xs text-[#787b86] block mb-1">
                  {isAr ? 'تعليمات الصفقة والشرح:' : 'Trade Notes & Instructions:'}
                </label>
                <textarea
                  rows={3}
                  value={newSigNotes}
                  onChange={(e) => setNewSigNotes(e.target.value)}
                  placeholder={isAr ? 'تفاصيل الدخول وإدارة المخاطر...' : 'Entry notes and risk management...'}
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
                  className="px-4 py-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] text-xs text-[#787b86] hover:text-white cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT SIGNAL MODAL */}
      {editingSignal && isRealAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-md p-5 shadow-2xl text-start space-y-3 text-[#d1d4dc]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تعديل الإشارة / التنبيه' : 'Edit Signal / Alert'}
                </h3>
              </div>
              <button
                onClick={() => setEditingSignal(null)}
                className="p-1 rounded bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSignal} className="space-y-3 text-xs">
              {!editingSignal.isBot && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#787b86] block mb-1">{isAr ? 'الرمز:' : 'Symbol:'}</label>
                      <input
                        type="text"
                        value={editSigSymbol}
                        onChange={(e) => setEditSigSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[#787b86] block mb-1">{isAr ? 'النوع:' : 'Action:'}</label>
                      <select
                        value={editSigAction}
                        onChange={(e) => setEditSigAction(e.target.value as 'BUY' | 'SELL')}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono"
                      >
                        <option value="BUY">BUY (شراء)</option>
                        <option value="SELL">SELL (بيع)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[#787b86] block mb-1">ENTRY (سعر الدخول):</label>
                    <input
                      type="number"
                      step="any"
                      value={editSigEntry}
                      onChange={(e) => setEditSigEntry(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[#f23645] block mb-1">SL (وقف الخسارة):</label>
                    <input
                      type="number"
                      step="any"
                      value={editSigSl}
                      onChange={(e) => setEditSigSl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#f23645] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[#089981] block mb-1">TP1 (الهدف الأول):</label>
                    <input
                      type="number"
                      step="any"
                      value={editSigTp1}
                      onChange={(e) => setEditSigTp1(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#089981] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[#089981] block mb-1">TP2 (الهدف الثاني):</label>
                    <input
                      type="number"
                      step="any"
                      value={editSigTp2}
                      onChange={(e) => setEditSigTp2(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#089981] font-mono"
                    />
                  </div>
                </div>
                </>
              )}

              <div>
                <label className="text-[#787b86] block mb-1">
                  {isAr ? 'نص الشرح / التنبيه:' : 'Signal Notes / Text:'}
                </label>
                <textarea
                  rows={3}
                  value={editSigNotes}
                  onChange={(e) => setEditSigNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSignal(null)}
                  className="flex-1 py-2 rounded-xl bg-[#2a2e39] text-white text-xs font-bold hover:bg-[#363a45] cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DELETE CONFIRMATION MODAL (In-app modal compatible with iframe) */}
      {pendingDeleteSignal && isRealAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="bg-[#1e222d] border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-start space-y-4 text-[#d1d4dc]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تأكيد حذف الصفقة' : 'Confirm Delete Trade'}
                </h3>
              </div>
              <button
                type="button"
                disabled={deletingSignal}
                onClick={() => {
                  setPendingDeleteSignal(null);
                  setDeleteSignalError(null);
                }}
                className="p-1 rounded bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[#d1d4dc] leading-relaxed">
                {isAr
                  ? 'هل أنت متأكد من حذف هذه الصفقة نهائياً من قاعدة البيانات؟'
                  : 'Are you sure you want to permanently delete this shared trade from the database?'}
              </p>
              <div className="px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] font-mono text-white font-bold flex items-center justify-between">
                <span>{pendingDeleteSignal.label}</span>
                <span className="text-[10px] text-[#787b86]">{pendingDeleteSignal.targetCollection}</span>
              </div>
              {deleteSignalError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-mono break-words">
                  {deleteSignalError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={deletingSignal}
                onClick={() => {
                  setPendingDeleteSignal(null);
                  setDeleteSignalError(null);
                }}
                className="flex-1 py-2 rounded-xl bg-[#2a2e39] text-white text-xs font-bold hover:bg-[#363a45] cursor-pointer disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deletingSignal}
                onClick={handleConfirmDeleteSignal}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deletingSignal
                    ? isAr
                      ? 'جاري الحذف...'
                      : 'Deleting...'
                    : isAr
                    ? 'حذف نهائي'
                    : 'Delete Permanently'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
