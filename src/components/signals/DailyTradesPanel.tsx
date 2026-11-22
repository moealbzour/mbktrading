import React, { useState } from 'react';
import {
  Lock,
  Bot,
  Crown,
  Radio,
  Activity,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Layers,
  AlertTriangle,
  X,
  Trash2,
  Edit3
} from 'lucide-react';
import { doc, deleteDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { DailyTrade, DailyTradeStatus, UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import {
  useSignalsContext,
  isTradeActiveStatus,
  isTradeTpHitStatus,
  isTradeSlHitStatus,
  isTradeClosedStatus,
  getTradeStatusLabelAr
} from '../../context/SignalsContext';
import { hasFeatureAccess } from '../../utils/entitlements';
import { OperationType, reportFirestoreError } from '../../utils/firestoreError';
import { markDocumentDeleted } from '../../utils/legacyDbRecovery';

interface Props {
  user?: UserProfile | null;
  isVIP: boolean;
  userRole?: string;
  isAdmin?: boolean;
  onOpenPromoModal?: () => void;
  onOpenPlansModal?: () => void;
  lang?: 'ar' | 'en';
  isCompact?: boolean;
  activeSignals?: DailyTrade[];
  trades?: DailyTrade[];
  loading?: boolean;
  activeChannel?: 'free' | 'vip' | 'bot';
}

export const DailyTradesPanel: React.FC<Props> = ({
  user,
  isVIP,
  userRole,
  isAdmin = false,
  onOpenPromoModal,
  lang = 'ar',
  trades: tradesProp,
  loading: loadingProp
}) => {
  const isAr = lang === 'ar';
  const {
    trades: contextTrades,
    loading: contextLoading,
    dbError,
    setDbError,
    addToast,
    removeSignalLocally,
    updateSignalStatusLocally
  } = useSignalsContext();

  const rawTrades = tradesProp && tradesProp.length > 0 ? tradesProp : contextTrades;
  const loading = loadingProp !== undefined ? loadingProp : contextLoading;

  // Sort chronologically (newest first) and cap feed to latest 30 signals
  const sortedTrades = [...rawTrades].sort((a, b) => {
    const timeA = a.timestampMs || 0;
    const timeB = b.timestampMs || 0;
    return timeB - timeA;
  });

  const liveFeed = sortedTrades.slice(0, 30);

  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BOT_WEBHOOK' | 'VIP_MANUAL' | 'FREE_PUBLIC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'CLOSED'>('ALL');

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

  const handleCopyLevels = (trade: DailyTrade) => {
    soundManager.playClick();
    const isBot = trade.source === 'BOT_WEBHOOK' || Boolean(trade.isBotSignal);
    if (isBot) {
      const rawText = (trade.textMsg || trade.notesAr || '').trim();
      navigator.clipboard.writeText(rawText);
      setCopiedId(trade.id);
      setTimeout(() => setCopiedId(null), 2000);
      return;
    }

    let text = `${trade.symbol} ${trade.action}`;
    if (trade.entryPrice > 0) {
      text += `\nEntry: ${trade.entryPrice}\nSL: ${trade.sl}\nTP1: ${trade.tp1}`;
      if (trade.tp2) text += `\nTP2: ${trade.tp2}`;
      if (trade.tp3) text += `\nTP3: ${trade.tp3}`;
    }
    if (trade.textMsg) text += `\n\n${trade.textMsg}`;
    navigator.clipboard.writeText(text.trim());
    setCopiedId(trade.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Admin Edit State
  const [editingTrade, setEditingTrade] = useState<DailyTrade | null>(null);
  const [editEntry, setEditEntry] = useState('');
  const [editSl, setEditSl] = useState('');
  const [editTp1, setEditTp1] = useState('');
  const [editTp2, setEditTp2] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSymbol, setEditSymbol] = useState('US100');
  const [editAction, setEditAction] = useState<'BUY' | 'SELL'>('BUY');
  const [editStatus, setEditStatus] = useState<DailyTradeStatus>('RUNNING');

  // Admin Delete Modal State
  const [pendingDeleteTrade, setPendingDeleteTrade] = useState<{
    trade: DailyTrade;
    targetCollection: 'signals' | 'bot_alerts';
  } | null>(null);
  const [deletingTrade, setDeletingTrade] = useState(false);
  const [deleteTradeError, setDeleteTradeError] = useState<string | null>(null);
  const [wipingBots, setWipingBots] = useState(false);
  const [confirmWipeBots, setConfirmWipeBots] = useState(false);

  const handleWipeAllBotSignals = async () => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    if (!confirmWipeBots) {
      setConfirmWipeBots(true);
      return;
    }

    setConfirmWipeBots(false);
    setWipingBots(true);
    try {
      const snap = await getDocs(collection(db, 'bot_alerts'));
      const docs = snap.docs;
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          markDocumentDeleted(d.id);
          removeSignalLocally(d.id);
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      soundManager.playSuccess();
      addToast({
        title: isAr ? 'تم تفريغ تنبيهات البوت' : 'MBK Bot Wiped',
        message: isAr
          ? `تم مسح جميع تنبيهات بوت MBK (${docs.length}) بنجاح.`
          : `All MBK Bot alerts (${docs.length}) cleared.`,
        type: 'bot',
        timestamp: isAr ? 'الآن' : 'Now'
      });
    } catch (err: any) {
      setDbError(`[Wipe Bot Alerts Error]: ${err?.message || err}`);
    } finally {
      setWipingBots(false);
    }
  };

  const handleDeleteTrade = (trade: DailyTrade) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    const isBotDoc = Boolean(
      trade.isBotSignal || trade.id.startsWith('bot-') || trade.source === 'BOT_WEBHOOK'
    );
    const targetCollection: 'signals' | 'bot_alerts' =
      trade.originCollection || (isBotDoc ? 'bot_alerts' : 'signals');
    setDeleteTradeError(null);
    setPendingDeleteTrade({ trade, targetCollection });
  };

  const handleConfirmDeleteTrade = async () => {
    if (!pendingDeleteTrade || !isRealAdmin || deletingTrade) return;
    const { trade, targetCollection } = pendingDeleteTrade;
    const cleanId = trade.id.replace(/^bot-/, '');

    if (!auth.currentUser) {
      const msg = isAr
        ? 'جلسة تسجيل الدخول غير نشطة في Firebase. يرجى إعادة تسجيل الدخول ثم المحاولة مجدداً.'
        : 'Firebase auth session is not active. Please sign in again and retry.';
      setDeleteTradeError(msg);
      return;
    }

    setDeletingTrade(true);
    setDeleteTradeError(null);
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
          ? `تمت إزالة ${trade.action} ${trade.symbol} نهائياً.`
          : `${trade.action} ${trade.symbol} permanently deleted.`,
        type: targetCollection === 'bot_alerts' ? 'bot' : 'signal',
        timestamp: isAr ? 'الآن' : 'Now'
      });
      setPendingDeleteTrade(null);
    } catch (err: any) {
      const { message } = reportFirestoreError(
        err,
        OperationType.DELETE,
        `${targetCollection}/${cleanId}`
      );
      setDeleteTradeError(message);
      setDbError(`[Delete Error]: ${message}`);
    } finally {
      setDeletingTrade(false);
    }
  };

  const openEditModal = (trade: DailyTrade) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    setEditingTrade(trade);
    setEditEntry(String(trade.entryPrice || ''));
    setEditSl(String(trade.sl || ''));
    setEditTp1(String(trade.tp1 || ''));
    setEditTp2(String(trade.tp2 || ''));
    setEditNotes(trade.textMsg || trade.notesAr || '');
    setEditSymbol(trade.symbol || 'US100');
    setEditAction(trade.action || 'BUY');
    setEditStatus(trade.status || 'RUNNING');
  };

  const handleQuickUpdateTradeStatus = async (
    trade: DailyTrade,
    newStatus: DailyTradeStatus
  ) => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    const cleanId = trade.id.replace(/^bot-/, '');
    const statusLabelAr = getTradeStatusLabelAr(newStatus);

    let nextPips = Number(trade.pips || 0);
    if (isTradeTpHitStatus(newStatus)) {
      const diff = Math.abs((trade.tp1 || 0) - (trade.entryPrice || 0));
      const calcPips = trade.symbol === 'EURUSD' || trade.symbol === 'GBPUSD'
        ? Math.round(diff * 10000)
        : Math.round(diff * 10);
      nextPips = Math.abs(nextPips) > 0 ? Math.abs(nextPips) : Math.max(calcPips, 100);
    } else if (isTradeSlHitStatus(newStatus)) {
      const diff = Math.abs((trade.entryPrice || 0) - (trade.sl || 0));
      const calcPips = trade.symbol === 'EURUSD' || trade.symbol === 'GBPUSD'
        ? Math.round(diff * 10000)
        : Math.round(diff * 10);
      nextPips = -Math.max(Math.abs(nextPips) > 0 ? Math.abs(nextPips) : calcPips, 40);
    } else if (isTradeClosedStatus(newStatus) || isTradeActiveStatus(newStatus)) {
      nextPips = isTradeActiveStatus(newStatus) ? Math.max(0, nextPips) : nextPips;
    }

    // Immediate optimistic local update across Trades & Signals tabs
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
        message: `${trade.symbol} (${trade.action}) → ${isAr ? statusLabelAr : newStatus}`,
        type: 'signal',
        symbol: trade.symbol,
        action: trade.action,
        timestamp: isAr ? 'الآن' : 'Now'
      });
    } catch (err: any) {
      const { message } = reportFirestoreError(err, OperationType.UPDATE, `signals/${cleanId}`);
      setDbError(`[Status Update Error]: ${message}`);
    }
  };

  const handleSaveEditTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade || !isRealAdmin) return;

    try {
      const cleanId = editingTrade.id.replace(/^bot-/, '');
      const isBot = Boolean(
        editingTrade.isBotSignal ||
          editingTrade.id.startsWith('bot-') ||
          editingTrade.source === 'BOT_WEBHOOK'
      );

      if (isBot) {
        await updateDoc(doc(db, 'bot_alerts', cleanId), {
          text: editNotes
        });
      } else {
        const statusLabelAr = getTradeStatusLabelAr(editStatus);
        updateSignalStatusLocally(cleanId, editStatus);
        const updatePayload = {
          symbol: editSymbol,
          action: editAction,
          entryPrice: Number(editEntry || 0),
          sl: Number(editSl || 0),
          tp1: Number(editTp1 || 0),
          tp2: Number(editTp2 || 0),
          status: editStatus,
          statusLabelAr,
          notesAr: editNotes,
          notesEn: editNotes,
          instructionsAr: editNotes,
          instructionsEn: editNotes,
          textMsg: editNotes
        };
        await updateDoc(doc(db, 'signals', cleanId), updatePayload);
      }

      soundManager.playProfitChime();
      setEditingTrade(null);
    } catch (err: any) {
      const cleanId = editingTrade.id.replace(/^bot-/, '');
      const isBot = Boolean(
        editingTrade.originCollection === 'bot_alerts' ||
          (!editingTrade.originCollection &&
            (editingTrade.isBotSignal ||
              editingTrade.id.startsWith('bot-') ||
              editingTrade.source === 'BOT_WEBHOOK'))
      );
      const { message } = reportFirestoreError(
        err,
        OperationType.UPDATE,
        `${isBot ? 'bot_alerts' : 'signals'}/${cleanId}`
      );
      setDbError(`[Edit Error]: ${message}`);
    }
  };

  const displayedTrades = liveFeed.filter((t) => {
    if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;
    const active = isTradeActiveStatus(t.status);
    if (statusFilter === 'RUNNING' && !active) return false;
    if (statusFilter === 'CLOSED' && active) return false;
    return true;
  });

  return (
    <div className="space-y-2" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP COMPACT BAR */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2633]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#edf0f5]">
            {isAr ? 'تدفق الإشارات المباشر' : 'LIVE ORDER STREAM'}
          </h3>
          <span className="text-[10px] text-[#8492a6] font-mono">[{displayedTrades.length}]</span>
        </div>

        <div className="flex items-center gap-1">
          {isRealAdmin && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={wipingBots}
                onClick={handleWipeAllBotSignals}
                className={`px-2 py-0.5 rounded-[2px] border text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50 ${
                  confirmWipeBots
                    ? 'bg-[#e11d48] text-white border-[#e11d48]'
                    : 'bg-[#161c26] hover:bg-[#e11d48]/15 border-[#1e2633] text-[#8492a6] hover:text-[#e11d48]'
                }`}
                title={isAr ? 'حذف وتفريغ جميع تنبيهات البوت' : 'Wipe all bot signals'}
              >
                {wipingBots ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                <span>
                  {confirmWipeBots
                    ? isAr
                      ? 'تأكيد؟'
                      : 'Confirm?'
                    : isAr
                    ? 'تفريغ البوت'
                    : 'Clear Algo'}
                </span>
              </button>
              {confirmWipeBots && (
                <button
                  type="button"
                  onClick={() => setConfirmWipeBots(false)}
                  className="p-0.5 rounded-[2px] bg-[#161c26] text-[#edf0f5] hover:bg-[#1c2432] border border-[#1e2633] text-[10px] cursor-pointer"
                  title={isAr ? 'إلغاء' : 'Cancel'}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 400);
            }}
            disabled={refreshing}
            className="p-1 rounded-[2px] bg-[#10141c] hover:bg-[#161c26] border border-[#1e2633] text-[#8492a6] hover:text-[#edf0f5] transition-colors cursor-pointer"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#10b981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* RAW FIRESTORE DB ERROR ALERT BANNER */}
      {dbError && (
        <div className="p-2 rounded-[3px] bg-[#e11d48]/15 border border-[#e11d48] text-rose-200 text-xs space-y-1 font-mono shrink-0">
          <div className="flex items-center justify-between font-bold text-rose-300 text-[10px]">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
              <span>[FIRESTORE ERROR]</span>
            </div>
            <button
              onClick={() => setDbError(null)}
              className="p-0.5 rounded-[2px] hover:bg-[#e11d48]/30 text-rose-300 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] leading-relaxed break-words bg-[#0a0d12] p-1.5 rounded-[2px] border border-[#e11d48]/40 text-rose-100 font-mono select-all">
            {dbError}
          </p>
        </div>
      )}

      {/* 2. MONOCHROME INSTITUTIONAL FILTER BAR */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-mono">
        <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633]">
          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('ALL');
            }}
            className={`px-2 py-0.5 rounded-[2px] font-semibold cursor-pointer transition-colors ${
              sourceFilter === 'ALL'
                ? 'bg-[#1c2432] text-[#edf0f5] border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            {isAr ? 'الكل' : 'ALL'}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('BOT_WEBHOOK');
            }}
            className={`px-2 py-0.5 rounded-[2px] font-semibold cursor-pointer transition-colors ${
              sourceFilter === 'BOT_WEBHOOK'
                ? 'bg-[#1c2432] text-[#edf0f5] border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            {isAr ? 'بوت' : 'ALGO'}
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('VIP_MANUAL');
            }}
            className={`px-2 py-0.5 rounded-[2px] font-semibold cursor-pointer transition-colors ${
              sourceFilter === 'VIP_MANUAL'
                ? 'bg-[#1c2432] text-[#edf0f5] border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            VIP
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setSourceFilter('FREE_PUBLIC');
            }}
            className={`px-2 py-0.5 rounded-[2px] font-semibold cursor-pointer transition-colors ${
              sourceFilter === 'FREE_PUBLIC'
                ? 'bg-[#1c2432] text-[#edf0f5] border border-[#2a3446]'
                : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
          >
            {isAr ? 'عام' : 'PUBLIC'}
          </button>
        </div>

        <div className="flex items-center gap-0.5 bg-[#0a0d12] p-0.5 rounded-[3px] border border-[#1e2633]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors font-semibold ${
              statusFilter === 'ALL' ? 'bg-[#1c2432] text-[#edf0f5]' : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
            title={isAr ? 'جميع الحالات' : 'All Statuses'}
          >
            {isAr ? 'الكل' : 'ALL'}
          </button>
          <button
            onClick={() => setStatusFilter('RUNNING')}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors font-semibold ${
              statusFilter === 'RUNNING' ? 'bg-[#1c2432] text-[#10b981]' : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
            title={isAr ? 'الصفقات النشطة فقط' : 'Live Running Only'}
          >
            {isAr ? 'نشط' : 'ACTIVE'}
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer transition-colors font-semibold ${
              statusFilter === 'CLOSED' ? 'bg-[#1c2432] text-amber-300' : 'text-[#8492a6] hover:text-[#edf0f5]'
            }`}
            title={isAr ? 'الصفقات المنتهية' : 'Ended Trades'}
          >
            {isAr ? 'منتهية' : 'ENDED'}
          </button>
        </div>
      </div>

      {/* 3. COMPACT SIGNALS STREAM LIST */}
      {loading ? (
        <div className="py-8 text-center text-[#8492a6] text-[11px] font-mono">
          <span>{isAr ? 'جاري التحميل...' : 'SYNCHRONIZING...'}</span>
        </div>
      ) : displayedTrades.length === 0 ? (
        <div className="py-6 text-center text-[#8492a6] text-[11px] font-mono bg-[#0a0d12] rounded-[3px] border border-[#1e2633] p-3">
          <p>{isAr ? 'لا توجد إشارات مباشرة حالياً' : 'NO MATCHING ORDERS'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayedTrades.map((trade) => {
            const isBot = trade.source === 'BOT_WEBHOOK' || Boolean(trade.isBotSignal);
            const isVipManual =
              trade.source === 'VIP_MANUAL' ||
              trade.accessLevel === 'vip' ||
              Boolean(trade.isBlurredForFree);
            const shouldBlur = isBot
              ? !hasBotSignalsAccess
              : isVipManual
              ? !hasVipSignalsAccess
              : false;
            const isRunning = isTradeActiveStatus(trade.status);
            const isTpHit = isTradeTpHitStatus(trade.status);
            const isSlHit = isTradeSlHitStatus(trade.status);
            const isClosed = isTradeClosedStatus(trade.status);
            const isEnded = !isBot && !isRunning;
            const isExpanded = expandedId === trade.id;
            const isBuy = trade.action === 'BUY';

            return (
              <div
                key={trade.id}
                className={`rounded-[4px] border p-2.5 space-y-1.5 transition-all text-xs relative overflow-hidden ${
                  isBot
                    ? 'bg-[#10141c] border-[#1e2633] hover:border-[#2a3446]'
                    : isRunning
                    ? isBuy
                      ? 'bg-[#10141c] border-[#10b981]/35 trade-card-active-buy'
                      : 'bg-[#10141c] border-[#e11d48]/35 trade-card-active-sell'
                    : 'bg-[#0b0e14]/90 border-[#1e2633] opacity-60 hover:opacity-90 saturate-[0.75]'
                }`}
              >
                {/* Moving Buy/Sell border around all 4 sides when ACTIVE */}
                {!isBot && isRunning && <div className="trade-perimeter-glow" aria-hidden="true" />}

                {/* Big Angled Stamp Overlay when ENDED (TP HIT / SL HIT / ENDED) */}
                {isEnded && (
                  <div className="absolute inset-0 z-20 pointer-events-none select-none flex items-center justify-center">
                    {isTpHit ? (
                      <div className="-rotate-12 px-3.5 py-1 rounded-[4px] border-2 border-double border-[#10b981] bg-[#06080c]/95 text-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.45)] flex flex-col items-center justify-center">
                        <span className="text-xs sm:text-sm font-black font-mono tracking-widest uppercase leading-none">
                          🎯 TP HIT
                        </span>
                        <span className="text-[9px] font-bold tracking-wider mt-0.5">
                          {isAr ? 'هدف محقق' : 'TARGET HIT'}
                        </span>
                      </div>
                    ) : isSlHit ? (
                      <div className="-rotate-12 px-3.5 py-1 rounded-[4px] border-2 border-double border-[#e11d48] bg-[#06080c]/95 text-[#e11d48] shadow-[0_0_20px_rgba(225,29,72,0.45)] flex flex-col items-center justify-center">
                        <span className="text-xs sm:text-sm font-black font-mono tracking-widest uppercase leading-none">
                          🛑 SL HIT
                        </span>
                        <span className="text-[9px] font-bold tracking-wider mt-0.5">
                          {isAr ? 'ضرب الوقف' : 'STOP LOSS HIT'}
                        </span>
                      </div>
                    ) : (
                      <div className="-rotate-12 px-3.5 py-1 rounded-[4px] border-2 border-double border-amber-400/90 bg-[#06080c]/95 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center">
                        <span className="text-xs sm:text-sm font-black font-mono tracking-widest uppercase leading-none">
                          ⏹ ENDED
                        </span>
                        <span className="text-[9px] font-bold tracking-wider mt-0.5">
                          {isAr ? 'صفقة منتهية' : 'TRADE ENDED'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {isBot ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10b981]" />
                        <span className="text-[11px] font-mono font-semibold text-[#edf0f5]">
                          {isAr ? 'بوت MBK' : 'MBK ALGO'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8492a6] font-mono">{trade.openTime}</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold ${
                            isBuy
                              ? 'bg-[#10b981]/12 text-[#10b981] border border-[#10b981]/30'
                              : 'bg-[#e11d48]/12 text-[#e11d48] border border-[#e11d48]/30'
                          }`}
                        >
                          {trade.action}
                        </span>

                        <span className="font-bold text-[#edf0f5] font-mono text-xs">{trade.symbol}</span>

                        <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.2 bg-[#0a0d12] border border-[#1e2633] text-[#8492a6] rounded-[2px]">
                          {trade.source === 'VIP_MANUAL' ? 'VIP' : 'PUBLIC'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono font-bold text-[10px] tabular-nums">
                        {isTpHit ? (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40">
                            🎯 TP {trade.pips ? `+${Math.abs(trade.pips)}p` : 'HIT'}
                          </span>
                        ) : isSlHit ? (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#e11d48]/15 text-[#e11d48] border border-[#e11d48]/40">
                            🛑 SL {trade.pips ? `-${Math.abs(trade.pips)}p` : 'HIT'}
                          </span>
                        ) : isClosed ? (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-300 border border-amber-500/40">
                            ⏹ {isAr ? 'منتهية' : 'ENDED'}
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] border flex items-center gap-1 ${
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
                    </>
                  )}
                </div>

                <div className="relative rounded-[2px] overflow-hidden">
                  {shouldBlur && (
                    <div className="absolute inset-0 z-10 backdrop-blur-md bg-[#0a0d12]/85 border border-[#1e2633] flex items-center justify-between px-2.5 py-1">
                      <div className="flex items-center gap-1 text-[#edf0f5] text-[10px] font-semibold">
                        <Lock className="w-3 h-3 text-[#8492a6]" />
                        <span>{isAr ? 'مستويات VIP' : 'VIP Execution'}</span>
                      </div>
                      <button
                        onClick={() => onOpenPromoModal && onOpenPromoModal()}
                        className="px-2 py-0.5 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] text-[9px] font-semibold cursor-pointer"
                      >
                        {isAr ? 'تفعيل VIP' : 'Unlock'}
                      </button>
                    </div>
                  )}

                  {!isBot && trade.entryPrice > 0 ? (
                    <div
                      className={`grid grid-cols-3 gap-1 bg-[#0a0d12] p-1.5 rounded-[2px] border border-[#1e2633] text-center font-mono ${
                        shouldBlur ? 'filter blur-[4px] select-none pointer-events-none' : ''
                      }`}
                    >
                      <div>
                        <span className="text-[8px] text-[#8492a6] block uppercase">
                          {isAr ? 'الدخول' : 'ENTRY'}
                        </span>
                        <span className="font-bold text-[#edf0f5] text-[11px] tabular-nums">{trade.entryPrice}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#e11d48] block uppercase">
                          {isAr ? 'الوقف' : 'STOP'}
                        </span>
                        <span className="font-bold text-[#e11d48] text-[11px] tabular-nums">{trade.sl}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#10b981] block uppercase">
                          {isAr ? 'الهدف' : 'TARGET'}
                        </span>
                        <span className="font-bold text-[#10b981] text-[11px] tabular-nums">{trade.tp1}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`bg-[#0a0d12] p-2 rounded-[2px] border border-[#1e2633] text-[#edf0f5] text-[11px] font-mono leading-relaxed text-start dir-ltr ${
                        shouldBlur ? 'filter blur-[4px] select-none pointer-events-none' : ''
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-[#edf0f5] text-[11px]">
                        {trade.textMsg || trade.notesAr || (isAr ? 'تنبيه آلي مباشر' : 'Direct algorithmic alert')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin 1-Click Status Stamp Bar */}
                {isRealAdmin && !isBot && (
                  <div className="relative z-30 pt-1 border-t border-[#1e2633]/80 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-[#8492a6]">
                      {isAr ? 'الحالة:' : 'Status:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickUpdateTradeStatus(trade, 'TP_HIT')}
                        className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                          isTpHit
                            ? 'bg-[#10b981] text-[#06080c] border-[#10b981]'
                            : 'bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981] border-[#10b981]/40'
                        }`}
                      >
                        🎯 TP
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdateTradeStatus(trade, 'SL_HIT')}
                        className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                          isSlHit
                            ? 'bg-[#e11d48] text-white border-[#e11d48]'
                            : 'bg-[#e11d48]/15 hover:bg-[#e11d48]/30 text-[#e11d48] border-[#e11d48]/40'
                        }`}
                      >
                        🛑 SL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickUpdateTradeStatus(trade, 'CLOSED')}
                        className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                          isClosed
                            ? 'bg-amber-400 text-[#06080c] border-amber-400'
                            : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        ⏹ {isAr ? 'إنهاء' : 'End'}
                      </button>
                      {!isRunning && (
                        <button
                          type="button"
                          onClick={() => handleQuickUpdateTradeStatus(trade, 'RUNNING')}
                          className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold bg-[#161c26] hover:bg-[#1c2432] text-[#edf0f5] border border-[#2a3446] transition-all cursor-pointer"
                        >
                          ⚡ {isAr ? 'نشط' : 'Active'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Collapsible details & Verified Admin-only Edit/Delete */}
                <div className="relative z-30 flex items-center justify-between text-[10px] text-[#8492a6] pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                      className="p-0.5 text-[#8492a6] hover:text-[#edf0f5] transition-colors cursor-pointer"
                      title={isAr ? 'تفاصيل الإشارة' : 'Signal Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isRealAdmin && (
                      <div className="flex items-center gap-1 border-s border-[#1e2633] ps-1.5 ms-1">
                        <button
                          onClick={() => openEditModal(trade)}
                          className="px-1.5 py-0.5 rounded-[2px] bg-[#161c26] hover:bg-[#1c2432] text-[#8492a6] hover:text-[#edf0f5] border border-[#1e2633] font-medium transition-colors cursor-pointer flex items-center gap-0.5 text-[9px]"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>{isAr ? 'تعديل' : 'Edit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrade(trade);
                          }}
                          className="px-1.5 py-0.5 rounded-[2px] bg-[#161c26] hover:bg-[#e11d48]/20 text-[#8492a6] hover:text-[#e11d48] border border-[#1e2633] font-medium transition-colors cursor-pointer flex items-center gap-0.5 text-[9px]"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>{isAr ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!shouldBlur && (
                    <button
                      onClick={() => handleCopyLevels(trade)}
                      className="hover:text-[#edf0f5] transition-colors cursor-pointer flex items-center gap-0.5 text-[9px] font-mono"
                      title={isAr ? 'نسخ' : 'Copy'}
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{copiedId === trade.id ? (isAr ? 'تم' : 'COPIED') : isAr ? 'نسخ' : 'COPY'}</span>
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-2 rounded-[2px] bg-[#0a0d12] border border-[#1e2633] text-[10px] space-y-1.5">
                    <div className="flex justify-between text-[#edf0f5]">
                      <span className="text-[#8492a6]">{isAr ? 'الإستراتيجية:' : 'Strategy:'}</span>
                      <span className="font-semibold">{trade.strategy}</span>
                    </div>
                    {trade.tp2 && (
                      <div className="flex justify-between text-[#edf0f5]">
                        <span className="text-[#10b981]">{isAr ? 'الهدف الثاني (TP2):' : 'Target 2:'}</span>
                        <span className="font-mono font-bold text-[#10b981]">{trade.tp2}</span>
                      </div>
                    )}
                    {trade.tp3 && (
                      <div className="flex justify-between text-[#edf0f5]">
                        <span className="text-[#10b981]">{isAr ? 'الهدف الثالث (TP3):' : 'Target 3:'}</span>
                        <span className="font-mono font-bold text-[#10b981]">{trade.tp3}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#edf0f5]">
                      <span className="text-[#8492a6]">{isAr ? 'التوقيت:' : 'Timestamp:'}</span>
                      <span className="font-mono">{trade.openTime}</span>
                    </div>
                    {trade.textMsg && (
                      <div className="pt-1.5 border-t border-[#2a2e39]/80">
                        <span className="text-[#787b86] block text-[9px] mb-0.5">
                          {isAr ? 'نص الإشعار:' : 'Alert Message:'}
                        </span>
                        <p className="text-[#d1d4dc] text-[9.5px] bg-[#1a1e29] p-1.5 rounded border border-[#2a2e39] whitespace-pre-wrap font-mono">
                          {trade.textMsg}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIN EDIT TRADE MODAL */}
      {editingTrade && isRealAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-md p-5 shadow-2xl text-start space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تعديل بيانات الصفقة/التنبيه' : 'Edit Signal / Trade Details'}
                </h3>
              </div>
              <button
                onClick={() => setEditingTrade(null)}
                className="p-1 rounded bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrade} className="space-y-3 text-xs">
              {!(editingTrade.isBotSignal || editingTrade.source === 'BOT_WEBHOOK') && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#787b86] block mb-1">{isAr ? 'الرمز:' : 'Symbol:'}</label>
                      <input
                        type="text"
                        value={editSymbol}
                        onChange={(e) => setEditSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[#787b86] block mb-1">{isAr ? 'النوع:' : 'Action:'}</label>
                      <select
                        value={editAction}
                        onChange={(e) => setEditAction(e.target.value as 'BUY' | 'SELL')}
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
                        value={editEntry}
                        onChange={(e) => setEditEntry(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[#f23645] block mb-1">SL (وقف الخسارة):</label>
                      <input
                        type="number"
                        step="any"
                        value={editSl}
                        onChange={(e) => setEditSl(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#f23645] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[#089981] block mb-1">TP1 (الهدف الأول):</label>
                      <input
                        type="number"
                        step="any"
                        value={editTp1}
                        onChange={(e) => setEditTp1(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-[#089981] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[#089981] block mb-1">TP2 (الهدف الثاني):</label>
                      <input
                        type="number"
                        step="any"
                        value={editTp2}
                        onChange={(e) => setEditTp2(e.target.value)}
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
                        onClick={() => setEditStatus('RUNNING')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          isTradeActiveStatus(editStatus)
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                            : 'bg-[#131722] text-[#787b86] border-[#2a2e39]'
                        }`}
                      >
                        ⚡ ACTIVE
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('TP_HIT')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          isTradeTpHitStatus(editStatus)
                            ? 'bg-[#10b981] text-[#06080c] border-[#10b981]'
                            : 'bg-[#131722] text-[#10b981] border-[#2a2e39]'
                        }`}
                      >
                        🎯 TP HIT
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('SL_HIT')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          isTradeSlHitStatus(editStatus)
                            ? 'bg-[#e11d48] text-white border-[#e11d48]'
                            : 'bg-[#131722] text-[#e11d48] border-[#2a2e39]'
                        }`}
                      >
                        🛑 SL HIT
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('CLOSED')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          isTradeClosedStatus(editStatus)
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
                  {isAr ? 'ملاحظات الصفقة / نص التنبيه:' : 'Trade Notes / Alert Text:'}
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
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

      {/* ADMIN DELETE CONFIRMATION MODAL */}
      {pendingDeleteTrade && isRealAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="bg-[#1e222d] border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-start space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تأكيد حذف الصفقة' : 'Confirm Delete Trade'}
                </h3>
              </div>
              <button
                type="button"
                disabled={deletingTrade}
                onClick={() => {
                  setPendingDeleteTrade(null);
                  setDeleteTradeError(null);
                }}
                className="p-1 rounded bg-[#2a2e39] text-[#787b86] hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[#d1d4dc] leading-relaxed">
                {isAr
                  ? 'هل أنت متأكد من حذف هذه الصفقة/التنبيه نهائياً من قاعدة البيانات؟'
                  : 'Are you sure you want to permanently delete this signal/alert from the database?'}
              </p>
              <div className="px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] font-mono text-white font-bold flex items-center justify-between gap-2">
                <span className="truncate">
                  {pendingDeleteTrade.targetCollection === 'bot_alerts'
                    ? pendingDeleteTrade.trade.textMsg || 'MBK Bot Alert'
                    : `${pendingDeleteTrade.trade.action} ${pendingDeleteTrade.trade.symbol}`}
                </span>
                <span className="text-[10px] text-[#787b86] shrink-0">{pendingDeleteTrade.targetCollection}</span>
              </div>
              {deleteTradeError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-mono break-words">
                  {deleteTradeError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={deletingTrade}
                onClick={() => {
                  setPendingDeleteTrade(null);
                  setDeleteTradeError(null);
                }}
                className="flex-1 py-2 rounded-xl bg-[#2a2e39] text-white text-xs font-bold hover:bg-[#363a45] cursor-pointer disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deletingTrade}
                onClick={handleConfirmDeleteTrade}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deletingTrade
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
