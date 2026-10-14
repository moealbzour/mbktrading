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
      return saved ? JSON.parse(saved) : [
        {
          id: 'pos-1',
          symbol: 'US100',
          type: 'BUY',
          entryPrice: 20460.0,
          currentPrice: 20580.0,
          lotSize: 2.0,
          stopLoss: 20390.0,
          takeProfit: 20750.0,
          openTime: 'اليوم 14:10',
          floatingPnL: 2400
        }
      ];
    } catch {
      return [];
    }
  });

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
    if (confirm('هل أنت متأكد من إعادة تعيين المحفظة الافتراضية إلى 100,000 دولار؟')) {
      saveBalance(100000);
      savePositions([]);
      setClosedHistory([]);
      soundManager.playClick();
    }
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
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/95 via-[#0d1624] to-slate-900/95 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK PAPER TRADING • المحفظة الافتراضية والتداول التجريبي
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Virtual $100K
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تداول حي وفوري على بيانات السوق الحقيقية بدون أي مخاطرة برأس المال لتثبيت النماذج
              </p>
            </div>
          </div>

          <button
            onClick={handleResetPortfolio}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            title="إعادة التعيين إلى 100,000 دولار"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط المحفظة</span>
          </button>
        </div>

        {/* 4 ACCOUNT KPIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">الرصيد الحقيقي (Balance)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-slate-100">
              ${balance.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">رأس المال الافتراضي</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">السيولة الحالية (Equity)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-cyan-400">
              ${equity.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">شامل الأرباح العائمة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">الأرباح العائمة (Floating PnL)</span>
            <span
              className={`text-lg sm:text-xl font-black font-mono ${
                totalFloatingPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalFloatingPnL >= 0 ? `+$${Math.round(totalFloatingPnL).toLocaleString()}` : `-$${Math.abs(Math.round(totalFloatingPnL)).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{positions.length} صفقات مفتوحة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">نسبة العائد الإجمالي</span>
            <span className="text-lg sm:text-xl font-black font-mono text-amber-400">
              {(((equity - 100000) / 100000) * 100).toFixed(2)}%
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">محاكاة واقعية 100%</span>
          </div>
        </div>
      </div>

      {/* 2. ORDER EXECUTION BAR & ACTIVE POSITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: INSTANT EXECUTION TERMINAL (4 Cols) */}
        <div className="lg:col-span-5 bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">تنفيذ فوري بالأسعار اللحظية</h3>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {selectedSymbol} @ {livePrice.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* ASSET SELECTOR */}
            <div>
              <label className="block text-slate-400 mb-1">اختر الأصل للتداول التجريبي</label>
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
                        ? 'bg-slate-800 text-cyan-400 border-cyan-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* LOT SIZE & RISK */}
            <div>
              <label className="block text-slate-400 mb-1">حجم العقد (Lot Size)</label>
              <div className="flex gap-2">
                {['0.5', '1.0', '2.0', '5.0'].map((lot) => (
                  <button
                    key={lot}
                    onClick={() => setOrderLots(lot)}
                    className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                      orderLots === lot
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
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
                <label className="block text-slate-400 mb-1">وقف الخسارة (SL)</label>
                <input
                  type="number"
                  placeholder="اختياري"
                  value={orderSL}
                  onChange={(e) => setOrderSL(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">جني الأرباح (TP)</label>
                <input
                  type="number"
                  placeholder="اختياري"
                  value={orderTP}
                  onChange={(e) => setOrderTP(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* EXECUTE BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleOpenPosition('BUY')}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                <span>شراء ماركت (BUY)</span>
              </button>

              <button
                onClick={() => handleOpenPosition('SELL')}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-sm shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                <span>بيع ماركت (SELL)</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTIVE POSITIONS & HISTORY (7 Cols) */}
        <div className="lg:col-span-7 bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">الصفقات الافتراضية النشطة ({positions.length})</h3>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <p className="text-xs">لا توجد صفقات مفتوحة حالياً في المحفظة الافتراضية.</p>
              <p className="text-[11px] text-slate-600">
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
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          pos.type === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {pos.type}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-100">{pos.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({pos.lotSize} Lot)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          <span>دخول: {pos.entryPrice.toLocaleString()} ➔ مباشر: {curr.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <span
                          className={`font-black font-mono text-sm block ${
                            pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pnl >= 0 ? `+$${Math.round(pnl).toLocaleString()}` : `-$${Math.abs(Math.round(pnl)).toLocaleString()}`}
                        </span>
                      </div>

                      <button
                        onClick={() => handleClosePosition(pos.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
