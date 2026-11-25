import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { MarketTicker, MarketSymbol, PaperPosition } from '../../types/trading';
import { soundManager } from '../../utils/audio';

interface Props {
  tickers: MarketTicker[];
  selectedSymbol: MarketSymbol;
  onSelectSymbol: (symbol: MarketSymbol) => void;
}

export const PaperTrading: React.FC<Props> = ({ tickers, selectedSymbol, onSelectSymbol }) => {
  const [balance, setBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mbk_tic_paper_balance');
      return saved ? parseFloat(saved) : 100000;
    } catch {
      return 100000;
    }
  });

  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_tic_paper_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const [closedHistory, setClosedHistory] = useState<{
    id: string;
    symbol: MarketSymbol;
    type: 'BUY' | 'SELL';
    entry: number;
    exit: number;
    lots: number;
    pnl: number;
    time: string;
  }[]>([]);

  const [orderLots, setOrderLots] = useState<string>('1.0');
  const [orderSL, setOrderSL] = useState<string>('');
  const [orderTP, setOrderTP] = useState<string>('');

  const currentTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0];
  const livePrice = currentTicker?.price || 20565;

  const savePositions = (updated: PaperPosition[]) => {
    setPositions(updated);
    try {
      localStorage.setItem('mbk_tic_paper_positions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const saveBalance = (newBal: number) => {
    setBalance(newBal);
    try {
      localStorage.setItem('mbk_tic_paper_balance', newBal.toString());
    } catch {
      // ignore
    }
  };

  const handleOpenPosition = (type: 'BUY' | 'SELL') => {
    soundManager.playSuccess();
    const lots = parseFloat(orderLots) || 1.0;
    const sl = parseFloat(orderSL) || (type === 'BUY' ? livePrice * 0.99 : livePrice * 1.01);
    const tp = parseFloat(orderTP) || (type === 'BUY' ? livePrice * 1.02 : livePrice * 0.98);

    const newPos: PaperPosition = {
      id: `pos-${Date.now()}`,
      symbol: selectedSymbol,
      type,
      entryPrice: livePrice,
      currentPrice: livePrice,
      lotSize: lots,
      stopLoss: sl,
      takeProfit: tp,
      openTime: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      floatingPnL: 0
    };

    savePositions([newPos, ...positions]);
  };

  const handleClosePosition = (posId: string) => {
    soundManager.playClick();
    const pos = positions.find((p) => p.id === posId);
    if (!pos) return;

    const tick = tickers.find((t) => t.symbol === pos.symbol);
    const curr = tick?.price || pos.entryPrice;
    const mult = pos.symbol === 'XAUUSD' ? 100 : pos.symbol === 'US100' ? 20 : 1000;
    const pnl = pos.type === 'BUY' ? (curr - pos.entryPrice) * pos.lotSize * mult : (pos.entryPrice - curr) * pos.lotSize * mult;

    const newBalance = Math.round(balance + pnl);
    saveBalance(newBalance);

    setClosedHistory((prev) => [
      {
        id: `close-${Date.now()}`,
        symbol: pos.symbol,
        type: pos.type,
        entry: pos.entryPrice,
        exit: curr,
        lots: pos.lotSize,
        pnl: Math.round(pnl),
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);

    savePositions(positions.filter((p) => p.id !== posId));
  };

  const handleResetPortfolio = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      soundManager.playClick();
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    saveBalance(100000);
    savePositions([]);
    setClosedHistory([]);
    setConfirmReset(false);
    soundManager.playClick();
  };

  // Compute live floating PnL
  const totalFloatingPnL = positions.reduce((acc, p) => {
    const tick = tickers.find((t) => t.symbol === p.symbol);
    const curr = tick?.price || p.entryPrice;
    const mult = p.symbol === 'XAUUSD' ? 100 : p.symbol === 'US100' ? 20 : 1000;
    const diff = p.type === 'BUY' ? (curr - p.entryPrice) * p.lotSize * mult : (p.entryPrice - curr) * p.lotSize * mult;
    return acc + diff;
  }, 0);

  const equity = Math.round(balance + totalFloatingPnL);

  return (
    <div className="space-y-6">
      {/* 1. PORTFOLIO BALANCE & EQUITY HEADER */}
      <div className="rounded-2xl border border-[#E0E3EB] dark:border-slate-800 p-5 bg-[#FFFFFF] dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-[#0d1624] dark:to-slate-900/95 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E0E3EB] dark:border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E6F5F2] border border-[#B3E2D9] dark:border-0 dark:bg-gradient-to-tr dark:from-emerald-500 dark:via-teal-600 dark:to-cyan-600 p-0.5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-transparent dark:bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#089981] dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#131722] dark:text-slate-100 font-mono tracking-wide">
                  MBK PAPER TRADING • المحفظة الافتراضية والتداول التجريبي
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F5F2] dark:bg-emerald-500/20 text-[#089981] dark:text-emerald-300 border border-[#B3E2D9] dark:border-emerald-500/30">
                  Virtual $100K
                </span>
              </div>
              <p className="text-xs text-[#4A5162] dark:text-slate-400 mt-0.5">
                تداول حي وفوري على بيانات السوق الحقيقية بدون أي مخاطرة برأس المال لتثبيت النماذج
              </p>
            </div>
          </div>

          <button
            onClick={handleResetPortfolio}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
              confirmReset
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                : 'bg-[#FFFFFF] dark:bg-slate-900 hover:bg-[#EDF1F7] dark:hover:bg-slate-800 text-[#4A5162] dark:text-slate-300 border-[#E0E3EB] dark:border-slate-800'
            }`}
            title="إعادة التعيين إلى 100,000 دولار"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmReset ? 'اضغط للتأكيد ($100K)' : 'إعادة ضبط المحفظة'}</span>
          </button>
        </div>

        {/* 4 ACCOUNT KPIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#F0F3FA] dark:bg-slate-950/60 border border-[#E0E3EB] dark:border-slate-800/80">
            <span className="text-[11px] text-[#4A5162] dark:text-slate-400 block mb-1">الرصيد الحقيقي (Balance)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-[#131722] dark:text-slate-100">
              ${balance.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#787B86] dark:text-slate-500 block mt-0.5">رأس المال الافتراضي</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F3FA] dark:bg-slate-950/60 border border-[#E0E3EB] dark:border-slate-800/80">
            <span className="text-[11px] text-[#4A5162] dark:text-slate-400 block mb-1">السيولة الحالية (Equity)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-[#1E53E5] dark:text-cyan-400">
              ${equity.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#787B86] dark:text-slate-500 block mt-0.5">شامل الأرباح العائمة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F3FA] dark:bg-slate-950/60 border border-[#E0E3EB] dark:border-slate-800/80">
            <span className="text-[11px] text-[#4A5162] dark:text-slate-400 block mb-1">الأرباح العائمة (Floating PnL)</span>
            <span
              className={`text-lg sm:text-xl font-black font-mono ${
                totalFloatingPnL >= 0 ? 'text-[#089981] dark:text-emerald-400' : 'text-[#D93848] dark:text-rose-400'
              }`}
            >
              {totalFloatingPnL >= 0 ? `+$${Math.round(totalFloatingPnL).toLocaleString()}` : `-$${Math.abs(Math.round(totalFloatingPnL)).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-[#787B86] dark:text-slate-500 block mt-0.5">{positions.length} صفقات مفتوحة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F3FA] dark:bg-slate-950/60 border border-[#E0E3EB] dark:border-slate-800/80">
            <span className="text-[11px] text-[#4A5162] dark:text-slate-400 block mb-1">نسبة العائد الإجمالي</span>
            <span className="text-lg sm:text-xl font-black font-mono text-[#9A6700] dark:text-amber-400">
              {(((equity - 100000) / 100000) * 100).toFixed(2)}%
            </span>
            <span className="text-[10px] text-[#089981] dark:text-emerald-400 block mt-0.5">محاكاة واقعية 100%</span>
          </div>
        </div>
      </div>

      {/* 2. ORDER EXECUTION BAR & ACTIVE POSITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: INSTANT EXECUTION TERMINAL (4 Cols) */}
        <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#101624] border border-[#E0E3EB] dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#089981] dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-[#131722] dark:text-slate-100">تنفيذ فوري بالأسعار اللحظية</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#1E53E5] dark:text-cyan-400">
              {selectedSymbol} @ {livePrice.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* ASSET SELECTOR */}
            <div>
              <label className="block text-[#4A5162] dark:text-slate-400 mb-1">اختر الأصل للتداول التجريبي</label>
              <div className="grid grid-cols-2 gap-2">
                {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectSymbol(sym);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold font-mono text-xs transition-all border ${
                      selectedSymbol === sym
                        ? 'bg-[#EDF1F7] dark:bg-slate-800 text-[#131722] dark:text-cyan-400 border-[#131722] dark:border-cyan-500 shadow-sm'
                        : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#4A5162] dark:text-slate-400 border-[#E0E3EB] dark:border-slate-800 hover:text-[#131722] dark:hover:text-white'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* LOT SIZE & RISK */}
            <div>
              <label className="block text-[#4A5162] dark:text-slate-400 mb-1">حجم العقد (Lot Size)</label>
              <div className="flex gap-2">
                {['0.5', '1.0', '2.0', '5.0'].map((lot) => (
                  <button
                    key={lot}
                    onClick={() => setOrderLots(lot)}
                    className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                      orderLots === lot
                        ? 'bg-[#131722] text-white border-[#131722] dark:bg-cyan-600 dark:border-cyan-500'
                        : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#4A5162] dark:text-slate-400 border-[#E0E3EB] dark:border-slate-800'
                    }`}
                  >
                    {lot}
                  </button>
                ))}
              </div>
            </div>

            {/* SL & TP OPTIONAL INPUTS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#4A5162] dark:text-slate-400 mb-1">وقف الخسارة (SL)</label>
                <input
                  type="number"
                  placeholder="اختياري"
                  value={orderSL}
                  onChange={(e) => setOrderSL(e.target.value)}
                  className="w-full bg-[#FFFFFF] dark:bg-slate-900 border border-[#CBD2DF] dark:border-slate-700 rounded-xl px-3 py-2 text-[#131722] dark:text-slate-100 focus:outline-none focus:border-[#1E53E5] dark:focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[#4A5162] dark:text-slate-400 mb-1">جني الأرباح (TP)</label>
                <input
                  type="number"
                  placeholder="اختياري"
                  value={orderTP}
                  onChange={(e) => setOrderTP(e.target.value)}
                  className="w-full bg-[#FFFFFF] dark:bg-slate-900 border border-[#CBD2DF] dark:border-slate-700 rounded-xl px-3 py-2 text-[#131722] dark:text-slate-100 focus:outline-none focus:border-[#1E53E5] dark:focus:border-cyan-500"
                />
              </div>
            </div>

            {/* EXECUTE BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleOpenPosition('BUY')}
                className="py-3 px-4 rounded-xl bg-[#089981] hover:bg-[#067a67] text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-teal-600 dark:hover:from-emerald-400 dark:hover:to-teal-500 dark:text-slate-950 font-black text-sm shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                <span>شراء ماركت (BUY)</span>
              </button>

              <button
                onClick={() => handleOpenPosition('SELL')}
                className="py-3 px-4 rounded-xl bg-[#D93848] hover:bg-[#b82d3b] text-white dark:bg-gradient-to-r dark:from-rose-500 dark:to-red-600 dark:hover:from-rose-400 dark:hover:to-red-500 font-black text-sm shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-lg dark:shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                <span>بيع ماركت (SELL)</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTIVE POSITIONS & HISTORY (7 Cols) */}
        <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#101624] border border-[#E0E3EB] dark:border-slate-800 rounded-2xl p-5 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1E53E5] dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-[#131722] dark:text-slate-100">الصفقات الافتراضية النشطة ({positions.length})</h3>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="p-8 text-center text-[#787B86] dark:text-slate-500 space-y-2">
              <p className="text-xs">لا توجد صفقات مفتوحة حالياً في المحفظة الافتراضية.</p>
              <p className="text-[11px] text-[#787B86] dark:text-slate-600">
                استخدم لوحة التنفيذ على اليسار لفتح صفقة تجريبية مباشرة.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {positions.map((pos) => {
                const tick = tickers.find((t) => t.symbol === pos.symbol);
                const curr = tick?.price || pos.entryPrice;
                const mult = pos.symbol === 'XAUUSD' ? 100 : pos.symbol === 'US100' ? 20 : 1000;
                const pnl = pos.type === 'BUY' ? (curr - pos.entryPrice) * pos.lotSize * mult : (pos.entryPrice - curr) * pos.lotSize * mult;

                return (
                  <div
                    key={pos.id}
                    className="p-3.5 rounded-xl bg-[#F8F9FD] dark:bg-slate-900/60 border border-[#E0E3EB] dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          pos.type === 'BUY'
                            ? 'bg-[#E6F5F2] dark:bg-emerald-500/20 text-[#089981] dark:text-emerald-300 border border-[#B3E2D9] dark:border-emerald-500/30'
                            : 'bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-300 border border-[#F5C2C7] dark:border-rose-500/30'
                        }`}
                      >
                        {pos.type}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-[#131722] dark:text-slate-100">{pos.symbol}</span>
                          <span className="text-[10px] text-[#4A5162] dark:text-slate-400 font-mono">({pos.lotSize} Lot)</span>
                        </div>
                        <div className="text-[10px] text-[#787B86] dark:text-slate-500 font-mono">
                          <span>دخول: {pos.entryPrice.toLocaleString()} ➔ مباشر: {curr.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <span
                          className={`font-black font-mono text-sm block ${
                            pnl >= 0 ? 'text-[#089981] dark:text-emerald-400' : 'text-[#D93848] dark:text-rose-400'
                          }`}
                        >
                          {pnl >= 0 ? `+$${Math.round(pnl).toLocaleString()}` : `-$${Math.abs(Math.round(pnl)).toLocaleString()}`}
                        </span>
                      </div>

                      <button
                        onClick={() => handleClosePosition(pos.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#F8F9FD] dark:bg-slate-800 hover:bg-[#E0E3EB] dark:hover:bg-slate-700 text-[#131722] dark:text-slate-200 border border-[#CBD2DF] dark:border-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {closedHistory.length > 0 && (
            <div className="pt-4 border-t border-[#E0E3EB] dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-[#4A5162] dark:text-slate-300">سجل الصفقات المغلقة في هذه الجلسة ({closedHistory.length})</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {closedHistory.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 rounded-lg bg-[#F8F9FD] dark:bg-slate-900/40 border border-[#E0E3EB] dark:border-slate-800/70 flex items-center justify-between text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className={item.type === 'BUY' ? 'text-[#089981] dark:text-emerald-400 font-bold' : 'text-[#D93848] dark:text-rose-400 font-bold'}>
                        {item.type}
                      </span>
                      <span className="text-[#131722] dark:text-white font-bold">{item.symbol}</span>
                      <span className="text-[#787B86] dark:text-slate-500">({item.lots} Lot)</span>
                    </div>
                    <span className={item.pnl >= 0 ? 'text-[#089981] dark:text-emerald-400 font-bold' : 'text-[#D93848] dark:text-rose-400 font-bold'}>
                      {item.pnl >= 0 ? `+$${item.pnl}` : `-$${Math.abs(item.pnl)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
