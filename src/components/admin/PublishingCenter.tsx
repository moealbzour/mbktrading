import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Send,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Radio,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Layers,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FileText,
  Activity,
  Zap,
  Clock,
  Eye,
  Sliders,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/audio';
import { MarketSymbol, DailyTrade } from '../../types/trading';
import { useSignalsContext } from '../../context/SignalsContext';

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
  const { setDbError } = useSignalsContext();
  const isAr = lang === 'ar';
  const roleUpper = (currentUserRole || '').toUpperCase();
  const isAuthorized = roleUpper === 'ADMIN' || roleUpper === 'ANALYSER';

  const [activeTab, setActiveTab] = useState<'signals' | 'analysis' | 'manage'>('signals');
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

  // Auto recalibrate prices when symbol or action changes
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

  // Submit Signal Handler: Direct write to Firestore + POST to /api/signals
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
    } catch (err) {
      console.warn('[PublishingCenter] soundManager playClick error:', err);
    }

    try {
      const isVip = accessLevel === 'vip';
      const payload = {
        symbol,
        action,
        orderType: action,
        entry: numEntry,
        entryPrice: numEntry,
        tp1: numTp1,
        tp2: numTp2 || numTp1 * 1.01,
        sl: numSl,
        stopLoss: numSl,
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
        openTime: 'الآن',
        duration: 'الآن',
        channel: isVip ? 'vip' : 'free',
        isBlurredForFree: isVip,
        timestampMs: Date.now()
      };

      // 1. Write directly to Firestore 'signals' collection via Client SDK so all listeners update instantly
      try {
        await addDoc(collection(db, 'signals'), payload);
        console.log('[PublishingCenter] Signal saved directly to Firestore signals collection');
      } catch (fsErr: any) {
        console.error('[PublishingCenter ERROR] Firestore direct signal write failed:', fsErr);
        const msg = fsErr?.message || String(fsErr);
        setDbError(`[Publish Signal Error]: ${msg}`);
        if (fsErr && fsErr.message) {
          console.error('[PublishingCenter ERROR Message]:', fsErr.message);
        }
      }

      // 2. Also send POST request to backend API to save permanently into store
      try {
        const res = await fetch('/api/signals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[PublishingCenter ERROR] Backend /api/signals responded with status:', res.status, errorData);
        }
      } catch (apiErr: any) {
        console.error('[PublishingCenter ERROR] Fetch /api/signals failed:', apiErr);
      }

      try {
        soundManager.playProfitChime();
      } catch (err) {
        console.warn('[PublishingCenter] playProfitChime notice:', err);
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      showFeedback(
        'success',
        isAr
          ? `تم حفظ الإشارة بنجاح في قاعدة بيانات فايربيس (Firestore) وبثها لجميع المستخدمين (${accessLevel === 'vip' ? 'صفقة VIP حصرية' : 'صفقة عامة'})!`
          : `Signal saved to Firestore and streamed live (${accessLevel.toUpperCase()})!`
      );

      // Refresh published list
      fetchPublishedSignals();
    } catch (err: any) {
      console.error('[PublishingCenter ERROR] Error publishing signal:', err);
      if (err && err.message) {
        console.error('[PublishingCenter ERROR Message]:', err.message);
      }
      showFeedback('error', err.message || (isAr ? 'فشل حفظ ونشر الصفقة' : 'Failed to publish trade'));
    } finally {
      setIsPublishingSignal(false);
    }
  };

  // ================= ANALYSIS FORM STATE =================
  const [analysisTitleAr, setAnalysisTitleAr] = useState('');
  const [analysisTitleEn, setAnalysisTitleEn] = useState('');
  const [analysisSymbol, setAnalysisSymbol] = useState<string>('US100');
  const [analysisSentiment, setAnalysisSentiment] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');
  const [analysisTargetPrice, setAnalysisTargetPrice] = useState<string>('');
  const [analysisStopLevel, setAnalysisStopLevel] = useState<string>('');
  const [analysisContentAr, setAnalysisContentAr] = useState('');
  const [analysisContentEn, setAnalysisContentEn] = useState('');
  const [analysisChartUrl, setAnalysisChartUrl] = useState('');
  const [analysisAccessLevel, setAnalysisAccessLevel] = useState<'free' | 'vip'>('free');
  const [isPublishingAnalysis, setIsPublishingAnalysis] = useState(false);

  const handlePublishAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      showFeedback('error', isAr ? 'غير مصرح لك بنشر التحليلات' : 'Unauthorized');
      return;
    }

    if (!analysisTitleAr && !analysisTitleEn) {
      showFeedback('error', isAr ? 'عنوان التحليل مطلوب' : 'Title is required');
      return;
    }
    if (!analysisContentAr && !analysisContentEn) {
      showFeedback('error', isAr ? 'محتوى التحليل مطلوب' : 'Content is required');
      return;
    }

    setIsPublishingAnalysis(true);
    soundManager.playClick();

    try {
      const payload = {
        title: analysisTitleEn || analysisTitleAr,
        titleAr: analysisTitleAr || analysisTitleEn,
        symbol: analysisSymbol,
        author: currentUserName || 'MBK Head Analyst',
        authorRole: roleUpper,
        content: analysisContentEn || analysisContentAr,
        contentAr: analysisContentAr || analysisContentEn,
        sentiment: analysisSentiment,
        targetPrice: analysisTargetPrice ? parseFloat(analysisTargetPrice) : null,
        stopLevel: analysisStopLevel ? parseFloat(analysisStopLevel) : null,
        chartUrl: analysisChartUrl,
        accessLevel: analysisAccessLevel
      };

      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error');
      }

      soundManager.playSignalPing();
      showFeedback('success', isAr ? 'تم نشر التحليل الفني بنجاح وحفظه في قاعدة البيانات!' : 'Analysis published successfully!');

      setAnalysisTitleAr('');
      setAnalysisTitleEn('');
      setAnalysisContentAr('');
      setAnalysisContentEn('');
      setAnalysisTargetPrice('');
      setAnalysisStopLevel('');
    } catch (err: any) {
      showFeedback('error', err.message || 'Error publishing analysis');
    } finally {
      setIsPublishingAnalysis(false);
    }
  };

  // ================= MANAGE ACTIVE SIGNALS =================
  const [publishedSignals, setPublishedSignals] = useState<any[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);

  const fetchPublishedSignals = async () => {
    try {
      setSignalsLoading(true);
      const res = await fetch('/api/signals');
      if (res.ok) {
        const data = await res.json();
        setPublishedSignals(data.signals || data.trades || []);
      }
    } catch (err) {
      console.warn('Error fetching signals:', err);
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedSignals();
  }, []);

  const handleDeleteSignal = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الإشارة من قاعدة البيانات؟' : 'Delete this signal from database?')) return;
    try {
      soundManager.playClick();
      const res = await fetch(`/api/signals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPublishedSignals(prev => prev.filter(s => s.id !== id));
        showFeedback('info', isAr ? 'تم حذف الإشارة بنجاح' : 'Signal deleted');
      }
    } catch (err) {
      showFeedback('error', isAr ? 'فشل حذف الإشارة' : 'Failed to delete');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, pips?: number) => {
    try {
      soundManager.playClick();
      const res = await fetch(`/api/signals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, pips })
      });
      if (res.ok) {
        setPublishedSignals(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, pips: pips !== undefined ? pips : s.pips } : s));
        showFeedback('success', isAr ? `تم تحديث حالة الصفقة إلى ${newStatus}` : `Status updated to ${newStatus}`);
      }
    } catch (err) {
      showFeedback('error', isAr ? 'فشل تحديث الحالة' : 'Failed to update status');
    }
  };

  return (
    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. HEADER BAR */}
      <div className="p-4 bg-[#131722]/80 backdrop-blur-md border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#089981]/20 to-blue-500/20 border border-[#089981]/40 flex items-center justify-center text-[#089981]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {isAr ? 'مركز النشر والتحليل المباشر' : 'Publishing & Analysis Center'}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                roleUpper === 'ADMIN'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {roleUpper === 'ADMIN' ? 'ADMIN' : 'ANALYSER'}
              </span>
            </div>
            <p className="text-xs text-[#787b86]">
              {isAr
                ? 'نشر إشارات التداول والتقارير وحفظها تلقائياً في SQLite وبثها فوراً'
                : 'Publish trade signals and analysis directly to SQLite & live sockets'}
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
                activeTab === 'signals'
                  ? 'bg-[#089981] text-white shadow-md'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isAr ? 'نشر صفقة' : 'Signal Form'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('analysis');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analysis'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'نشر تقرير' : 'Analysis Form'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('manage');
                fetchPublishedSignals();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-[#2a2e39] text-white shadow-md'
                  : 'text-[#787b86] hover:text-white'
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
        <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-semibold animate-in fade-in ${
          feedback.type === 'success'
            ? 'bg-[#089981]/20 text-[#089981] border-b border-[#089981]/30'
            : feedback.type === 'error'
            ? 'bg-[#f23645]/20 text-[#f23645] border-b border-[#f23645]/30'
            : 'bg-blue-500/20 text-blue-400 border-b border-blue-500/30'
        }`}>
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
              : 'Permission Notice: Only ADMIN and ANALYSER accounts can draft and publish signals to the SQLite database.'}
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
              {/* Asset Symbol selection */}
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

              {/* Order Action (BUY / SELL) */}
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

            {/* STRICT VISIBILITY & ACCESS LEVEL TOGGLE (Free vs VIP) */}
            <div className="bg-[#131722] p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    {isAr ? 'مستوى الوصول والظهور (Strict Visibility Toggle):' : 'Access Level & Visibility:'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#787b86]">
                  {accessLevel === 'vip' ? (isAr ? 'مشوش للمستخدمين العاديين' : 'Blurred for Free Users') : (isAr ? 'مرئي للجميع' : 'Visible to All')}
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
                      {isAr ? 'مرئية بالكامل وبدون تشويش لجميع المتداولين والزوار في لوحة الصفقات.' : 'Visible with full levels to all standard and VIP members.'}
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
                      {isAr ? 'مشوشة ومحجوبة تلقائياً للمستخدمين العاديين، ومفتوحة حصراً للمشتركين والمشرفين.' : 'Strictly blurred for standard accounts; requires VIP access.'}
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
                {/* R:R badge */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[#787b86]">{isAr ? 'العائد/المخاطرة:' : 'R:R:'}</span>
                  <span className="text-[#089981] font-bold">1:{calculatedRR}</span>
                  <span className="text-[#787b86]">|</span>
                  <span className="text-[#089981] font-bold">+{projectedPips} {isAr ? 'نقطة' : 'pips'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Entry */}
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

                {/* SL */}
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

                {/* TP1 */}
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

                {/* TP2 */}
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

            {/* Action Buttons: Save to SQLite + Live Socket Broadcast */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isPublishingSignal || !isAuthorized}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#089981] to-[#067a67] hover:brightness-110 text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isPublishingSignal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري الحفظ في SQLite والبث...' : 'Saving to Database & Broadcasting...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isAr
                        ? `حفظ الإشارة ونشرها فوراً (${accessLevel.toUpperCase()})`
                        : `Save & Broadcast Signal (${accessLevel.toUpperCase()})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MARKET ANALYSIS FORM */}
        {activeTab === 'analysis' && (
          <form onSubmit={handlePublishAnalysis} className="max-w-4xl mx-auto space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'عنوان التقرير (بالعربية):' : 'Analysis Title (Arabic):'}
                </label>
                <input
                  type="text"
                  value={analysisTitleAr}
                  onChange={(e) => setAnalysisTitleAr(e.target.value)}
                  placeholder="مثال: تحليل سيولة الذهب وتوقعات خطاب الفيدرالي"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'Title (English):' : 'Title (English):'}
                </label>
                <input
                  type="text"
                  value={analysisTitleEn}
                  onChange={(e) => setAnalysisTitleEn(e.target.value)}
                  placeholder="e.g. Gold Liquidity & Fed Guidance Outlook"
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'الأصل المالي:' : 'Symbol:'}
                </label>
                <input
                  type="text"
                  value={analysisSymbol}
                  onChange={(e) => setAnalysisSymbol(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs font-bold uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'المعنويات العامة:' : 'Sentiment:'}
                </label>
                <select
                  value={analysisSentiment}
                  onChange={(e) => setAnalysisSentiment(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="BULLISH">صاعد (BULLISH)</option>
                  <option value="BEARISH">هابط (BEARISH)</option>
                  <option value="NEUTRAL">محايد (NEUTRAL)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'السعر المستهدف (Target):' : 'Target Price:'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={analysisTargetPrice}
                  onChange={(e) => setAnalysisTargetPrice(e.target.value)}
                  placeholder="2720.0"
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                  {isAr ? 'مستوى النفاذ (Access):' : 'Access Level:'}
                </label>
                <select
                  value={analysisAccessLevel}
                  onChange={(e) => setAnalysisAccessLevel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="free">عام ومجاني (Free)</option>
                  <option value="vip">حصري لـ VIP (VIP Only)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#d1d4dc] block mb-1">
                {isAr ? 'المحتوى والتحليل الفني المؤسسي التفصيلي:' : 'Detailed Technical Analysis Content:'}
              </label>
              <textarea
                rows={5}
                value={analysisContentAr}
                onChange={(e) => setAnalysisContentAr(e.target.value)}
                required
                className="w-full p-3 rounded-xl bg-[#131722] border border-[#2a2e39] text-white text-xs focus:outline-none focus:border-blue-500"
                placeholder="اكتب التقرير التحليلي بالتفصيل شاملاً مناطق السيولة، اتجاه الفائدة، والهيكل الفني..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPublishingAnalysis || !isAuthorized}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isPublishingAnalysis ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري الحفظ في SQLite...' : 'Saving to Database...'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{isAr ? 'نشر التقرير وحفظه في SQLite' : 'Publish Report & Save'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: MANAGE ACTIVE SIGNALS TABLE */}
        {activeTab === 'manage' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'الصفقات المخزنة في قاعدة بيانات SQLite' : 'Signals Stored in SQLite Database'}</span>
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
                {isAr ? 'لا توجد صفقات منشورة حالياً في قاعدة البيانات.' : 'No published signals found in database.'}
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
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isBuy
                                  ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                                  : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
                              }`}>
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
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sig.status === 'RUNNING'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : sig.status?.includes('TP')
                                  ? 'bg-[#089981]/20 text-[#089981]'
                                  : 'bg-[#f23645]/20 text-[#f23645]'
                              }`}>
                                {sig.status}
                              </span>
                              <span className="text-white font-bold font-mono text-[11px]">
                                {sig.pips >= 0 ? `+${sig.pips}p` : `${sig.pips}p`}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-[#787b86] text-[11px] font-sans">
                            {sig.author || 'Analyst'}
                          </td>

                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {sig.status === 'RUNNING' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(sig.id, 'TP_HIT', sig.pips > 0 ? sig.pips : 150)}
                                    className="px-2 py-1 rounded bg-[#089981]/20 hover:bg-[#089981]/30 text-[#089981] text-[10px] font-bold transition-all cursor-pointer"
                                    title={isAr ? 'تسجيل تحقيق الهدف' : 'Mark TP Hit'}
                                  >
                                    🎯 TP Hit
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(sig.id, 'SL_HIT', -Math.abs(sig.pips || 50))}
                                    className="px-2 py-1 rounded bg-[#f23645]/20 hover:bg-[#f23645]/30 text-[#f23645] text-[10px] font-bold transition-all cursor-pointer"
                                    title={isAr ? 'تسجيل ضرب الوقف' : 'Mark SL Hit'}
                                  >
                                    🛑 SL Hit
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteSignal(sig.id)}
                                className="p-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors cursor-pointer"
                                title={isAr ? 'حذف من قاعدة البيانات' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
