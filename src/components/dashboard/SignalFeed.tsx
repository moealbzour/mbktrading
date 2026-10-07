import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  UserProfile,
  TradeSignal,
  MarketSymbol,
  EngineAlert,
  ManualSignal,
  MarketTicker
} from '../../types/trading';
import {
  Radio,
  Bot,
  User,
  Sparkles,
  Lock,
  Ticket,
  ChevronDown,
  ChevronUp,
  Target,
  Copy,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  PlusCircle,
  Flame,
  Award,
  Layers,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { soundManager } from '../../utils/audio';

// Seed Engine Alerts (TAB 1) if Firestore is initially empty
const SEED_ENGINE_ALERTS: EngineAlert[] = [
  {
    id: 'eng-8850',
    symbol: 'US100',
    action: 'BUY',
    entry: 20875.50,
    tp1: 20950.00,
    tp2: 21020.00,
    sl: 20810.00,
    timeframe: '15m',
    strategyName: 'MBK Precision Scalp Breakout',
    status: 'ACTIVE',
    pips: 74.5,
    confidence: 95,
    createdAt: 'منذ 6 دقائق',
    verifiedWebhook: true
  },
  {
    id: 'eng-8849',
    symbol: 'XAUUSD',
    action: 'BUY',
    entry: 2682.00,
    tp1: 2692.00,
    tp2: 2704.00,
    sl: 2673.00,
    timeframe: '5m',
    strategyName: 'MBK Volume Flow Liquidity Engine',
    status: 'ACTIVE',
    pips: 120.0,
    confidence: 92,
    createdAt: 'منذ 24 دقيقة',
    verifiedWebhook: true
  },
  {
    id: 'eng-8848',
    symbol: 'EURUSD',
    action: 'SELL',
    entry: 1.08450,
    tp1: 1.08180,
    tp2: 1.07920,
    sl: 1.08690,
    timeframe: '1h',
    strategyName: 'MBK OrderBlock & FVG Scanner',
    status: 'TP1_HIT',
    pips: 38.0,
    confidence: 89,
    createdAt: 'منذ ساعة',
    verifiedWebhook: true
  },
  {
    id: 'eng-8847',
    symbol: 'BTCUSD',
    action: 'BUY',
    entry: 67200.00,
    tp1: 68100.00,
    tp2: 69200.00,
    sl: 66400.00,
    timeframe: '15m',
    strategyName: 'MBK Crypto Momentum Impulse',
    status: 'ACTIVE',
    pips: 900.0,
    confidence: 91,
    createdAt: 'منذ ساعتين',
    verifiedWebhook: true
  }
];

// Seed Analyst Signals (TAB 2) if Firestore is initially empty
const SEED_MANUAL_SIGNALS: ManualSignal[] = [
  {
    id: 'man-501',
    symbol: 'US100',
    action: 'BUY',
    entryPrice: 20840.00,
    tp1: 20920.00,
    tp2: 21000.00,
    sl: 20780.00,
    riskLevel: 'Medium',
    riskReward: '1:2.6',
    timeframe: '15m / 1h',
    author: 'فريق أبحاث MBK (Certified Analysts)',
    status: 'ACTIVE',
    pips: 80.0,
    createdAt: 'منذ 15 دقيقة',
    rationale:
      'سحب سيولة قاع لندن الآسيوي (Asia Low Sweep) مع إعادة اختبار منطقة Fair Value Gap الصاعدة على فريم الـ 15 دقيقة. إغلاق إيجابي لشمعة المومنتوم وتدفق سيولة تداول مؤسسية قوية من افتتاح وول ستريت.'
  },
  {
    id: 'man-502',
    symbol: 'XAUUSD',
    action: 'BUY LIMIT',
    entryPrice: 2678.50,
    tp1: 2690.00,
    tp2: 2705.00,
    sl: 2669.00,
    riskLevel: 'Low',
    riskReward: '1:2.8',
    timeframe: '1h',
    author: 'كبير المحللين طارق الحربي',
    status: 'ACTIVE',
    pips: 165.0,
    createdAt: 'منذ 45 دقيقة',
    rationale:
      'أمر شراء معلق عند الحد السفلي لمنطقة الـ Order Block اليومي بالتزامن مع مستوى تصحيح فيبوناتشي 61.8%. الذهب يظهر تماسكاً هيكلياً فوق خط اتجاه رئيسي وندعم الشراء مع وقف خسارة محكم للغاية.'
  },
  {
    id: 'man-503',
    symbol: 'EURUSD',
    action: 'SELL',
    entryPrice: 1.08500,
    tp1: 1.08200,
    tp2: 1.07900,
    sl: 1.08750,
    riskLevel: 'Low',
    riskReward: '1:2.4',
    timeframe: '4h',
    author: 'فريق أبحاث MBK',
    status: 'TP1_HIT',
    pips: 42.0,
    createdAt: 'منذ 3 ساعات',
    rationale:
      'ارتداد الزوج من مقاومة القناة الهابطة الرئيسية بعد بيانات التضخم الأوروبية. تحقّق الهدف الأول (+30 نقطة) وتم نقل وقف الخسارة إلى نقطة الدخول (Breakeven).'
  }
];

interface Props {
  currentUser?: UserProfile | null;
  onSelectSignal?: (signal: TradeSignal) => void;
  onCopySignal?: (signal: TradeSignal) => void;
  onOpenPromoModal: () => void;
  onOpenPostModal?: () => void;
  activeSignalId?: string;
  isAdminModeActive?: boolean;
  onToggleAdminMode?: () => void;
  tickers?: MarketTicker[];
}

export const SignalFeed: React.FC<Props> = ({
  currentUser,
  onSelectSignal,
  onCopySignal,
  onOpenPromoModal,
  onOpenPostModal,
  activeSignalId,
  isAdminModeActive = false,
  onToggleAdminMode,
  tickers = []
}) => {
  const [activeTab, setActiveTab] = useState<'engine' | 'manual'>('engine');
  const [engineAlerts, setEngineAlerts] = useState<EngineAlert[]>(SEED_ENGINE_ALERTS);
  const [manualSignals, setManualSignals] = useState<ManualSignal[]>(SEED_MANUAL_SIGNALS);
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [expandedRationale, setExpandedRationale] = useState<Record<string, boolean>>({
    'man-501': true
  });

  const isVIP = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN';
  const isAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.isAdmin ||
    currentUser?.email?.includes('admin') ||
    isAdminModeActive;

  // Real-time Firestore Listener for TAB 1: `engine_alerts`
  useEffect(() => {
    try {
      const q = query(collection(db, 'engine_alerts'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: EngineAlert[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              list.push({
                id: doc.id,
                symbol: data.symbol || 'US100',
                action: data.action || 'BUY',
                entry: data.entry || data.entryPrice || 0,
                tp1: data.tp1,
                tp2: data.tp2,
                sl: data.sl,
                timeframe: data.timeframe || '15m',
                strategyName: data.strategyName || data.strategy || 'MBK Precision Engine',
                status: data.status || 'ACTIVE',
                pips: data.pips || 50,
                confidence: data.confidence || 93,
                createdAt: data.createdAtFormatted || 'الآن',
                verifiedWebhook: data.verifiedWebhook ?? true
              });
            });
            setEngineAlerts(list);
          }
        },
        (err) => {
          console.warn('Firestore engine_alerts listener fallback:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore engine_alerts init skipped:', e);
    }
  }, []);

  // Real-time Firestore Listener for TAB 2: `manual_signals`
  useEffect(() => {
    try {
      const q = query(collection(db, 'manual_signals'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ManualSignal[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              list.push({
                id: doc.id,
                symbol: data.symbol || 'US100',
                action: data.action || 'BUY',
                entryPrice: data.entryPrice || data.entry || 0,
                tp1: data.tp1 || 0,
                tp2: data.tp2 || 0,
                sl: data.sl || 0,
                riskLevel: data.riskLevel || 'Medium',
                riskReward: data.riskReward || '1:2.4',
                rationale: data.rationale || data.notes || '',
                status: data.status || 'ACTIVE',
                author: data.author || 'فريق أبحاث MBK',
                timeframe: data.timeframe || '15m',
                pips: data.pips || 65,
                createdAt: data.createdAtFormatted || 'الآن'
              });
            });
            setManualSignals(list);
          }
        },
        (err) => {
          console.warn('Firestore manual_signals listener fallback:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore manual_signals init skipped:', e);
    }
  }, []);

  const toggleRationale = (id: string) => {
    soundManager.playClick();
    setExpandedRationale((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Convert an EngineAlert to standard TradeSignal for Chart overlay
  const handleSelectEngineAlert = (alert: EngineAlert) => {
    if (!onSelectSignal) return;
    soundManager.playClick();
    const tradeSig: TradeSignal = {
      id: alert.id,
      symbol: alert.symbol,
      type: alert.action === 'BUY' ? 'BUY' : 'SELL',
      entryPrice: alert.entry,
      tp1: alert.tp1 || +(alert.entry * 1.004).toFixed(2),
      tp2: alert.tp2 || +(alert.entry * 1.008).toFixed(2),
      sl: alert.sl || +(alert.entry * 0.996).toFixed(2),
      currentPrice: alert.entry,
      pips: alert.pips,
      status: alert.status,
      riskReward: '1:2.3',
      timeframe: alert.timeframe,
      confidence: alert.confidence,
      strategyName: alert.strategyName,
      createdAt: alert.createdAt,
      verifiedWebhook: true,
      notesAr: `تنبيه آلي من محرك ${alert.strategyName} على فريم ${alert.timeframe}`,
      channel: 'ENGINE'
    };
    onSelectSignal(tradeSig);
  };

  // Convert a ManualSignal to standard TradeSignal for Chart overlay
  const handleSelectManualSignal = (signal: ManualSignal) => {
    if (!onSelectSignal) return;
    soundManager.playClick();
    const tradeSig: TradeSignal = {
      id: signal.id,
      symbol: signal.symbol,
      type: signal.action.includes('BUY') ? 'BUY' : 'SELL',
      entryPrice: signal.entryPrice,
      tp1: signal.tp1,
      tp2: signal.tp2,
      sl: signal.sl,
      currentPrice: signal.entryPrice,
      pips: signal.pips,
      status: signal.status,
      riskReward: signal.riskReward,
      timeframe: signal.timeframe || '15m',
      confidence: 96,
      strategyName: `تحليل فني يدوي (${signal.author})`,
      createdAt: signal.createdAt,
      verifiedWebhook: false,
      notesAr: signal.rationale,
      channel: 'MANUAL',
      riskLevel: signal.riskLevel,
      author: signal.author
    };
    onSelectSignal(tradeSig);
  };

  // Filter lists
  const filteredEngineAlerts = engineAlerts.filter(
    (a) => filterSymbol === 'ALL' || a.symbol === filterSymbol
  );
  const filteredManualSignals = manualSignals.filter(
    (s) => filterSymbol === 'ALL' || s.symbol === filterSymbol
  );

  return (
    <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-['Cairo',sans-serif]">
      {/* 1. TOP HEADER & CHANNEL SWITCHER */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d131f] via-[#101726] to-[#0d131f] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-100">
              قنوات الإشارات والتوصيات المباشرة (Signal Channels)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            تنبيهات المحرك الخوارزمي الآلي اللحظية + التوصيات والتحليلات الفنية المعتمدة
          </p>
        </div>

        {/* Right side: Admin Action & Mode Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admin Mode Quick Switcher */}
          {onToggleAdminMode && (
            <button
              onClick={onToggleAdminMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="تبديل وضع المحلل / الإدارة"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'وضع المحلل: مفعّل 👑' : 'وضع الزائر'}</span>
            </button>
          )}

          {/* "+ إضافة توصية جديدة" (Visible only to Admin or when Admin mode is active) */}
          {isAdmin && onOpenPostModal && (
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenPostModal();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ إضافة توصية جديدة (نشر يدوي)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DUAL-TAB TOGGLE BAR & FILTER CHIPS */}
      <div className="px-4 py-3 bg-[#080d16] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Dual Tab Buttons */}
        <div className="flex items-center bg-[#0e1626] p-1 rounded-xl border border-slate-800 shadow-inner">
          {/* TAB 1: Engine Alerts */}
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('engine');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'engine'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>🤖 تنبيهات المحرك الآلي (Engine Alerts)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/30 text-cyan-200">
              {filteredEngineAlerts.length}
            </span>
          </button>

          {/* TAB 2: Analyst Signals */}
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('manual');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>👤 التوصيات اليدوية (Analyst Signals)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-400/30 text-amber-950 font-bold">
              {filteredManualSignals.length}
            </span>
          </button>
        </div>

        {/* Symbol Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {['ALL', 'US100', 'XAUUSD', 'EURUSD', 'BTCUSD'].map((sym) => {
            const isSelected = filterSymbol === sym;
            return (
              <button
                key={sym}
                onClick={() => {
                  soundManager.playClick();
                  setFilterSymbol(sym);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-700 text-slate-100 border border-slate-600'
                    : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="p-4 sm:p-5 space-y-3.5 bg-[#0b0f17]">
        {/* ============================================================ */}
        {/* TAB 1: 🤖 "تنبيهات المحرك الآلي" (Engine Alerts) */}
        {/* ============================================================ */}
        {activeTab === 'engine' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-400 font-mono font-bold">بث خوارزمي متصل (Pine Script Webhooks)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Firestore collection: engine_alerts
              </span>
            </div>

            {filteredEngineAlerts.length === 0 ? (
              <div className="p-8 text-center bg-[#0e1422] rounded-xl border border-slate-800 text-slate-400 text-xs">
                لا توجد تنبيهات آلية نشطة لهذا الرمز حالياً.
              </div>
            ) : (
              filteredEngineAlerts.map((alert, idx) => {
                const isLocked = !isVIP && idx > 0;
                const isBuy = alert.action === 'BUY';
                const isSelected = activeSignalId === alert.id;

                return (
                  <div
                    key={alert.id}
                    onClick={() => !isLocked && handleSelectEngineAlert(alert)}
                    className={`border rounded-xl p-3.5 sm:p-4 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                      isLocked
                        ? 'bg-[#101626] border-slate-800 select-none opacity-85'
                        : isSelected
                        ? 'bg-[#142033] border-cyan-500 shadow-[0_0_25px_rgba(0,229,255,0.25)] ring-1 ring-cyan-500/50'
                        : 'bg-[#121929] border-slate-800/90 hover:border-cyan-500/40 hover:shadow-lg'
                    }`}
                  >
                    {/* Free user blur lock overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-[#090d16]/85 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center p-3 text-center">
                        <Lock className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-xs font-black text-slate-100 mb-0.5">
                          تنبيه خوارزمي لحظي خاص بأعضاء VIP
                        </span>
                        <p className="text-[11px] text-slate-400 max-w-sm mb-2">
                          أدخل رمز الترويج لفك قفل جميع تنبيهات المحرك الآلي فور صدورها.
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPromoModal();
                          }}
                          className="px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow cursor-pointer flex items-center gap-1"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>تفعيل VIP بالرمز</span>
                        </button>
                      </div>
                    )}

                    {/* High-density compact card layout */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* BUY/SELL badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono tracking-wider ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isBuy ? '🟢 BUY شراء' : '🔴 SELL بيع'}
                        </span>

                        {/* Ticker */}
                        <span className="font-extrabold text-sm sm:text-base text-slate-100 font-mono">
                          {alert.symbol}
                        </span>

                        {/* Visual Tag: Glowing Cyan/Purple badge ("MBK Precision Engine") */}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>MBK Precision Engine</span>
                        </span>

                        {/* Timeframe */}
                        <span className="text-[10px] text-slate-400 font-mono bg-[#0c121e] px-2 py-0.5 rounded border border-slate-800">
                          {alert.timeframe}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">{alert.createdAt}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {alert.status === 'ACTIVE' ? 'نشط وقيد المتابعة' : 'حقق الهدف الأول ✓'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Entry & Strategy */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-[#090e18] border border-slate-800/80 text-xs font-mono">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            سعر الدخول (Entry):
                          </span>
                          <span className="text-sm font-bold text-cyan-200">
                            {alert.entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            اسم الاستراتيجية:
                          </span>
                          <span className="text-xs font-bold text-slate-200 font-sans">
                            {alert.strategyName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">+{alert.pips} Pip</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEngineAlert(alert);
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30 font-black'
                              : 'bg-[#10192a] hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'أهداف الشارت نشطة' : 'عرض على الشارت 🎯'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: 👤 "التوصيات اليدوية" (Analyst Signals) */}
        {/* ============================================================ */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400 font-mono font-bold">
                  تحليلات بشرية معتمدة من نخبة محللي MBK
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Firestore collection: manual_signals
              </span>
            </div>

            {filteredManualSignals.length === 0 ? (
              <div className="p-8 text-center bg-[#0e1422] rounded-xl border border-slate-800 text-slate-400 text-xs">
                لا توجد توصيات يدوية منشورة لهذا الرمز حالياً.
              </div>
            ) : (
              filteredManualSignals.map((signal, idx) => {
                const isLocked = !isVIP && idx > 0;
                const isBuy = signal.action.includes('BUY');
                const isExpanded = !!expandedRationale[signal.id];
                const isSelected = activeSignalId === signal.id;

                return (
                  <div
                    key={signal.id}
                    onClick={() => !isLocked && handleSelectManualSignal(signal)}
                    className={`border rounded-2xl p-4 sm:p-5 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                      isLocked
                        ? 'bg-[#101626] border-slate-800 select-none opacity-85'
                        : isSelected
                        ? 'bg-[#151c2c] border-amber-500/80 shadow-[0_0_25px_rgba(212,175,55,0.25)] ring-1 ring-amber-500/50'
                        : 'bg-[#101726] border-slate-800/90 hover:border-amber-500/40 hover:shadow-xl'
                    }`}
                  >
                    {/* Free user blur lock overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-[#090d16]/85 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center p-3 text-center">
                        <Lock className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-xs font-black text-slate-100 mb-0.5">
                          توصية محلل حصرية لأعضاء VIP
                        </span>
                        <p className="text-[11px] text-slate-400 max-w-sm mb-2">
                          أدخل رمز الترويج لفتح توصيات المحللين المعتمدين والملاحظات الفنية ومناطق السيولة.
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPromoModal();
                          }}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow cursor-pointer flex items-center gap-1"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>تفعيل VIP بالرمز</span>
                        </button>
                      </div>
                    )}

                    {/* Detailed Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Action badge */}
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black font-mono tracking-wider ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {signal.action}
                        </span>

                        {/* Ticker */}
                        <span className="font-extrabold text-base sm:text-lg text-slate-100 font-mono">
                          {signal.symbol}
                        </span>

                        {/* Visual Tag: Gold badge ("تحليل فني يدوي") */}
                        <span className="px-3 py-0.5 rounded-full text-xs font-black font-sans bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>تحليل فني يدوي</span>
                        </span>

                        {/* Risk Level Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans border ${
                            signal.riskLevel === 'Low'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : signal.riskLevel === 'Medium'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          مخاطرة: {signal.riskLevel === 'Low' ? 'منخفضة' : signal.riskLevel === 'Medium' ? 'متوسطة' : 'عالية'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">{signal.createdAt}</span>
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {signal.author}
                        </span>
                      </div>
                    </div>

                    {/* Key Price Levels Grid: Entry, TP1, TP2, SL, R:R */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-[#090e18] border border-slate-800/80 mb-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-cyan-400 block mb-0.5 font-sans font-bold">
                          سعر الدخول (Entry):
                        </span>
                        <span className="text-sm font-bold text-cyan-200 tabular-nums">
                          {signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-400 block mb-0.5 font-sans font-bold">
                          الهدف 1 (TP1):
                        </span>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">
                          {signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-sky-400 block mb-0.5 font-sans font-bold">
                          الهدف 2 (TP2):
                        </span>
                        <span className="text-sm font-bold text-sky-300 tabular-nums">
                          {signal.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-rose-400 block mb-0.5 font-sans font-bold">
                          وقف الخسارة (SL):
                        </span>
                        <span className="text-sm font-bold text-rose-400 tabular-nums">
                          {signal.sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-amber-400 block mb-0.5 font-sans font-bold">
                          العائد للمخاطر (R:R):
                        </span>
                        <span className="text-sm font-bold text-amber-300 tabular-nums">
                          {signal.riskReward}
                        </span>
                      </div>
                    </div>

                    {/* Expander Section for "ملاحظات المحلل" (Analyst Rationale / Setup Notes) */}
                    <div className="space-y-2 mb-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRationale(signal.id);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0d1424] hover:bg-[#121c32] border border-slate-800 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-400" />
                          <span>تفسير المحلل الفني وتفاصيل خطة التداول (Analyst Rationale)</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 rounded-xl bg-[#090e18] border border-amber-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
                          <p>{signal.rationale}</p>
                          <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                            <span>المحلل المعتمد: {signal.author}</span>
                            <span className="text-emerald-400">حماية رأس المال: 1% إلى 2% كحد أقصى</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono font-bold">
                          +{signal.pips} Pip متوقعة
                        </span>
                        <span className="text-slate-500 font-mono">•</span>
                        <span className="text-slate-400 font-mono">الفريم: {signal.timeframe || '15m'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectManualSignal(signal);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg border font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 font-black'
                              : 'bg-[#0e1726] hover:bg-amber-600/30 text-amber-300 border-amber-500/40 hover:border-amber-400'
                          }`}
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'أهداف الشارت نشطة' : 'عرض على الشارت 🎯'}</span>
                        </button>

                        {onCopySignal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectManualSignal(signal);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
                          >
                            نسخ التوصية
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
