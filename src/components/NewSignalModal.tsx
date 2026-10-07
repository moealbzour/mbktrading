import React, { useState } from 'react';
import { MarketSymbol, SignalType, TradeSignal } from '../types/trading';
import { Radio, PlusCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSignal: (signal: TradeSignal) => void;
}

export const NewSignalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddSignal
}) => {
  const [symbol, setSymbol] = useState<MarketSymbol>('US100');
  const [type, setType] = useState<SignalType>('BUY');
  const [entryPrice, setEntryPrice] = useState('20850.00');
  const [tp1, setTp1] = useState('20910.00');
  const [tp2, setTp2] = useState('20980.00');
  const [sl, setSl] = useState('20790.00');
  const [strategyName, setStrategyName] = useState('MBK Scalp Breakout & Volume Profile');
  const [notesAr, setNotesAr] = useState('كسر مؤكد لكتلة الأوامر المؤسسية مع فوليوم شرائي عالي. استهدف TP1 ثم حرك الوقف.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playSignalPing();

    const newSignal: TradeSignal = {
      id: `SIG-${Math.floor(1000 + Math.random() * 9000)}`,
      symbol,
      type,
      entryPrice: parseFloat(entryPrice) || 0,
      tp1: parseFloat(tp1) || 0,
      tp2: parseFloat(tp2) || 0,
      sl: parseFloat(sl) || 0,
      currentPrice: parseFloat(entryPrice) || 0,
      pips: 0,
      status: 'ACTIVE',
      riskReward: '1:2.4',
      timeframe: 'M5 / M15',
      confidence: 93,
      strategyName,
      createdAt: 'الآن (مباشر)',
      verifiedWebhook: true,
      notesAr
    };

    onAddSignal(newSignal);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141b29] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              نشر إشارة تداول حية موثقة (Admin / Webhook)
            </h3>
            <p className="text-xs text-slate-400">
              سيتم إشعار كافة المتداولين الـ 300+ فوراً مع تشغيل صافرة التنبيه المالي
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Symbol & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">الأصل المالي:</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as MarketSymbol)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold"
              >
                <option value="US100">US100 (ناسداك 100)</option>
                <option value="XAUUSD">XAUUSD (الذهب)</option>
                <option value="EURUSD">EURUSD (اليورو دولار)</option>
                <option value="BTCUSD">BTCUSD (البيتكوين)</option>
                <option value="WTI">WTI (النفط)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">نوع الصفقة:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('BUY')}
                  className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                    type === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>شراء BUY</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('SELL')}
                  className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                    type === 'SELL'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>بيع SELL</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Levels */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">نقطة الدخول:</label>
              <input
                type="text"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-emerald-400 block mb-1 font-medium">الهدف 1 (TP1):</label>
              <input
                type="text"
                required
                value={tp1}
                onChange={(e) => setTp1(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="text-cyan-400 block mb-1 font-medium">الهدف 2 (TP2):</label>
              <input
                type="text"
                required
                value={tp2}
                onChange={(e) => setTp2(e.target.value)}
                className="w-full bg-slate-900 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-rose-400 block mb-1 font-medium">وقف الخسارة (SL):</label>
              <input
                type="text"
                required
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full bg-slate-900 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono"
              />
            </div>
          </div>

          {/* Strategy Name */}
          <div>
            <label className="text-slate-300 block mb-1 font-medium">اسم الاستراتيجية / الكود الخوارزمي:</label>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-300 block mb-1 font-medium">الملاحظات الفنية وشروط التحريك:</label>
            <textarea
              rows={2}
              value={notesAr}
              onChange={(e) => setNotesAr(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إرسال وبث الإشارة الحية الآن</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
