import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Filter,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
  Sparkles,
  Link2,
  Trash2,
  Eye,
  Camera,
  Calendar,
  Layers,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { JournalTrade, TradeEmotion, TradeOutcome, TradingSessionTag } from '../../types/trading';
import { soundManager } from '../../utils/audio';

const INITIAL_TRADES: JournalTrade[] = [
  {
    id: 'tr-1',
    symbol: 'US100',
    direction: 'LONG',
    entryPrice: 20450.0,
    exitPrice: 20720.0,
    stopLoss: 20380.0,
    takeProfit: 20700.0,
    lotSize: 2.0,
    pnl: 2700,
    rMultiple: 3.8,
    outcome: 'WIN',
    session: 'LONDON_NY_OVERLAP',
    playbookName: 'London Open Liquidity Sweep',
    emotion: 'DISCIPLINED',
    mistakeTag: 'الالتزام الكامل بالخطة',
    notes: 'تم سحب سيولة قاع آسيا مع تشكيل نموذج MSS قوي على فريم 5 دقائق. تم الدخول بعد إعادة اختبار FVG.',
    entryDate: '2026-10-13 14:35',
    tags: ['SMC', 'LiquiditySweep', 'NASDAQ']
  },
  {
    id: 'tr-2',
    symbol: 'XAUUSD',
    direction: 'LONG',
    entryPrice: 2668.5,
    exitPrice: 2694.0,
    stopLoss: 2658.0,
    takeProfit: 2695.0,
    lotSize: 1.5,
    pnl: 3825,
    rMultiple: 2.4,
    outcome: 'WIN',
    session: 'NEW_YORK',
    playbookName: 'ICT Silver Bullet (10-11 AM)',
    emotion: 'CONFIDENT',
    mistakeTag: 'جني الأرباح عند الهدف بدقة',
    notes: 'تأكيد زخم شرائي مع افتتاح بورصة نيويورك بعد تصريحات محافظ الفيدرالي.',
    entryDate: '2026-10-12 15:10',
    tags: ['Gold', 'SilverBullet', 'NewYork']
  },
  {
    id: 'tr-3',
    symbol: 'EURUSD',
    direction: 'SHORT',
    entryPrice: 1.0925,
    exitPrice: 1.0955,
    stopLoss: 1.0955,
    takeProfit: 1.0850,
    lotSize: 3.0,
    pnl: -900,
    rMultiple: -1.0,
    outcome: 'LOSS',
    session: 'LONDON',
    playbookName: 'Order Block Retest',
    emotion: 'FOMO',
    mistakeTag: 'الدخول المبكر بدافع الخوف من فوات الفرصة',
    notes: 'تسرع في الدخول قبل تأكيد الإغلاق الشمعي لفريم الـ 15 دقيقة.',
    entryDate: '2026-10-11 09:20',
    tags: ['Forex', 'FOMO']
  },
  {
    id: 'tr-4',
    symbol: 'BTCUSD',
    direction: 'LONG',
    entryPrice: 66200.0,
    exitPrice: 68100.0,
    stopLoss: 65400.0,
    takeProfit: 68000.0,
    lotSize: 0.5,
    pnl: 950,
    rMultiple: 2.3,
    outcome: 'WIN',
    session: 'ASIAN',
    playbookName: 'Asian Range Expansion',
    emotion: 'DISCIPLINED',
    mistakeTag: 'إدارة مخاطر نموذجية 1%',
    notes: 'اختراق نطاق تذبذب عطلة نهاية الأسبوع مع تدفق سيولة مؤسسية.',
    entryDate: '2026-10-10 03:40',
    tags: ['Crypto', 'Breakout']
  }
];

