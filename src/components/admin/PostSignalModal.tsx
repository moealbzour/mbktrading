import React, { useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MarketSymbol, ManualSignalAction, RiskLevel, MarketTicker, UserProfile } from '../../types/trading';
import {
  X,
  Sparkles,
  Send,
  AlertTriangle,
  Target,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  DollarSign,
  Calculator,
  Lock,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tickers?: MarketTicker[];
  currentUser?: UserProfile | null;
  onSignalPublished?: () => void;
}

export const PostSignalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tickers = [],
  currentUser,
  onSignalPublished
}) => {
  const [symbol, setSymbol] = useState<MarketSymbol>('US100');
  const [action, setAction] = useState<ManualSignalAction>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('20850.00');
  const [tp1, setTp1] = useState<string>('20920.00');
  const [tp2, setTp2] = useState<string>('20990.00');
  const [sl, setSl] = useState<string>('20790.00');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Medium');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [rationale, setRationale] = useState<string>(
    'كسر نموذج القمة المزدوجة مع سحب سيولة جلسة لندن وتأكيد إغلاق شمعة المومنتوم فوق متوسط EMA 21. نوصي بجني أرباح جزئي عند الهدف الأول ونقل وقف الخسارة إلى نقطة الدخول.'
  );
  const [author, setAuthor] = useState<string>('فريق أبحاث MBK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  // Auto prefill current price when symbol changes
  const handleSymbolChange = (newSym: MarketSymbol) => {
    setSymbol(newSym);
    const ticker = tickers.find((t) => t.symbol === newSym);
    if (ticker) {
      const p = ticker.price;
      setEntryPrice(p.toFixed(ticker.digits));
      if (action.includes('BUY')) {
        const delta = newSym === 'EURUSD' ? 0.0035 : newSym === 'XAUUSD' ? 12 : 60;
        setTp1((p + delta).toFixed(ticker.digits));
        setTp2((p + delta * 1.8).toFixed(ticker.digits));
        setSl((p - delta * 0.7).toFixed(ticker.digits));
      } else {
        const delta = newSym === 'EURUSD' ? 0.0035 : newSym === 'XAUUSD' ? 12 : 60;
        setTp1((p - delta).toFixed(ticker.digits));
        setTp2((p - delta * 1.8).toFixed(ticker.digits));
        setSl((p + delta * 0.7).toFixed(ticker.digits));
      }
    }
  };

  // Quick action change and recalibrate TP / SL
  const handleActionChange = (newAction: ManualSignalAction) => {
    setAction(newAction);
    const entry = parseFloat(entryPrice) || 20850;
    const ticker = tickers.find((t) => t.symbol === symbol);
    const digits = ticker ? ticker.digits : 2;
    const delta = symbol === 'EURUSD' ? 0.0035 : symbol === 'XAUUSD' ? 12 : 60;

    if (newAction.includes('BUY')) {
      setTp1((entry + delta).toFixed(digits));
      setTp2((entry + delta * 1.8).toFixed(digits));
      setSl((entry - delta * 0.7).toFixed(digits));
    } else {
      setTp1((entry - delta).toFixed(digits));
      setTp2((entry - delta * 1.8).toFixed(digits));
      setSl((entry + delta * 0.7).toFixed(digits));
    }
  };

  // Calculate projected Risk:Reward
  const entryNum = parseFloat(entryPrice) || 0;
  const tp1Num = parseFloat(tp1) || 0;
  const tp2Num = parseFloat(tp2) || 0;
  const slNum = parseFloat(sl) || 0;

  const riskDistance = Math.abs(entryNum - slNum);
  const rewardDistance = Math.abs(tp2Num - entryNum);
  const calculatedRR = riskDistance > 0 ? (rewardDistance / riskDistance).toFixed(1) : '2.2';

  const isGold = symbol === 'XAUUSD';
  const isForex = symbol === 'EURUSD' || symbol === 'GBPUSD';
  const diffPips = Math.abs(tp2Num - entryNum);
  const projectedPips = isGold
    ? Math.round(diffPips * 10)
    : isForex
    ? Math.round(diffPips * 10000)
    : Math.round(diffPips);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!entryNum || !tp1Num || !slNum) {
      setErrorMsg('يرجى ملء جميع الحقول السعرية (نقطة الدخول، الهدف، ووقف الخسارة)');
      return;
    }

    if (rationale.trim().length < 10) {
      setErrorMsg('يرجى كتابة تحليل أو ملاحظات وافية للصفقة (10 أحرف على الأقل)');
      return;
    }

    setIsSubmitting(true);
    soundManager.playClick();

    try {
      const payload = {
        symbol,
        action,
        entryPrice: entryNum,
        tp1: tp1Num,
        tp2: tp2Num || tp1Num * 1.01,
        sl: slNum,
        riskLevel,
        timeframe,
        riskReward: `1:${calculatedRR}`,
        pips: projectedPips,
        rationale: rationale.trim(),
        author: author || currentUser?.name || 'فريق أبحاث MBK',
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        createdAtFormatted: 'الآن (مباشر)',
        verifiedWebhook: false,
        channel: 'MANUAL'
      };

      await addDoc(collection(db, 'manual_signals'), payload);

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSuccessMsg(true);
      if (onSignalPublished) {
        onSignalPublished();
      }

      setTimeout(() => {
        setSuccessMsg(false);
        setIsSubmitting(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Failed to post manual signal to Firestore:', err);
      setErrorMsg('تعذر حفظ التوصية في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-['Cairo',sans-serif]">
      <div className="relative w-full max-w-2xl bg-[#090d16] border border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 via-[#0e1626] to-[#090d16] border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100">
                  لوحة نشر التوصيات اليدوية (Admin Publisher)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                نشر فوري يظهر مباشرة لجميع المشتركين عبر قناة "التوصيات اليدوية"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>تم نشر التوصية بنجاح وبثها في القناة اليدوية لجميع المتداولين!</span>
            </div>
          )}

          {/* 1. Symbol & Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Symbol Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                زوج التداول / الأداة المالية:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['US100', 'XAUUSD', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((sym) => {
                  const isSelected = symbol === sym;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSymbolChange(sym)}
                      className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-[#101726] text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                نوع العملية (Action):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['BUY', 'SELL', 'BUY LIMIT', 'SELL LIMIT'] as ManualSignalAction[]).map((act) => {
                  const isSelected = action === act;
                  const isBuy = act.includes('BUY');
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => handleActionChange(act)}
                      className={`py-2 px-1 text-[11px] font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isBuy
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                          : 'bg-[#101726] text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Price Levels: Entry, TP1, TP2, Stop Loss */}
          <div className="p-3.5 rounded-xl bg-[#0d131f] border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>مستويات الأسعار المؤسسية (Order Price Levels)</span>
              </span>
              <span className="text-cyan-400 font-mono text-[11px]">
                العائد للمخاطر: 1:{calculatedRR} • الربح المتوقع: +{projectedPips} Pip
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-cyan-400 font-bold mb-1">
                  نقطة الدخول (Entry):
                </label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-[#141b2a] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-emerald-400 font-bold mb-1">
                  الهدف 1 (TP1):
                </label>
                <input
                  type="number"
                  step="any"
                  value={tp1}
                  onChange={(e) => setTp1(e.target.value)}
                  className="w-full bg-[#141b2a] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-sky-400 font-bold mb-1">
                  الهدف 2 (TP2):
                </label>
                <input
                  type="number"
                  step="any"
                  value={tp2}
                  onChange={(e) => setTp2(e.target.value)}
                  className="w-full bg-[#141b2a] border border-sky-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-rose-400 font-bold mb-1">
                  وقف الخسارة (SL):
                </label>
                <input
                  type="number"
                  step="any"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="w-full bg-[#141b2a] border border-rose-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Risk Level, Timeframe & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Risk Level */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مستوى المخاطرة (Risk):
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['Low', 'Medium', 'High'] as RiskLevel[]).map((r) => {
                  const isSelected = riskLevel === r;
                  const labelAr = r === 'Low' ? 'منخفضة' : r === 'Medium' ? 'متوسطة' : 'عالية';
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRiskLevel(r)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? r === 'Low'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-black'
                            : r === 'Medium'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-black'
                            : 'bg-rose-500/20 text-rose-300 border-rose-400 font-black'
                          : 'bg-[#101726] text-slate-400 border-slate-800'
                      }`}
                    >
                      {labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الفاصل الزمني (Timeframe):
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-[#101726] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="5m">5m (سكالبينغ سريع)</option>
                <option value="15m">15m (إنتراداي قياسي)</option>
                <option value="1h">1h (جلسة يومية)</option>
                <option value="4h">4h (سوينغ أسبوعي)</option>
                <option value="1D">1D (اتجاه عام)</option>
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                جهة التحليل (Author):
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="فريق أبحاث MBK"
                className="w-full bg-[#101726] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* 4. Analyst Rationale & Commentary */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ملاحظات وتفسير المحلل الفني (Analyst Rationale / Setup Commentary):
            </label>
            <textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="اكتب التفسير الفني للدخول، مناطق السيولة، كسر الهيكل، أو إدارة الصفقة..."
              className="w-full bg-[#101726] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder-slate-500 leading-relaxed"
              required
            />
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري النشر في السيرفر...' : 'نشر التوصية فورياً للجميع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
