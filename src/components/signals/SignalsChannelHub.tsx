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
import { MarketTicker, MarketSymbol, UserProfile, DailyTradeStatus } from '../../types/trading';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useLiveSignals, ChannelSignalItem, BotAlertItem } from '../../hooks/useLiveSignals';
import {
  isTradeActiveStatus,
  isTradeTpHitStatus,
  isTradeSlHitStatus,
  isTradeClosedStatus,
  getTradeStatusLabelAr
} from '../../context/SignalsContext';
import { hasFeatureAccess } from '../../utils/entitlements';
import { OperationType, reportFirestoreError } from '../../utils/firestoreError';
import { markDocumentDeleted } from '../../utils/legacyDbRecovery';

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

  const {
    signals,
    botAlerts,
    loading,
    botAlertsLoading,
    addToast,
    removeSignalLocally,
    updateSignalStatusLocally
  } = useLiveSignals();
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
  const isRealAdmin = Boolean(
    isAdmin ||
      user?.isAdmin ||
      ['ADMIN', 'MODERATOR', 'ANALYSER', 'ANALYST'].includes(roleUpper) ||
      auth.currentUser?.email?.toLowerCase() === 'moe.albzour@gmail.com'
  );
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
    status?: DailyTradeStatus;
    isBot?: boolean;
  } | null>(null);

  const [editSigSymbol, setEditSigSymbol] = useState('US100');
  const [editSigAction, setEditSigAction] = useState<'BUY' | 'SELL'>('BUY');
  const [editSigEntry, setEditSigEntry] = useState('');
  const [editSigSl, setEditSigSl] = useState('');
  const [editSigTp1, setEditSigTp1] = useState('');
  const [editSigTp2, setEditSigTp2] = useState('');
  const [editSigNotes, setEditSigNotes] = useState('');
  const [editSigStatus, setEditSigStatus] = useState<DailyTradeStatus>('RUNNING');

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
      label: label || (targetCollection === 'bot_alerts' ? 'MBK Bot Alert' : id),
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
      markDocumentDeleted(cleanId);
      removeSignalLocally(cleanId);
      await deleteDoc(doc(db, targetCollection, cleanId)).catch(() => {});
      const altCol = targetCollection === 'bot_alerts' ? 'signals' : 'bot_alerts';
      await deleteDoc(doc(db, altCol, cleanId)).catch(() => {});
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
    status?: DailyTradeStatus;
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
    setEditSigStatus(item.status || 'RUNNING');
  };

  const handleQuickUpdateSignalStatus = async (
    signal: ChannelSignalItem,
    newStatus: DailyTradeStatus
  ) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    const cleanId = signal.id.replace(/^bot-/, '');
    const statusLabelAr = getTradeStatusLabelAr(newStatus);

    let nextPips = Number(signal.pips || 0);
    if (isTradeTpHitStatus(newStatus)) {
      const diff = Math.abs((signal.tp1 || 0) - (signal.entryPrice || 0));
      const calcPips = signal.symbol === 'EURUSD' || signal.symbol === 'GBPUSD'
        ? Math.round(diff * 10000)
        : Math.round(diff * 10);
      nextPips = Math.abs(nextPips) > 0 ? Math.abs(nextPips) : Math.max(calcPips, 100);
    } else if (isTradeSlHitStatus(newStatus)) {
      const diff = Math.abs((signal.entryPrice || 0) - (signal.sl || 0));
      const calcPips = signal.symbol === 'EURUSD' || signal.symbol === 'GBPUSD'
        ? Math.round(diff * 10000)
        : Math.round(diff * 10);
      nextPips = -Math.max(Math.abs(nextPips) > 0 ? Math.abs(nextPips) : calcPips, 40);
    } else if (isTradeClosedStatus(newStatus) || isTradeActiveStatus(newStatus)) {
      nextPips = isTradeActiveStatus(newStatus) ? Math.max(0, nextPips) : nextPips;
    }

    // Immediate optimistic local update across Signals & Trades tabs
    updateSignalStatusLocally(cleanId, newStatus, nextPips);

    try {
      await updateDoc(doc(db, 'signals', cleanId), {
        status: newStatus,
        statusLabelAr,
        pips: nextPips
      });
      soundManager.playProfitChime();
      addToast({
        title: isAr ? 'تم تحديث حالة الصفقة' : 'Trade Status Updated',
        message: `${signal.symbol} (${signal.action}) → ${isAr ? statusLabelAr : newStatus}`,
        type: 'signal',
        symbol: signal.symbol,
        action: signal.action,
        timestamp: isAr ? 'الآن' : 'Now'
      });
    } catch (err: any) {
      const { message } = reportFirestoreError(err, OperationType.UPDATE, `signals/${cleanId}`);
      addToast({
        title: isAr ? 'تعذر تحديث الحالة' : 'Status Update Failed',
        message,
        type: 'bot',
        timestamp: isAr ? 'الآن' : 'Now'
      });
    }
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
        const statusLabelAr = getTradeStatusLabelAr(editSigStatus);
        updateSignalStatusLocally(cleanId, editSigStatus);
        const updatePayload = {
          symbol: editSigSymbol,
          action: editSigAction,
          entryPrice: Number(editSigEntry || 0),
          sl: Number(editSigSl || 0),
          tp1: Number(editSigTp1 || 0),
          tp2: Number(editSigTp2 || 0),
          status: editSigStatus,
          statusLabelAr,
          notesAr: editSigNotes,
          notesEn: editSigNotes,
          instructionsAr: editSigNotes,
          instructionsEn: editSigNotes,
          textMsg: editSigNotes
        };
        await updateDoc(doc(db, 'signals', cleanId), updatePayload);
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
    <div className="space-y-3">
      {/* 1. INSTITUTIONAL CHANNEL CONTROL HEADER */}
      <div className="bg-[#10141c] border border-[#1e2633] rounded-[3px] px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633] overflow-x-auto smooth-scroll-x">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('free');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeChannel === 'free'
                ? 'bg-[#1c2432] text-[#edf0f5] font-semibold border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
            <span>{isAr ? 'التوصيات العامة' : 'Public Signals'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('vip');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'vip'
                ? 'bg-[#1c2432] text-[#edf0f5] font-semibold border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            <span>{isAr ? 'توصيات VIP المؤسسية' : 'VIP Institutional'}</span>
            {!hasVipSignalsAccess && <Lock className="w-2.5 h-2.5 text-[#8492a6]" />}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveChannel('bot');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'bot'
                ? 'bg-[#1c2432] text-[#edf0f5] font-semibold border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            <span>{isAr ? 'البوت الخوارزمي MBK' : 'Automated Bot'}</span>
            {!hasBotSignalsAccess && <Lock className="w-2.5 h-2.5 text-[#8492a6]" />}
          </button>
        </div>

        {/* Channel Status & Admin-only Publish Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#8492a6] font-mono text-[11px] px-2 py-1 bg-[#0a0d12] border border-[#1e2633] rounded-[3px]">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
            <span>
              {activeChannel === 'bot' ? botAlerts.length : channelSignals.length}{' '}
              {isAr ? 'نشط' : 'ACTIVE'}
            </span>
          </div>

          {isRealAdmin && (
            <button
              onClick={() => {
                soundManager.playClick();
                setAdminPublishOpen(true);
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              title={isAr ? 'نشر توصية جديدة للمشرف' : 'Admin publish signal'}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#10b981]" />
              <span>{isAr ? 'نشر توصية' : 'Publish Order'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CHANNEL SPECIFICATION BAR */}
      <div className="px-3 py-2 rounded-[3px] bg-[#10141c] border border-[#1e2633] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#0a0d12] border border-[#1e2633] text-[#8492a6] rounded-[2px]">
            {activeChannel === 'free' ? 'DESK · PUBLIC' : activeChannel === 'vip' ? 'DESK · VIP' : 'DESK · ALGO'}
          </span>
          {activeChannel === 'free' ? (
            <p className="text-[#8492a6] text-[11px]">
              <strong className="text-[#edf0f5] font-semibold">{isAr ? 'التوصيات العامة:' : 'Public Desk:'}</strong>{' '}
              {isAr ? 'توصيات يومية مفتوحة لجميع المتداولين' : 'Standard daily order setups available to all accounts'}
            </p>
          ) : activeChannel === 'vip' ? (
            <p className="text-[#8492a6] text-[11px]">
              <strong className="text-[#edf0f5] font-semibold">{isAr ? 'توصيات VIP:' : 'VIP Desk:'}</strong>{' '}
              {isAr ? 'صفقات السيولة المؤسسية المباشرة لمشتركي VIP' : 'High-conviction institutional setups with full Entry/SL/TP execution levels'}
            </p>
          ) : (
            <p className="text-[#8492a6] text-[11px]">
              <strong className="text-[#edf0f5] font-semibold">{isAr ? 'بوت MBK:' : 'Algorithmic Feed:'}</strong>{' '}
              {isAr ? 'تدفق التنبيهات الخوارزمية الفورية' : 'Real-time automated webhook execution stream'}
            </p>
          )}
        </div>

        {((activeChannel === 'bot' && !hasBotSignalsAccess) || (activeChannel === 'vip' && !hasVipSignalsAccess)) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenPlansModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="px-2.5 py-1 rounded-[3px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{isAr ? 'ترقية إلى VIP' : 'Upgrade Desk Access'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="px-2.5 py-1 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <KeyRound className="w-3 h-3" />
                <span>{isAr ? 'تفعيل مفتاح' : 'Enter License Key'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. SIGNALS OR BOT FEED VIEW */}
      {activeChannel === 'bot' ? (
        !hasBotSignalsAccess ? (
          <div className="bg-[#10141c] border border-[#1e2633] rounded-[3px] p-6 text-center space-y-3">
            <div className="w-9 h-9 rounded-[3px] bg-[#161c26] border border-[#2a3446] text-[#8492a6] flex items-center justify-center mx-auto">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-[#edf0f5]">
              {isAr ? 'البوت الخوارزمي مخصص لحسابات VIP' : 'Automated Webhook Feed — Restricted Access'}
            </h4>
            <p className="text-xs text-[#8492a6] max-w-md mx-auto">
              {isAr
                ? 'قم بترقية الحساب أو إدخال مفتاح الترخيص لتفعيل تدفق إشارات البوت المباشرة.'
                : 'Upgrade your terminal subscription or enter a valid license key to unlock live algorithmic alerts.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {onOpenPlansModal && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onOpenPlansModal();
                  }}
                  className="px-4 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  {isAr ? 'عرض الباقات ($100/mo)' : 'View Institutional Plans ($100/mo)'}
                </button>
              )}
              {onOpenPromoModal && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onOpenPromoModal();
                  }}
                  className="px-4 py-1.5 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إدخال مفتاح' : 'Activate License Key'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#10141c] border border-[#1e2633] rounded-[3px] p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1e2633]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[3px] bg-[#161c26] border border-[#2a3446] flex items-center justify-center text-[#edf0f5]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#edf0f5] uppercase tracking-wider">
                      {isAr ? 'تدفق البوت الخوارزمي' : 'ALGORITHMIC EXECUTION STREAM'}
                    </h4>
                    <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
                  </div>
                  <p className="text-[11px] text-[#8492a6]">
                    {isAr ? 'تنبيهات بوت MBK المباشرة' : 'Real-time automated webhook dispatch'}
                  </p>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded-[2px] bg-[#0a0d12] border border-[#1e2633] text-[11px] font-mono text-[#8492a6]">
                {botAlerts.length} {isAr ? 'تنبيه' : 'EVENTS'}
              </div>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 smooth-scroll">
              {botAlertsLoading ? (
                <div className="p-8 text-center text-[#8492a6] text-xs font-mono">
                  <p>{isAr ? 'جاري التحميل...' : 'SYNCHRONIZING STREAM...'}</p>
                </div>
              ) : botAlerts.length === 0 ? (
                <div className="p-8 text-center bg-[#0a0d12] border border-[#1e2633] rounded-[3px] text-[#8492a6]">
                  <p className="text-xs font-mono">
                    {isAr ? 'لا توجد تنبيهات حالياً' : 'NO ALGORITHMIC EVENTS RECORDED'}
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
                    : 'NOW';

                  return (
                    <div
                      key={alertItem.id}
                      className="bg-[#0a0d12] border border-[#1e2633] hover:border-[#2a3446] rounded-[3px] p-3 transition-colors group"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e2633]">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
                          <span className="text-[11px] font-mono font-semibold text-[#edf0f5]">
                            {isAr ? 'بوت MBK' : 'MBK ALGO'}
                          </span>
                          {alertItem.chat_id && (
                            <span className="text-[10px] text-[#8492a6] font-mono bg-[#10141c] px-1.5 py-0.5 rounded-[2px] border border-[#1e2633]">
                              {alertItem.chat_id}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#8492a6] font-mono">{timeStr}</span>

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
                                className="p-1 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] cursor-pointer"
                                title={isAr ? 'تعديل' : 'Edit'}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSignal(
                                    alertItem.id,
                                    true,
                                    'bot_alerts',
                                    'MBK Bot Alert'
                                  );
                                }}
                                className="p-1 rounded-[2px] bg-[#161c26] hover:bg-[#e11d48]/20 text-[#8492a6] hover:text-[#e11d48] border border-[#1e2633] cursor-pointer"
                                title={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-[#edf0f5] leading-relaxed whitespace-pre-wrap font-mono bg-[#10141c] p-2.5 rounded-[2px] border border-[#1e2633] text-start dir-ltr">
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
        <div className="bg-[#10141c] border border-[#1e2633] rounded-[3px] p-6 text-center space-y-3">
          <div className="w-9 h-9 rounded-[3px] bg-[#161c26] border border-[#2a3446] text-[#8492a6] flex items-center justify-center mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-[#edf0f5]">
            {isAr ? 'مكتب توصيات VIP المؤسسية' : 'VIP Institutional Signal Desk'}
          </h4>
          <p className="text-xs text-[#8492a6] max-w-md mx-auto">
            {isAr
              ? 'قم بترقية الباقة أو تفعيل مفتاح العضوية لفتح جميع إشارات النخبة والأهداف ومناطق وقف الخسارة لحظياً.'
              : 'Upgrade to VIP or enter an institutional license key to unlock full execution prices, stop-loss parameters, and target levels.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onOpenPlansModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPlansModal();
                }}
                className="px-4 py-1.5 rounded-[3px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{isAr ? 'ترقية إلى VIP ($100/mo)' : 'Subscribe VIP Desk ($100/mo)'}</span>
              </button>
            )}
            {onOpenPromoModal && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenPromoModal();
                }}
                className="px-4 py-1.5 rounded-[3px] bg-[#0a0d12] hover:bg-[#161c26] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isAr ? 'تفعيل مفتاح VIP' : 'Activate License Key'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-full p-8 text-center bg-[#10141c] border border-[#1e2633] rounded-[3px] text-[#8492a6] font-mono text-xs">
              <p>{isAr ? 'جاري تحميل الإشارات...' : 'LOADING EXECUTION TICKETS...'}</p>
            </div>
          ) : channelSignals.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-[#10141c] border border-[#1e2633] rounded-[3px] text-[#8492a6]">
              <p className="text-xs font-mono uppercase">{isAr ? 'لا توجد إشارات مباشرة حالياً' : 'NO ACTIVE ORDERS IN DESK'}</p>
              <p className="text-[11px] text-[#525f73] mt-1">
                {isAr ? 'سيتم بث الإشارات لحظة استيفاء شروط السيولة' : 'New institutional tickets broadcast upon liquidity confirmation'}
              </p>
            </div>
          ) : (
            channelSignals.map((signal) => {
              const isLocked = signal.channel !== 'free' && !hasFullAccess;
              const isBuy = signal.action === 'BUY';
              const isActive = isTradeActiveStatus(signal.status);
              const isTpHit = isTradeTpHitStatus(signal.status);
              const isSlHit = isTradeSlHitStatus(signal.status);
              const isClosed = isTradeClosedStatus(signal.status);
              const isEnded = !isActive;

              return (
                <div
                  key={signal.id}
                  className={`rounded-[4px] p-3.5 flex flex-col justify-between relative overflow-hidden transition-all border ${
                    isActive
                      ? isBuy
                        ? 'bg-[#10141c] border-[#10b981]/35 trade-card-active-buy'
                        : 'bg-[#10141c] border-[#e11d48]/35 trade-card-active-sell'
                      : 'bg-[#0b0e14]/90 border-[#1e2633] opacity-60 hover:opacity-90 saturate-[0.75]'
                  }`}
                >
                  {/* Animated moving Buy/Sell border around all 4 sides when ACTIVE */}
                  {isActive && <div className="trade-perimeter-glow" aria-hidden="true" />}

                  {/* Big Angled Stamp Overlay when ENDED (TP HIT / SL HIT / ENDED) */}
                  {isEnded && (
                    <div className="absolute inset-0 z-20 pointer-events-none select-none flex items-center justify-center">
                      {isTpHit ? (
                        <div className="-rotate-12 px-5 py-2 rounded-[4px] border-[3px] border-double border-[#10b981] bg-[#06080c]/95 text-[#10b981] shadow-[0_0_28px_rgba(16,185,129,0.45)] flex flex-col items-center justify-center">
                          <span className="text-base sm:text-lg font-black font-mono tracking-widest uppercase leading-none">
                            🎯 TP HIT
                          </span>
                          <span className="text-[10px] font-bold tracking-wider mt-0.5">
                            {isAr ? 'هدف محقق بنجاح' : 'TARGET ACHIEVED'}
                          </span>
                        </div>
                      ) : isSlHit ? (
                        <div className="-rotate-12 px-5 py-2 rounded-[4px] border-[3px] border-double border-[#e11d48] bg-[#06080c]/95 text-[#e11d48] shadow-[0_0_28px_rgba(225,29,72,0.45)] flex flex-col items-center justify-center">
                          <span className="text-base sm:text-lg font-black font-mono tracking-widest uppercase leading-none">
                            🛑 SL HIT
                          </span>
                          <span className="text-[10px] font-bold tracking-wider mt-0.5">
                            {isAr ? 'ضرب وقف الخسارة' : 'STOP LOSS HIT'}
                          </span>
                        </div>
                      ) : (
                        <div className="-rotate-12 px-5 py-2 rounded-[4px] border-[3px] border-double border-amber-400/90 bg-[#06080c]/95 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center">
                          <span className="text-base sm:text-lg font-black font-mono tracking-widest uppercase leading-none">
                            ⏹ ENDED
                          </span>
                          <span className="text-[10px] font-bold tracking-wider mt-0.5">
                            {isAr ? 'صفقة منتهية' : 'TRADE ENDED'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    {/* Order Ticket Top Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-[2px] text-[11px] font-mono font-bold tracking-wider ${
                            isBuy
                              ? 'bg-[#10b981]/12 text-[#10b981] border border-[#10b981]/30'
                              : 'bg-[#e11d48]/12 text-[#e11d48] border border-[#e11d48]/30'
                          }`}
                        >
                          {signal.action}
                        </span>
                        <span className="text-sm font-mono font-bold text-[#edf0f5] tracking-tight">
                          {signal.symbol}
                        </span>
                        <span className="text-[10px] text-[#8492a6] font-mono px-1.5 py-0.5 bg-[#0a0d12] border border-[#1e2633] rounded-[2px]">
                          {signal.timeframe}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        {isTpHit ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {isAr ? 'هدف محقق' : 'TP HIT'}
                              {signal.pips ? ` (+${Math.abs(signal.pips)}p)` : ''}
                            </span>
                          </span>
                        ) : isSlHit ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-[#e11d48]/15 text-[#e11d48] font-bold border border-[#e11d48]/40 flex items-center gap-1">
                            <span>
                              🛑 {isAr ? 'ضرب الوقف' : 'SL HIT'}
                              {signal.pips ? ` (-${Math.abs(signal.pips)}p)` : ''}
                            </span>
                          </span>
                        ) : isClosed ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                            <span>⏹ {isAr ? 'منتهية' : 'ENDED'}</span>
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-[2px] font-bold border flex items-center gap-1.5 ${
                              isBuy
                                ? 'bg-[#10b981]/12 text-[#10b981] border-[#10b981]/35'
                                : 'bg-[#e11d48]/12 text-[#e11d48] border-[#e11d48]/35'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                isBuy ? 'bg-[#10b981]' : 'bg-[#e11d48]'
                              }`}
                            />
                            <span>{isAr ? 'نشط' : 'ACTIVE'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Strategy & Timestamp Subheader */}
                    <div className="flex items-center justify-between text-[11px] text-[#8492a6] pb-2 mb-2.5 border-b border-[#1e2633]">
                      <span className="truncate font-medium">{signal.strategy}</span>
                      <span className="font-mono text-[10px] shrink-0 text-[#8492a6]">{signal.timeAgo}</span>
                    </div>

                    {/* Tabular Price Matrix */}
                    <div className="relative mb-2.5">
                      <div
                        className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-center transition-all ${
                          isLocked ? 'filter blur-[5px] select-none opacity-50' : ''
                        }`}
                      >
                        <div className="bg-[#0a0d12] px-2 py-1.5 rounded-[2px] border border-[#1e2633]">
                          <div className="text-[9px] text-[#8492a6] uppercase tracking-wider">ENTRY</div>
                          <div className="text-xs font-bold text-[#edf0f5] tabular-nums" dir="ltr">
                            {signal.entryPrice.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-[#0a0d12] px-2 py-1.5 rounded-[2px] border border-[#1e2633]">
                          <div className="text-[9px] text-[#e11d48] uppercase tracking-wider">STOP</div>
                          <div className="text-xs font-bold text-[#e11d48] tabular-nums" dir="ltr">
                            {signal.sl.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-[#0a0d12] px-2 py-1.5 rounded-[2px] border border-[#1e2633]">
                          <div className="text-[9px] text-[#10b981] uppercase tracking-wider">TARGET 1</div>
                          <div className="text-xs font-bold text-[#10b981] tabular-nums" dir="ltr">
                            {signal.tp1.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-[#0a0d12] px-2 py-1.5 rounded-[2px] border border-[#1e2633]">
                          <div className="text-[9px] text-[#10b981] uppercase tracking-wider">TARGET 2</div>
                          <div className="text-xs font-bold text-[#10b981] tabular-nums" dir="ltr">
                            {signal.tp2.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {isLocked && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0d12]/80 backdrop-blur-[2px] rounded-[2px] p-2 text-center border border-[#1e2633]">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#edf0f5] mb-1">
                            <Lock className="w-3 h-3 text-[#8492a6]" />
                            <span>{isAr ? 'مستويات تنفيذ VIP' : 'VIP Execution Levels'}</span>
                          </div>
                          {onOpenPromoModal && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onOpenPromoModal();
                              }}
                              className="px-2.5 py-1 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] text-[10px] font-semibold transition-colors cursor-pointer"
                            >
                              {isAr ? 'إدخال مفتاح الترخيص' : 'Unlock Desk'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-[#8492a6] leading-relaxed mb-3">
                      {isLocked
                        ? isAr
                          ? 'المستويات الدقيقة مخصصة لحسابات VIP النشطة.'
                          : 'Exact execution parameters reserved for active VIP accounts.'
                        : isAr
                        ? signal.instructionsAr
                        : signal.instructionsEn}
                    </p>
                  </div>

                  {/* Admin 1-Click Status Stamp Controls */}
                  {isRealAdmin && (
                    <div className="relative z-30 mb-2 pt-2 border-t border-[#1e2633]/80 flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono text-[#8492a6]">
                        {isAr ? 'تحديد النتيجة:' : 'Mark Status:'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickUpdateSignalStatus(signal, 'TP_HIT')}
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            isTpHit
                              ? 'bg-[#10b981] text-[#06080c] border-[#10b981]'
                              : 'bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981] border-[#10b981]/40'
                          }`}
                        >
                          🎯 TP Hit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickUpdateSignalStatus(signal, 'SL_HIT')}
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            isSlHit
                              ? 'bg-[#e11d48] text-white border-[#e11d48]'
                              : 'bg-[#e11d48]/15 hover:bg-[#e11d48]/30 text-[#e11d48] border-[#e11d48]/40'
                          }`}
                        >
                          🛑 SL Hit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickUpdateSignalStatus(signal, 'CLOSED')}
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            isClosed
                              ? 'bg-amber-400 text-[#06080c] border-amber-400'
                              : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          ⏹ {isAr ? 'إنهاء' : 'Ended'}
                        </button>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleQuickUpdateSignalStatus(signal, 'RUNNING')}
                            className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] transition-all cursor-pointer"
                          >
                            ⚡ {isAr ? 'إعادة تنشيط' : 'Set Active'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Ticket Footer Actions */}
                  <div className="relative z-30 pt-2 border-t border-[#1e2633] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onSelectSymbol(signal.symbol as MarketSymbol);
                        }}
                        className="py-1 px-2.5 rounded-[2px] bg-[#0a0d12] hover:bg-[#161c26] border border-[#1e2633] text-[11px] font-medium text-[#edf0f5] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{isAr ? 'الشارت' : 'Open Chart'}</span>
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
                                status: signal.status,
                                isBot: signal.channel === 'bot'
                              })
                            }
                            className="py-1 px-2 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] font-medium transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <Edit3 className="w-3 h-3" />
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
                            className="py-1 px-2 rounded-[2px] bg-[#161c26] hover:bg-[#e11d48]/20 text-[#8492a6] hover:text-[#e11d48] border border-[#1e2633] font-medium transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        </>
                      )}
                    </div>

                    {isLocked && onOpenPromoModal && (
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          onOpenPromoModal();
                        }}
                        className="py-1 px-2.5 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#8492a6] hover:text-[#edf0f5] border border-[#2a3446] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? 'تفعيل VIP' : 'Unlock'}</span>
                      </button>
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

                <div>
                  <label className="text-[#787b86] block mb-1">
                    {isAr ? 'حالة الصفقة (Status):' : 'Trade Status:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => setEditSigStatus('RUNNING')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        isTradeActiveStatus(editSigStatus)
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-[#131722] text-[#787b86] border-[#2a2e39]'
                      }`}
                    >
                      ⚡ ACTIVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSigStatus('TP_HIT')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        isTradeTpHitStatus(editSigStatus)
                          ? 'bg-[#10b981] text-[#06080c] border-[#10b981]'
                          : 'bg-[#131722] text-[#10b981] border-[#2a2e39]'
                      }`}
                    >
                      🎯 TP HIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSigStatus('SL_HIT')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        isTradeSlHitStatus(editSigStatus)
                          ? 'bg-[#e11d48] text-white border-[#e11d48]'
                          : 'bg-[#131722] text-[#e11d48] border-[#2a2e39]'
                      }`}
                    >
                      🛑 SL HIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSigStatus('CLOSED')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        isTradeClosedStatus(editSigStatus)
                          ? 'bg-amber-400 text-[#06080c] border-amber-400'
                          : 'bg-[#131722] text-amber-300 border-[#2a2e39]'
                      }`}
                    >
                      ⏹ ENDED
                    </button>
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