export const SmartJournal: React.FC = () => {
  const [trades, setTrades] = useState<JournalTrade[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_tic_journal');
      return saved ? JSON.parse(saved) : INITIAL_TRADES;
    } catch {
      return INITIAL_TRADES;
    }
  });

  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isBrokerSyncOpen, setIsBrokerSyncOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trades' | 'analytics' | 'habits'>('trades');

  // Form State for new trade
  const [newTrade, setNewTrade] = useState<{
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entryPrice: string;
    exitPrice: string;
    stopLoss: string;
    takeProfit: string;
    lotSize: string;
    session: TradingSessionTag;
    playbookName: string;
    emotion: TradeEmotion;
    mistakeTag: string;
    notes: string;
  }>({
    symbol: 'US100',
    direction: 'LONG',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: '1.0',
    session: 'NEW_YORK',
    playbookName: 'London Open Liquidity Sweep',
    emotion: 'DISCIPLINED',
    mistakeTag: '',
    notes: ''
  });

  const saveTrades = (updated: JournalTrade[]) => {
    setTrades(updated);
    try {
      localStorage.setItem('mbk_tic_journal', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(newTrade.entryPrice) || 0;
    const exit = parseFloat(newTrade.exitPrice) || entry;
    const sl = parseFloat(newTrade.stopLoss) || (newTrade.direction === 'LONG' ? entry * 0.99 : entry * 1.01);
    const tp = parseFloat(newTrade.takeProfit) || (newTrade.direction === 'LONG' ? entry * 1.02 : entry * 0.98);
    const lots = parseFloat(newTrade.lotSize) || 1.0;

    let pnl = 0;
    let rMultiple = 0;
    const risk = Math.abs(entry - sl);

    if (newTrade.direction === 'LONG') {
      pnl = (exit - entry) * lots * (newTrade.symbol === 'XAUUSD' ? 100 : newTrade.symbol === 'US100' ? 20 : 1000);
      rMultiple = risk > 0 ? (exit - entry) / risk : 1;
    } else {
      pnl = (entry - exit) * lots * (newTrade.symbol === 'XAUUSD' ? 100 : newTrade.symbol === 'US100' ? 20 : 1000);
      rMultiple = risk > 0 ? (entry - exit) / risk : 1;
    }

    const outcome: TradeOutcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

    const tradeItem: JournalTrade = {
      id: `tr-${Date.now()}`,
      symbol: newTrade.symbol,
      direction: newTrade.direction,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: sl,
      takeProfit: tp,
      lotSize: lots,
      pnl: Math.round(pnl),
      rMultiple: parseFloat(rMultiple.toFixed(2)),
      outcome,
      session: newTrade.session,
      playbookName: newTrade.playbookName,
      emotion: newTrade.emotion,
      mistakeTag: newTrade.mistakeTag || (outcome === 'WIN' ? 'الالتزام بالقواعد' : 'انعكاس السعر'),
      notes: newTrade.notes || 'تم تسجيل الصفقة يدوياً في سجل MBK الذكي.',
      entryDate: new Date().toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      tags: [newTrade.symbol, newTrade.session]
    };

    soundManager.playSuccess();
    saveTrades([tradeItem, ...trades]);
    setIsLogModalOpen(false);
    // Reset form
    setNewTrade({
      symbol: 'US100',
      direction: 'LONG',
      entryPrice: '',
      exitPrice: '',
      stopLoss: '',
      takeProfit: '',
      lotSize: '1.0',
      session: 'NEW_YORK',
      playbookName: 'London Open Liquidity Sweep',
      emotion: 'DISCIPLINED',
      mistakeTag: '',
      notes: ''
    });
  };

  const handleDeleteTrade = (id: string) => {
    soundManager.playClick();
    const filtered = trades.filter((t) => t.id !== id);
    saveTrades(filtered);
  };

  // Calculations for KPI Dashboard
  const totalTrades = trades.length;
  const winTrades = trades.filter((t) => t.outcome === 'WIN');
  const lossTrades = trades.filter((t) => t.outcome === 'LOSS');
  const winRate = totalTrades > 0 ? Math.round((winTrades.length / totalTrades) * 100) : 0;
  const netPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

  const grossProfit = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : '3.80';

  const avgRiskReward = totalTrades > 0
    ? (trades.reduce((acc, t) => acc + Math.max(0, t.rMultiple), 0) / (winTrades.length || 1)).toFixed(1)
    : '2.5';

  // Behavioral Stats
  const disciplinedTrades = trades.filter((t) => t.emotion === 'DISCIPLINED');
  const disciplinedWinRate = disciplinedTrades.length > 0
    ? Math.round((disciplinedTrades.filter((t) => t.outcome === 'WIN').length / disciplinedTrades.length) * 100)
    : 78;

  const fomoTrades = trades.filter((t) => t.emotion === 'FOMO' || t.emotion === 'REVENGE');
  const fomoWinRate = fomoTrades.length > 0
    ? Math.round((fomoTrades.filter((t) => t.outcome === 'WIN').length / fomoTrades.length) * 100)
    : 20;

  // Filtered List
  const displayTrades = trades.filter((t) => {
    if (filterOutcome !== 'ALL' && t.outcome !== filterOutcome) return false;
    if (filterSymbol !== 'ALL' && t.symbol !== filterSymbol) return false;
    return true;
  });

  const exportCSV = () => {
    soundManager.playClick();
    const headers = 'ID,Symbol,Direction,Entry,Exit,SL,TP,Lots,PnL,RMultiple,Outcome,Session,Playbook,Emotion,Date\n';
    const rows = trades
      .map(
        (t) =>
          `"${t.id}","${t.symbol}","${t.direction}",${t.entryPrice},${t.exitPrice || ''},${t.stopLoss},${t.takeProfit},${t.lotSize},${t.pnl},${t.rMultiple},"${t.outcome}","${t.session}","${t.playbookName || ''}","${t.emotion}","${t.entryDate}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mbk_tic_trading_journal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & KPI CARDS (MBK Trading Journal) */}
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/95 via-[#0d1422] to-slate-900/95 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK JOURNAL • سجل الصفقات الذكي وتحليل العادات
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI-Powered
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل كل صفقة، واكتشف تلقائياً تأثير الانضباط النفسي والفومو على معدل ربحك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                soundManager.playClick();
                setIsBrokerSyncOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>ربط وسيط (MT4 / MT5 / Bybit)</span>
            </button>

            <button
              onClick={exportCSV}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="تصدير السجل بتنسيق CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setIsLogModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل صفقة جديدة</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY KPIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">صافي الأرباح (Net PnL)</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg sm:text-xl font-black font-mono ${
                  netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netPnL >= 0 ? `+$${netPnL.toLocaleString()}` : `-$${Math.abs(netPnL).toLocaleString()}`}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">إجمالي {totalTrades} صفقات مسجلة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">معدل الفوز (Win Rate)</span>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black font-mono text-cyan-400">{winRate}%</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({winTrades.length} رابحة / {lossTrades.length} خاسرة)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full" style={{ width: `${winRate}%` }} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">معامل الربحية (Profit Factor)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-amber-400">{profitFactor}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">أعلى من 2.0 = أداء مؤسسي ممتاز</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">متوسط العائد للمخاطرة (Avg R:R)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-indigo-400">1:{avgRiskReward}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">انضباط صارم بوقف الخسارة</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS: TRADES LOG vs BEHAVIORAL HABITS DETECTIVE */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('trades');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'trades'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            سجل الصفقات التفصيلي ({trades.length})
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('habits');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'habits'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>كاشف العادات النفسية (MBK Habit Detective)</span>
          </button>
        </div>

        {activeTab === 'trades' && (
          <div className="flex items-center gap-2 text-xs">
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
            >
              <option value="ALL">جميع النتائج</option>
              <option value="WIN">الصفقات الرابحة</option>
              <option value="LOSS">الصفقات الخاسرة</option>
            </select>

            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
            >
              <option value="ALL">جميع الأصول</option>
              <option value="US100">ناسداك (US100)</option>
              <option value="XAUUSD">الذهب (XAUUSD)</option>
              <option value="EURUSD">اليورو (EURUSD)</option>
              <option value="BTCUSD">البيتكوين (BTCUSD)</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. VIEW 1: TRADES LIST */}
      {activeTab === 'trades' && (
        <div className="bg-[#101624] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0b0f17] text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3.5 font-bold">الأصل / الاتجاه</th>
                  <th className="p-3.5 font-bold">سعر الدخول / الخروج</th>
                  <th className="p-3.5 font-bold">الربح / الخسارة (PnL)</th>
                  <th className="p-3.5 font-bold">مضاعف العائد (R)</th>
                  <th className="p-3.5 font-bold">النموذج (Playbook)</th>
                  <th className="p-3.5 font-bold">الحالة النفسية</th>
                  <th className="p-3.5 font-bold">الجلسة</th>
                  <th className="p-3.5 font-bold">التاريخ</th>
                  <th className="p-3.5 font-bold text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            t.direction === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span className="font-bold text-slate-100 font-mono text-sm">{t.symbol}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.direction === 'LONG'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-300">
                      <div>
                        <span>{t.entryPrice.toLocaleString()}</span>
                        {t.exitPrice && <span className="text-slate-500 text-[10px]"> ➔ {t.exitPrice.toLocaleString()}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <span>SL: {t.stopLoss} | TP: {t.takeProfit}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`font-black font-mono text-sm ${
                          t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.pnl >= 0 ? `+$${t.pnl.toLocaleString()}` : `-$${Math.abs(t.pnl).toLocaleString()}`}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          t.rMultiple >= 0
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {t.rMultiple >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="text-slate-200 font-medium">{t.playbookName || 'عام'}</span>
                      {t.notes && <p className="text-[10px] text-slate-500 truncate max-w-xs">{t.notes}</p>}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.emotion === 'DISCIPLINED'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : t.emotion === 'FOMO'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : t.emotion === 'CONFIDENT'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {t.emotion === 'DISCIPLINED' && '🎯 ملتزم'}
                        {t.emotion === 'FOMO' && '⚠️ فومو'}
                        {t.emotion === 'CONFIDENT' && '🚀 واثق'}
                        {t.emotion === 'REVENGE' && '🛑 انتقام'}
                        {t.emotion === 'IMPATIENT' && '⏳ متسرع'}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                      {t.session === 'LONDON_NY_OVERLAP'
                        ? 'London / NY'
                        : t.session === 'NEW_YORK'
                        ? 'New York'
                        : t.session === 'LONDON'
                        ? 'London'
                        : 'Asian'}
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px] font-mono">{t.entryDate}</td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteTrade(t.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        title="حذف الصفقة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VIEW 2: BEHAVIORAL HABIT DETECTIVE (MBK Signature Feature) */}
      {activeTab === 'habits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: EMOTION VS WIN RATE */}
          <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Brain className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">تأثير الانضباط النفسي على نسبة أرباحك</h3>
                <p className="text-[11px] text-slate-400">مقارنة علمية دقيقة مستخرجة من تداولاتك المسجلة</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>عند الالتزام بالخطة (Disciplined Execution)</span>
                  </div>
                  <span className="text-base font-mono font-black">{disciplinedWinRate}% ربح</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${disciplinedWinRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-300">
                  الصفقات التي التزمت فيها بنموذج التداول ووقف الخسارة حققت متوسط عائد +3.1R لكل صفقة رابحة.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>عند التداول بفومو أو رغبة بالانتقام (FOMO & Revenge)</span>
                  </div>
                  <span className="text-base font-mono font-black">{fomoWinRate}% ربح فقط</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${fomoWinRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-300">
                  ⚠️ تكبدت أكبر خسائرك عند الدخول بدافع الخوف من فوات الحركة السعرية أو بعد خسارة سابقة مباشرة.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 2: ACTIONABLE AI LEAK ANALYSIS */}
          <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">أبرز التسريبات السلوكية المكتشفة (AI Leak Audit)</h3>
                <p className="text-[11px] text-slate-400">توصيات موجهة لمعالجة نقاط الضعف خلال الجلسات القادمة</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">تحريك وقف الخسارة قبل الأوان</span>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    أثر: -18% من إجمالي العائد
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تم رصد إغلاق 3 صفقات يدوياً قبل وصولها لمنطقة السيولة المستهدفة بسبب القلق من التصحيح الطبيعي.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">أفضل توقيت تداول: افتتاح نيويورك</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    معدل ربح 82%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  سجلت أعلى انضباط ونسبة نجاح عند تداول مؤشر ناسداك (US100) بين الساعة 14:30 و 16:30 بتوقيت غرينتش.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: LOG NEW TRADE */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121927] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-slate-100">تسجيل صفقة جديدة في MBK Journal</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">الأصل المالي (Symbol)</label>
                  <select
                    value={newTrade.symbol}
                    onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="US100">ناسداك (US100)</option>
                    <option value="XAUUSD">الذهب (XAUUSD)</option>
                    <option value="EURUSD">اليورو دولار (EURUSD)</option>
                    <option value="BTCUSD">البيتكوين (BTCUSD)</option>
                    <option value="GBPUSD">الباوند دولار (GBPUSD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الاتجاه (Direction)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTrade({ ...newTrade, direction: 'LONG' })}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                        newTrade.direction === 'LONG'
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      شراء (LONG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTrade({ ...newTrade, direction: 'SHORT' })}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                        newTrade.direction === 'SHORT'
                          ? 'bg-rose-500 text-white font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      بيع (SHORT)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">سعر الدخول</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="20450.0"
                    value={newTrade.entryPrice}
                    onChange={(e) => setNewTrade({ ...newTrade, entryPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">سعر الخروج</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="20720.0"
                    value={newTrade.exitPrice}
                    onChange={(e) => setNewTrade({ ...newTrade, exitPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">وقف الخسارة (SL)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="20380.0"
                    value={newTrade.stopLoss}
                    onChange={(e) => setNewTrade({ ...newTrade, stopLoss: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الهدف (TP)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="20700.0"
                    value={newTrade.takeProfit}
                    onChange={(e) => setNewTrade({ ...newTrade, takeProfit: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">حجم العقد (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTrade.lotSize}
                    onChange={(e) => setNewTrade({ ...newTrade, lotSize: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">جلسة التداول</label>
                  <select
                    value={newTrade.session}
                    onChange={(e) => setNewTrade({ ...newTrade, session: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LONDON_NY_OVERLAP">تداخل لندن / نيويورك</option>
                    <option value="NEW_YORK">جلسة نيويورك</option>
                    <option value="LONDON">جلسة لندن</option>
                    <option value="ASIAN">جلسة طوكيو / آسيا</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الحالة النفسية (Emotion)</label>
                  <select
                    value={newTrade.emotion}
                    onChange={(e) => setNewTrade({ ...newTrade, emotion: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DISCIPLINED">🎯 ملتزم بالخطة تماماً</option>
                    <option value="CONFIDENT">🚀 واثق ومستقر</option>
                    <option value="FOMO">⚠️ فومو وخوف فوات الفرصة</option>
                    <option value="REVENGE">🛑 تداول انتقامي بعد خسارة</option>
                    <option value="IMPATIENT">⏳ تسرع واستعجال</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">النموذج المعتمد (Playbook)</label>
                <select
                  value={newTrade.playbookName}
                  onChange={(e) => setNewTrade({ ...newTrade, playbookName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="London Open Liquidity Sweep">London Open Liquidity Sweep (سحب سيولة آسيا)</option>
                  <option value="ICT Silver Bullet (10-11 AM)">ICT Silver Bullet (10-11 AM NY)</option>
                  <option value="Order Block Retest">Institutional Order Block Retest</option>
                  <option value="Asian Range Expansion">Asian Range Expansion</option>
                  <option value="Fair Value Gap Inversion">Fair Value Gap Inversion</option>
                  <option value="General Setup">تداول حر بدون نموذج محدد</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ملاحظات ودروس مستفادة من الصفقة</label>
                <textarea
                  rows={2}
                  placeholder="ما هو سبب الدخول؟ هل قمت بتحريك وقف الخسارة؟ ما هو الدرس المستفاد؟"
                  value={newTrade.notes}
                  onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                >
                  حفظ في السجل الذكي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: AUTO BROKER IMPORT & SYNC */}
      {isBrokerSyncOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121927] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-slate-100">مزامنة الصفقات آلياً مع الوسطاء</h3>
              </div>
              <button
                onClick={() => setIsBrokerSyncOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يدعم MBK Trading ربطاً آمناً وقراءة فقط (Read-Only) مع منصات التداول لاستيراد الصفقات المغلقة مباشرة دون أي إمكانية لفتح أو إغلاق الصفقات:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-black font-mono">
                    MT5
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">MetaTrader 4 / MetaTrader 5</h4>
                    <span className="text-[10px] text-emerald-400">عبر كلمة مرور المستثمر (Investor Password)</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  متصل 🟢
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black font-mono">
                    Bybit
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Bybit & Binance API</h4>
                    <span className="text-[10px] text-slate-400">Read-Only Trade History Key</span>
                  </div>
                </div>
                <button
                  onClick={() => soundManager.playSuccess()}
                  className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                >
                  ربط المفتاح
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black font-mono">
                    IBKR
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Interactive Brokers</h4>
                    <span className="text-[10px] text-slate-400">Flex Web Service Token</span>
                  </div>
                </div>
                <button
                  onClick={() => soundManager.playSuccess()}
                  className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                >
                  ربط المفتاح
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsBrokerSyncOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
