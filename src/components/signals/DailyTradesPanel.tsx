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
import { DailyTrade, UserProfile } from '../../types/trading';
import { soundManager } from '../../utils/audio';
import { useSignalsContext } from '../../context/SignalsContext';
import { hasFeatureAccess } from '../../utils/entitlements';
import { OperationType, reportFirestoreError } from '../../utils/firestoreError';

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
  const { trades: contextTrades, loading: contextLoading, dbError, setDbError, addToast } = useSignalsContext();

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
  const isRealAdmin = Boolean(isAdmin || user?.isAdmin || ['ADMIN', 'ANALYSER', 'ANALYST'].includes(roleUpper));
  const hasVipSignalsAccess = user
    ? hasFeatureAccess(user, 'vipSignals')
    : Boolean(isVIP || isRealAdmin || ['VIP', 'ELITE', 'MODERATOR'].includes(roleUpper));
  const hasBotSignalsAccess = user
    ? hasFeatureAccess(user, 'botSignals')
    : Boolean(isVIP || isRealAdmin || ['VIP', 'ELITE', 'MODERATOR'].includes(roleUpper));

  const handleCopyLevels = (trade: DailyTrade) => {
    soundManager.playClick();
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

  // Admin Delete Modal State
  const [pendingDeleteTrade, setPendingDeleteTrade] = useState<{
    trade: DailyTrade;
    targetCollection: 'signals' | 'bot_alerts';
  } | null>(null);
  const [deletingTrade, setDeletingTrade] = useState(false);
  const [deleteTradeError, setDeleteTradeError] = useState<string | null>(null);
  const [wipingBots, setWipingBots] = useState(false);

  const handleWipeAllBotSignals = async () => {
    if (!isRealAdmin) return;
    soundManager.playClick();
    if (
      !window.confirm(
        isAr
          ? 'هل أنت متأكد من حذف وتفريغ جميع تنبيهات وبوت الـ Webhook من قاعدة البيانات نهائياً؟'
          : 'Are you sure you want to permanently wipe all bot server signals?'
      )
    ) {
      return;
    }

    setWipingBots(true);
    try {
      const snap = await getDocs(collection(db, 'bot_alerts'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      soundManager.playSuccess();
      addToast({
        title: isAr ? 'تم تفريغ وحذف تنبيهات البوت' : 'Bot Signals Wiped',
        message: isAr ? 'تم مسح جميع تنبيهات الـ Webhook بنجاح.' : 'All bot webhook alerts successfully cleared.',
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
      await deleteDoc(doc(db, targetCollection, cleanId));
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
          text: editNotes,
          symbol: editSymbol,
          action: editAction
        });
      } else {
        await updateDoc(doc(db, 'signals', cleanId), {
          symbol: editSymbol,
          action: editAction,
          entryPrice: Number(editEntry || 0),
          sl: Number(editSl || 0),
          tp1: Number(editTp1 || 0),
          tp2: Number(editTp2 || 0),
          notesAr: editNotes,
          notesEn: editNotes,
          instructionsAr: editNotes,
          instructionsEn: editNotes,
          textMsg: editNotes
        });
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

        <div className="flex items-center gap-1.5">
          {isRealAdmin && (
            <button
              type="button"
              disabled={wipingBots}
              onClick={handleWipeAllBotSignals}
              className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
              title={isAr ? 'حذف وتفريغ جميع تنبيهات البوت' : 'Wipe all bot signals'}
            >
              {wipingBots ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span>{isAr ? 'تفريغ البوت' : 'Wipe Bots'}</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 400);
            }}
            disabled={refreshing}
            className="p-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#089981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* RAW FIRESTORE DB ERROR ALERT BANNER */}
      {dbError && (
        <div className="p-2.5 rounded-xl bg-rose-500/20 border-2 border-rose-500 text-rose-200 text-xs space-y-1 font-mono shrink-0">
          <div className="flex items-center justify-between font-bold text-rose-300 text-[11px]">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>[FIRESTORE ERROR]</span>
            </div>
            <button
              onClick={() => setDbError(null)}
              className="p-0.5 rounded hover:bg-rose-500/30 text-rose-300 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] leading-relaxed break-words bg-black/50 p-2 rounded border border-rose-500/40 text-rose-100 font-mono select-all select-text">
            {dbError}
          </p>
        </div>
      )}

      {/* 2. FILTER PILLS */}
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
          <p>{isAr ? 'لا توجد إشارات مباشرة حالياً' : 'No live alerts yet'}</p>
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
            const isRunning = trade.status === 'RUNNING';
            const isWin = trade.pips > 0;
            const isExpanded = expandedId === trade.id;

            return (
              <div
                key={trade.id}
                className="rounded-lg border bg-[#1e222d] border-[#2a2e39] hover:border-[#363a45] p-2 space-y-1.5 transition-all text-xs"
              >
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

                <div className="relative rounded overflow-hidden">
                  {shouldBlur && (
                    <div className="absolute inset-0 z-10 backdrop-blur-md bg-[#131722]/85 flex items-center justify-between px-2.5 py-1">
                      <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? 'مستويات VIP' : 'VIP Signal'}</span>
                      </div>
                      <button
                        onClick={() => onOpenPromoModal && onOpenPromoModal()}
                        className="px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold cursor-pointer hover:brightness-110"
                      >
                        {isAr ? 'تفعيل VIP' : 'Activate VIP'}
                      </button>
                    </div>
                  )}

                  {trade.entryPrice > 0 ? (
                    <div
                      className={`grid grid-cols-3 gap-1 bg-[#131722] p-1.5 rounded text-center font-mono ${
                        shouldBlur ? 'filter blur-[4px] select-none pointer-events-none' : ''
                      }`}
                    >
                      <div>
                        <span className="text-[8px] text-[#787b86] block font-sans">
                          {isAr ? 'الدخول' : 'ENTRY'}
                        </span>
                        <span className="font-bold text-white text-[11px]">{trade.entryPrice}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#f23645] block font-sans">
                          {isAr ? 'الوقف SL' : 'SL'}
                        </span>
                        <span className="font-bold text-[#f23645] text-[11px]">{trade.sl}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-[#089981] block font-sans">
                          {isAr ? 'الهدف TP' : 'TP'}
                        </span>
                        <span className="font-bold text-[#089981] text-[11px]">{trade.tp1}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`bg-[#131722] p-2 rounded border border-purple-500/30 text-purple-200 text-[11px] font-mono leading-relaxed space-y-1 ${
                        shouldBlur ? 'filter blur-[4px] select-none pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1 text-purple-400 font-bold text-[10px]">
                        <Bot className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إشعار آلي / تنبيه' : 'Bot Notice'}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-white/90 text-[10.5px]">
                        {trade.textMsg || trade.notesAr || (isAr ? 'تنبيه آلي مباشر' : 'Direct bot alert')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible details & Verified Admin-only Edit/Delete */}
                <div className="flex items-center justify-between text-[10px] text-[#787b86] pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                      className="p-0.5 text-[#787b86] hover:text-white transition-colors cursor-pointer"
                      title={isAr ? 'تفاصيل الإشارة' : 'Signal Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isRealAdmin && (
                      <div className="flex items-center gap-1 border-s border-[#2a2e39] ps-1.5 ms-1">
                        <button
                          onClick={() => openEditModal(trade)}
                          className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold transition-all cursor-pointer flex items-center gap-0.5 text-[9px]"
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
                          className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold transition-all cursor-pointer flex items-center gap-0.5 text-[9px]"
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
                      className="hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[9px]"
                      title={isAr ? 'نسخ' : 'Copy'}
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{copiedId === trade.id ? (isAr ? 'تم' : 'Copied') : isAr ? 'نسخ' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-2 rounded bg-[#131722] border border-[#2a2e39] text-[10px] space-y-1.5 animate-fade-in">
                    <div className="flex justify-between text-[#d1d4dc]">
                      <span className="text-[#787b86]">{isAr ? 'الإستراتيجية:' : 'Strategy:'}</span>
                      <span className="font-semibold">{trade.strategy}</span>
                    </div>
                    {trade.tp2 && (
                      <div className="flex justify-between text-[#d1d4dc]">
                        <span className="text-[#089981]">{isAr ? 'الهدف الثاني (TP2):' : 'Take Profit 2:'}</span>
                        <span className="font-mono font-bold text-[#089981]">{trade.tp2}</span>
                      </div>
                    )}
                    {trade.tp3 && (
                      <div className="flex justify-between text-[#d1d4dc]">
                        <span className="text-[#089981]">{isAr ? 'الهدف الثالث (TP3):' : 'Take Profit 3:'}</span>
                        <span className="font-mono font-bold text-[#089981]">{trade.tp3}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#d1d4dc]">
                      <span className="text-[#787b86]">{isAr ? 'التوقيت:' : 'Time:'}</span>
                      <span>{trade.openTime}</span>
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
              <div className="px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] font-mono text-white font-bold flex items-center justify-between">
                <span>
                  {pendingDeleteTrade.trade.action} {pendingDeleteTrade.trade.symbol}
                </span>
                <span className="text-[10px] text-[#787b86]">{pendingDeleteTrade.targetCollection}</span>
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
