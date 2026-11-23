import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { isDocumentDeleted, markDocumentDeleted } from '../../utils/legacyDbRecovery';
import { emitBackgroundNotificationPulse } from '../../utils/mobileNotifications';
import {
  Send,
  ShieldAlert,
  Crown,
  Radio,
  TrendingUp,
  TrendingDown,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Activity,
  Zap,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/audio';
import { MarketSymbol, DailyTradeStatus } from '../../types/trading';
import {
  useSignalsContext,
  isTradeActiveStatus,
  isTradeTpHitStatus,
  isTradeSlHitStatus,
  isTradeClosedStatus,
  getTradeStatusLabelAr
} from '../../context/SignalsContext';

interface Props {
  currentUserRole?: string;
  currentUserName?: string;
  lang?: 'ar' | 'en';
  onClose?: () => void;
}

export const PublishingCenter: React.FC<Props> = ({
  currentUserRole = 'ADMIN',
  currentUserName = 'MBK Chief Analyst',
  lang = 'ar',
  onClose
}) => {
  const { setDbError, removeSignalLocally, updateSignalStatusLocally } = useSignalsContext();
  const isAr = lang === 'ar';
  const roleUpper = (currentUserRole || '').toUpperCase();
  const isAuthorized = roleUpper === 'ADMIN' || roleUpper === 'ANALYSER' || roleUpper === 'ANALYST';

  const [activeTab, setActiveTab] = useState<'signals' | 'manage'>('signals');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ================= SIGNAL FORM STATE =================
  const [symbol, setSymbol] = useState<MarketSymbol>('US100');
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('20875.00');
  const [tp1, setTp1] = useState<string>('20950.00');
  const [tp2, setTp2] = useState<string>('21040.00');
  const [sl, setSl] = useState<string>('20810.00');
  const [strategy, setStrategy] = useState<string>('MBK Scalp Breakout & FVG');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [accessLevel, setAccessLevel] = useState<'free' | 'vip'>('vip');
  const [confidence, setConfidence] = useState<number>(94);
  const [notesAr, setNotesAr] = useState<string>(
    'كسر فني لسيولة القمة وإعادة اختبار خط الفوليوم اللحظي VWAP مع إغلاق شمعة زخم واضحة.'
  );
  const [notesEn, setNotesEn] = useState<string>(
    'Technical breakout above key order block with volume confirmation and favorable R:R.'
  );
  const [isPublishingSignal, setIsPublishingSignal] = useState(false);

  // Auto recalibrate default template prices when switching symbol or action
  const handleSymbolSelect = (sym: MarketSymbol) => {
    setSymbol(sym);
    if (sym === 'XAUUSD') {
      setEntryPrice('2682.00');
      setTp1(action === 'BUY' ? '2690.00' : '2674.00');
      setTp2(action === 'BUY' ? '2698.50' : '2665.00');
      setSl(action === 'BUY' ? '2674.00' : '2690.00');
    } else if (sym === 'US100') {
      setEntryPrice('20875.00');
      setTp1(action === 'BUY' ? '20950.00' : '20800.00');
      setTp2(action === 'BUY' ? '21040.00' : '20720.00');
      setSl(action === 'BUY' ? '20810.00' : '20940.00');
    } else if (sym === 'EURUSD') {
      setEntryPrice('1.08450');
      setTp1(action === 'BUY' ? '1.08800' : '1.08100');
      setTp2(action === 'BUY' ? '1.09200' : '1.07750');
      setSl(action === 'BUY' ? '1.08150' : '1.08750');
    } else if (sym === 'BTCUSD') {
      setEntryPrice('67400.00');
      setTp1(action === 'BUY' ? '68500.00' : '66300.00');
      setTp2(action === 'BUY' ? '70000.00' : '65000.00');
      setSl(action === 'BUY' ? '66400.00' : '68400.00');
    }
  };

  const handleActionToggle = (act: 'BUY' | 'SELL') => {
    setAction(act);
    const entry = parseFloat(entryPrice) || 20850;
    const delta = symbol === 'EURUSD' ? 0.0035 : symbol === 'XAUUSD' ? 10 : 70;
    const digits = symbol === 'EURUSD' ? 5 : 2;

    if (act === 'BUY') {
      setTp1((entry + delta).toFixed(digits));
      setTp2((entry + delta * 1.8).toFixed(digits));
      setSl((entry - delta * 0.7).toFixed(digits));
    } else {
      setTp1((entry - delta).toFixed(digits));
      setTp2((entry - delta * 1.8).toFixed(digits));
      setSl((entry + delta * 0.7).toFixed(digits));
    }
  };

  // Calculate stats
  const numEntry = parseFloat(entryPrice) || 0;
  const numTp1 = parseFloat(tp1) || 0;
  const numTp2 = parseFloat(tp2) || 0;
  const numSl = parseFloat(sl) || 0;
  const riskDist = Math.abs(numEntry - numSl);
  const rewardDist = Math.abs((numTp2 || numTp1) - numEntry);
  const calculatedRR = riskDist > 0 ? (rewardDist / riskDist).toFixed(1) : '2.4';
  const isGold = symbol === 'XAUUSD';
  const isForex = symbol === 'EURUSD' || symbol === 'GBPUSD';
  const diffPips = Math.abs(numTp1 - numEntry);
  const projectedPips = isGold
    ? Math.round(diffPips * 10)
    : isForex
    ? Math.round(diffPips * 10000)
    : Math.round(diffPips);

  // ================= MANAGE ACTIVE SIGNALS =================
  const [publishedSignals, setPublishedSignals] = useState<any[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPublishedSignals = async () => {
    try {
      setSignalsLoading(true);
      const q = query(collection(db, 'signals'), orderBy('timestampMs', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const items: any[] = snapshot.docs
        .filter((docSnap) => !isDocumentDeleted(docSnap.id))
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

      items.sort((a, b) => (Number(b.timestampMs) || 0) - (Number(a.timestampMs) || 0));
      setPublishedSignals(items);
    } catch (err) {
      console.warn('Error fetching Firestore signals:', err);
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedSignals();
  }, []);

  // Single authoritative Firestore write to eliminate duplicate signals
  const handlePublishSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      showFeedback('error', isAr ? 'غير مصرح لك بالنشر. يتطلب حساب مشرف أو محلل معتمد.' : 'Unauthorized to publish.');
      return;
    }

    if (!numEntry || !numTp1 || !numSl) {
      showFeedback('error', isAr ? 'يرجى ملء جميع المستويات السعرية (الدخول، الهدف، والوقف).' : 'Please fill all price levels.');
      return;
    }

    setIsPublishingSignal(true);
    try {
      soundManager.playClick();
    } catch {
      // ignore audio warning
    }

    try {
      const isVip = accessLevel === 'vip';
      const nowMs = Date.now();
      const nameAr = isGold
        ? 'الذهب أونصة'
        : symbol === 'US100'
        ? 'ناسداك 100'
        : isForex
        ? 'اليورو دولار'
        : symbol === 'BTCUSD'
        ? 'البيتكوين'
        : symbol;

      const payload = {
        symbol,
        nameAr,
        action,
        orderType: action,
        type: action,
        source: isVip ? 'VIP_MANUAL' : 'FREE_PUBLIC',
        sourceLabelAr: isVip ? 'محلل VIP المعتمد' : 'تحليل عام',
        sourceLabelEn: isVip ? 'VIP Certified Analyst' : 'Public Research',
        entry: numEntry,
        entryPrice: numEntry,
        currentPrice: numEntry,
        tp1: numTp1,
        tp2: numTp2 || Number((numTp1 * 1.01).toFixed(isForex ? 5 : 2)),
        sl: numSl,
        stopLoss: numSl,
        pips: projectedPips,
        riskReward: `1:${calculatedRR}`,
        strategy,
        timeframe,
        access_level: accessLevel,
        accessLevel,
        confidence,
        notesAr,
        notesEn,
        instructionsAr: notesAr,
        instructionsEn: notesEn,
        author: currentUserName || (roleUpper === 'ADMIN' ? 'MBK Chief Admin' : 'MBK Senior Analyser'),
        authorRole: roleUpper,
        status: 'RUNNING',
        statusLabelAr: 'صفقة جارية الآن ⚡',
        openTime: new Date(nowMs).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        duration: 'الآن',
        channel: isVip ? 'vip' : 'free',
        isBlurredForFree: isVip,
        isBotSignal: false,
        createdAt: new Date(nowMs).toISOString(),
        timestampMs: nowMs
      };

      const docRef = await addDoc(collection(db, 'signals'), payload);
      setDbError(null);

      emitBackgroundNotificationPulse({
        title: `${action === 'BUY' ? '🟢 شراء' : '🔴 بيع'} ${symbol} (${isVip ? 'VIP' : 'عام'}) — صفقة جديدة`,
        body: `الدخول: ${numEntry} | الهدف 1: ${numTp1} | الوقف: ${numSl}`,
        tag: `mbk-signal-${docRef.id}`,
        excludeUid: auth.currentUser?.uid || undefined
      });

      try {
        soundManager.playProfitChime();
      } catch {
        // ignore audio warning
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      showFeedback(
        'success',
        isAr
          ? `تم نشر الإشارة وحفظها في Firestore (${accessLevel === 'vip' ? 'صفقة VIP حصرية' : 'صفقة عامة'})!`
          : `Signal saved to Firestore and streamed live (${accessLevel.toUpperCase()})!`
      );

      fetchPublishedSignals();
    } catch (err: any) {
      console.error('[PublishingCenter ERROR] Firestore signal write failed:', err);
      const msg = err?.message || String(err);
      setDbError(`[Publish Signal Error]: ${msg}`);
      showFeedback('error', msg || (isAr ? 'فشل حفظ ونشر الصفقة' : 'Failed to publish trade'));
    } finally {
      setIsPublishingSignal(false);
    }
  };

  const handleDeleteSignal = async (id: string) => {
    try {
      soundManager.playClick();
      markDocumentDeleted(id);
      removeSignalLocally(id);
      await deleteDoc(doc(db, 'signals', id)).catch(() => {});
      await deleteDoc(doc(db, 'bot_alerts', id)).catch(() => {});
      setPublishedSignals((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      showFeedback('info', isAr ? 'تم حذف الإشارة من قاعدة البيانات بنجاح' : 'Signal deleted from Firestore');
    } catch (err: any) {
      console.error('[PublishingCenter] Delete signal failed:', err);
      showFeedback('error', err?.message || (isAr ? 'فشل حذف الإشارة' : 'Failed to delete'));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: DailyTradeStatus, pips?: number) => {
    try {
      soundManager.playClick();
      const statusLabelAr = getTradeStatusLabelAr(newStatus);
      const updatePayload: Record<string, any> = {
        status: newStatus,
        statusLabelAr
      };
      if (pips !== undefined) {
        updatePayload.pips = pips;
      }
      // Optimistically update SignalsContext so Trades & Signals tabs update immediately
      updateSignalStatusLocally(id, newStatus, pips);
      setPublishedSignals((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: newStatus, statusLabelAr, pips: pips !== undefined ? pips : s.pips }
            : s
        )
      );
      await updateDoc(doc(db, 'signals', id), updatePayload);
      showFeedback('success', isAr ? `تم تحديث حالة الصفقة إلى ${statusLabelAr}` : `Status updated to ${newStatus}`);
    } catch (err: any) {
      console.error('[PublishingCenter] Status update failed:', err);
      showFeedback('error', err?.message || (isAr ? 'فشل تحديث الحالة' : 'Failed to update status'));
    }
  };

  return (
    <div
      className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. HEADER BAR */}
      <div className="p-4 bg-[#131722]/80 backdrop-blur-md border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#089981]/20 to-blue-500/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {isAr ? 'مركز النشر وإدارة الصفقات المباشرة' : 'Signal Publishing Center'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  roleUpper === 'ADMIN'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {roleUpper === 'ADMIN' ? 'ADMIN' : 'ANALYSER'}
              </span>
            </div>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'نشر وإدارة إشارات التداول مباشرة عبر Firebase Firestore وبثها لحظياً لجميع المتداولين'
                : 'Publish and manage live trade signals directly through Firebase Firestore'}
            </p>
          </div>
        </div>

        {/* Tab Switcher & Close button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('signals');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'signals' ? 'bg-[#089981] text-white shadow-md' : 'text-[#787b86] hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isAr ? 'نشر صفقة' : 'Publish Signal'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('manage');
                fetchPublishedSignals();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manage' ? 'bg-[#2a2e39] text-white shadow-md' : 'text-[#787b86] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isAr ? 'إدارة الصفقات' : 'Manage'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                {publishedSignals.length}
              </span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer border border-[#2a2e39]"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. FEEDBACK NOTIFICATION BANNER */}
      {feedback && (
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-[#089981]/20 text-[#089981] border-b border-[#089981]/30'
              : feedback.type === 'error'
              ? 'bg-[#f23645]/20 text-[#f23645] border-b border-[#f23645]/30'
              : 'bg-blue-500/20 text-blue-400 border-b border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. ACCESS PERMISSION WARNING IF NOT AUTHORIZED */}
      {!isAuthorized && (
        <div className="p-4 m-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p>
            {isAr
              ? 'تنبيه صلاحيات: حسابك الحالي ليس مخصصاً للنشر. يحق فقط لحسابات المشرفين (ADMIN) والمحللين المعتمدين (ANALYSER) نشر الإشارات وحفظها.'
              : 'Permission Notice: Only ADMIN and ANALYSER accounts can draft and publish signals to Firestore.'}
          </p>
        </div>
      )}

      {/* 4. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: SIGNAL PUBLISHING FORM */}
        {activeTab === 'signals' && (
          <form onSubmit={handlePublishSignal} className="max-w-4xl mx-auto space-y-5">
            {/* Asset Symbol & Action Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#131722] p-3.5 rounded-xl border border-[#2a2e39] space-y-2">
                <label className="text-xs font-bold text-[#d1d4dc] block">
                  {isAr ? 'الأصل المالي المستهدف:' : 'Target Asset Symbol:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD', 'WTI', 'GBPUSD'] as MarketSymbol[]).map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSymbolSelect(sym)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        symbol === sym
                          ? 'bg-[#089981] text-white shadow-md ring-1 ring-[#089981]/60'
                          : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#131722] p-3.5 rounded-xl border border-[#2a2e39] space-y-2">
                <label className="text-xs font-bold text-[#d1d4dc] block">
                  {isAr ? 'نوع الأمر والاتجاه:' : 'Order Action:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleActionToggle('BUY')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      action === 'BUY'
                        ? 'bg-[#089981] text-white shadow-lg ring-2 ring-[#089981]/50'
                        : 'bg-[#1e222d] text-[#089981] border border-[#089981]/30 hover:bg-[#089981]/15'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{isAr ? 'شراء (BUY)' : 'BUY (Long)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActionToggle('SELL')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      action === 'SELL'
                        ? 'bg-[#f23645] text-white shadow-lg ring-2 ring-[#f23645]/50'
                        : 'bg-[#1e222d] text-[#f23645] border border-[#f23645]/30 hover:bg-[#f23645]/15'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>{isAr ? 'بيع (SELL)' : 'SELL (Short)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISIBILITY & ACCESS LEVEL TOGGLE (Free vs VIP) */}
            <div className="bg-[#131722] p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    {isAr ? 'مستوى الوصول والظهور:' : 'Access Level & Visibility:'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#787b86]">
                  {accessLevel === 'vip'
                    ? isAr
                      ? 'مشوش للمستخدمين المجانيين'
                      : 'Blurred for Free Users'
                    : isAr
                    ? 'مرئي للجميع'
                    : 'Visible to All'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAccessLevel('free');
                  }}
                  className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex items-start gap-3 ${
                    accessLevel === 'free'
                      ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/50'
                      : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-white'
                  }`}
                >
                  <Radio className={`w-5 h-5 shrink-0 mt-0.5 ${accessLevel === 'free' ? 'text-blue-400' : 'text-[#787b86]'}`} />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-blue-400">
                      <span>{isAr ? 'عامة ومجانية (Free)' : 'Public & Free'}</span>
                      {accessLevel === 'free' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[11px] text-[#787b86] mt-0.5">
                      {isAr
                        ? 'مرئية بالكامل وبدون تشويش لجميع المتداولين في لوحة الصفقات.'
                        : 'Visible with full levels to all standard and VIP members.'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAccessLevel('vip');
                  }}
                  className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex items-start gap-3 ${
                    accessLevel === 'vip'
                      ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50'
                      : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-white'
                  }`}
                >
                  <Crown className={`w-5 h-5 shrink-0 mt-0.5 ${accessLevel === 'vip' ? 'text-amber-400' : 'text-[#787b86]'}`} />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                      <span>{isAr ? 'حصرية لـ VIP (VIP Only)' : 'VIP Exclusive'}</span>
                      {accessLevel === 'vip' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[11px] text-[#787b86] mt-0.5">
                      {isAr
                        ? 'مشوشة ومحجوبة تلقائياً للمستخدمين العاديين، ومفتوحة حصراً للمشتركين والمشرفين.'
                        : 'Blurred for free accounts; requires active VIP access.'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Price Levels (Entry, TP1, TP2, SL) */}
            <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#d1d4dc]">
                  {isAr ? 'المستويات الرقمية للصفقة:' : 'Price Execution Levels:'}
                </span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[#787b86]">{isAr ? 'العائد/المخاطرة:' : 'R:R:'}</span>
                  <span className="text-[#089981] font-bold">1:{calculatedRR}</span>
                  <span className="text-[#787b86]">|</span>
                  <span className="text-[#089981] font-bold">
                    +{projectedPips} {isAr ? 'نقطة' : 'pips'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-[#787b86] block mb-1">
                    {isAr ? 'نقطة الدخول (Entry):' : 'Entry Price:'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-white font-mono text-xs font-bold focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#f23645] block mb-1">
                    {isAr ? 'وقف الخسارة (SL):' : 'Stop Loss (SL):'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#1e222d] border border-[#f23645]/40 text-[#f23645] font-mono text-xs font-bold focus:outline-none focus:border-[#f23645]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#089981] block mb-1">
                    {isAr ? 'الهدف الأول (TP 1):' : 'Take Profit 1:'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tp1}
                    onChange={(e) => setTp1(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#1e222d] border border-[#089981]/40 text-[#089981] font-mono text-xs font-bold focus:outline-none focus:border-[#089981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#089981] block mb-1">
                    {isAr ? 'الهدف الثاني (TP 2):' : 'Take Profit 2:'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tp2}
                    onChange={(e) => setTp2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1e222d] border border-[#089981]/20 text-[#089981] font-mono text-xs font-bold focus:outline-none focus:border-[#089981]"
                  />
                </div>
              </div>
            </div>

            {/* Strategy, Timeframe & Confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'اسم الاستراتيجية / النموذج:' : 'Strategy Name:'}
                </label>
                <input
                  type="text"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="MBK Scalp Breakout & FVG"
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs font-medium focus:outline-none focus:border-[#089981]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'الإطار الزمني (Timeframe):' : 'Timeframe:'}
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs font-medium focus:outline-none focus:border-[#089981]"
                >
                  <option value="5m">5 Minutes (5m)</option>
                  <option value="15m">15 Minutes (15m)</option>
                  <option value="30m">30 Minutes (30m)</option>
                  <option value="1h">1 Hour (1h)</option>
                  <option value="4h">4 Hours (4h)</option>
                  <option value="1D">Daily (1D)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? `نسبة الثقة الفنية (${confidence}%):` : `Confidence (${confidence}%):`}
                </label>
                <input
                  type="range"
                  min="80"
                  max="99"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
                  className="w-full accent-[#089981] mt-2 cursor-pointer"
                />
              </div>
            </div>

            {/* Analysis Rationale & Trade Instructions */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'الملاحظات والشروط الفنية للدخول (بالعربية):' : 'Technical Rationale (Arabic):'}
                </label>
                <textarea
                  rows={3}
                  value={notesAr}
                  onChange={(e) => setNotesAr(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-[#089981]"
                  placeholder="اكتب أسباب الدخول وإدارة المخاطر المقترحة..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#787b86] block mb-1">
                  {isAr ? 'Technical Notes (English - Optional):' : 'Technical Notes (English):'}
                </label>
                <textarea
                  rows={2}
                  value={notesEn}
                  onChange={(e) => setNotesEn(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] text-[#d1d4dc] text-xs focus:outline-none focus:border-[#089981]"
                  placeholder="English technical notes..."
                />
              </div>
            </div>

            {/* Publish Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isPublishingSignal || !isAuthorized}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:brightness-110 text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isPublishingSignal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري النشر إلى Firestore...' : 'Publishing to Firestore...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isAr
                        ? `نشر الإشارة وبثها فوراً (${accessLevel.toUpperCase()})`
                        : `Publish Live Signal (${accessLevel.toUpperCase()})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MANAGE ACTIVE SIGNALS TABLE */}
        {activeTab === 'manage' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'الصفقات المسجلة في Firestore' : 'Live Signals in Firestore'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#089981]/20 text-[#089981] font-mono">
                  {publishedSignals.length}
                </span>
              </h3>
              <button
                onClick={fetchPublishedSignals}
                disabled={signalsLoading}
                className="px-2.5 py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] text-xs text-[#787b86] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${signalsLoading ? 'animate-spin text-[#089981]' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>

            {publishedSignals.length === 0 ? (
              <div className="py-12 text-center text-[#787b86] text-xs">
                {isAr ? 'لا توجد صفقات منشورة حالياً في قاعدة البيانات.' : 'No published signals found in Firestore.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#2a2e39] text-[#787b86] text-[11px]">
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الأصل والنوع' : 'Symbol / Action'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الوصول' : 'Access'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الدخول' : 'Entry'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الأهداف / الوقف' : 'TP / SL'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الحالة والربح' : 'Status / Pips'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'المحلل' : 'Author'}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2e39]/50 font-mono">
                    {publishedSignals.map((sig) => {
                      const isVip = sig.accessLevel === 'vip' || sig.access_level === 'vip';
                      const isBuy = sig.action === 'BUY';

                      return (
                        <tr key={sig.id} className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isBuy
                                    ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                                    : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                                }`}
                              >
                                {sig.action}
                              </span>
                              <span className="font-bold text-white text-xs">{sig.symbol}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {isVip ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                                <Crown className="w-3 h-3" />
                                <span>VIP</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
                                <Radio className="w-3 h-3" />
                                <span>FREE</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-white font-bold">{sig.entryPrice}</td>

                          <td className="py-3 px-3">
                            <div className="text-[11px]">
                              <span className="text-[#089981]">{sig.tp1}</span>
                              <span className="text-[#787b86] mx-1">/</span>
                              <span className="text-[#f23645]">{sig.sl}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isTradeActiveStatus(sig.status)
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isTradeTpHitStatus(sig.status)
                                    ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                                    : isTradeSlHitStatus(sig.status)
                                    ? 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isTradeActiveStatus(sig.status)
                                  ? 'ACTIVE'
                                  : isTradeTpHitStatus(sig.status)
                                  ? '🎯 TP HIT'
                                  : isTradeSlHitStatus(sig.status)
                                  ? '🛑 SL HIT'
                                  : '⏹ ENDED'}
                              </span>
                              <span className="text-white font-bold font-mono text-[11px]">
                                {Number(sig.pips || 0) >= 0 ? `+${Number(sig.pips || 0)}p` : `${Number(sig.pips || 0)}p`}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-[#787b86] text-[11px] font-sans">
                            {sig.author || 'Analyst'}
                          </td>

                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5 font-sans flex-wrap">
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    sig.id,
                                    'TP_HIT',
                                    Math.abs(Number(sig.pips || 0)) > 0 ? Math.abs(Number(sig.pips)) : 150
                                  )
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isTradeTpHitStatus(sig.status)
                                    ? 'bg-[#10b981] text-[#06080c]'
                                    : 'bg-[#089981]/20 hover:bg-[#089981]/30 text-[#089981]'
                                }`}
                                title={isAr ? 'تسجيل تحقيق الهدف' : 'Mark TP Hit'}
                              >
                                🎯 TP Hit
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    sig.id,
                                    'SL_HIT',
                                    -Math.max(Math.abs(Number(sig.pips || 0)), 50)
                                  )
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isTradeSlHitStatus(sig.status)
                                    ? 'bg-[#e11d48] text-white'
                                    : 'bg-[#f23645]/20 hover:bg-[#f23645]/30 text-[#f23645]'
                                }`}
                                title={isAr ? 'تسجيل ضرب الوقف' : 'Mark SL Hit'}
                              >
                                🛑 SL Hit
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(sig.id, 'CLOSED', 0)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isTradeClosedStatus(sig.status)
                                    ? 'bg-amber-400 text-[#06080c]'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                                }`}
                                title={isAr ? 'إنهاء الصفقة' : 'Mark Ended'}
                              >
                                ⏹ Ended
                              </button>
                              {!isTradeActiveStatus(sig.status) && (
                                <button
                                  onClick={() => handleUpdateStatus(sig.id, 'RUNNING', Math.max(0, Number(sig.pips || 0)))}
                                  className="px-2 py-1 rounded bg-[#161c26] hover:bg-[#1c2432] text-white border border-[#2a3446] text-[10px] font-bold transition-all cursor-pointer"
                                  title={isAr ? 'إعادة تنشيط الصفقة' : 'Set Active'}
                                >
                                  ⚡ Active
                                </button>
                              )}

                              {confirmDeleteId === sig.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteSignal(sig.id)}
                                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    {isAr ? 'تأكيد' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded bg-[#131722] text-[#787b86] hover:text-white text-[10px] cursor-pointer"
                                  >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(sig.id)}
                                  className="p-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors cursor-pointer"
                                  title={isAr ? 'حذف من Firestore' : 'Delete from Firestore'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
