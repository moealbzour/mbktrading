import React, { useState } from 'react';
import {
  Calculator,
  X,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { soundManager } from '../../utils/audio';
import { MarketSymbol } from '../../types/trading';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  defaultSymbol?: MarketSymbol;
}

export const RiskCalculatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'ar',
  defaultSymbol = 'XAUUSD'
}) => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [slPips, setSlPips] = useState<number>(30);
  const [symbol, setSymbol] = useState<MarketSymbol>(defaultSymbol);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Contract size & pip value per 1.0 standard lot
  const instrumentSpecs: Record<MarketSymbol, { pipValueStandard: number; unit: string }> = {
    XAUUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips' },
    US100: { pipValueStandard: 20, unit: isAr ? 'نقاط (Pts)' : 'Points' },
    EURUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips' },
    BTCUSD: { pipValueStandard: 1, unit: isAr ? 'دولار ($)' : 'Dollars' },
    WTI: { pipValueStandard: 10, unit: isAr ? 'سنت (Cents)' : 'Cents' },
    GBPUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips' }
  };

  const currentSpec = instrumentSpecs[symbol] || instrumentSpecs.XAUUSD;

  // Max risk dollar amount
  const dollarRisk = (balance * riskPercent) / 100;

  // Safe lot size calculation: (Dollar Risk) / (SL Pips * Pip Value per 1 lot)
  const calculatedLot = slPips > 0
    ? Math.max(0.01, Math.floor((dollarRisk / (slPips * currentSpec.pipValueStandard)) * 100) / 100)
    : 0.01;

  const pipValueAtCalculatedLot = calculatedLot * currentSpec.pipValueStandard;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#2a2e39]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'حاسبة اللوت وإدارة المخاطر' : 'Position Size & Risk Calculator'}</span>
              </h3>
              <p className="text-xs text-[#787b86]">
                {isAr
                  ? 'احسب حجم العقد الدقيق لحماية رأس المال وفق وقف الخسارة ونسبة المخاطرة'
                  : 'Calculate safe lot size based on account balance & stop loss'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 my-4">
          {/* Instrument Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#787b86] mb-1.5">
              {isAr ? 'زوج التداول / الأداة المالية' : 'Trading Instrument'}
            </label>
            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs font-bold">
              {(['XAUUSD', 'US100', 'EURUSD', 'BTCUSD'] as MarketSymbol[]).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSymbol(sym);
                  }}
                  className={`py-2 rounded-xl border transition-all cursor-pointer ${
                    symbol === sym
                      ? 'bg-white text-[#131722] border-white shadow-sm font-bold'
                      : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Account Balance */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#787b86]">
                {isAr ? 'رأس مال الحساب ($)' : 'Account Balance ($)'}
              </span>
              <span className="font-mono text-white font-bold">${balance.toLocaleString()}</span>
            </div>
            <input
              type="number"
              min="100"
              step="500"
              value={balance}
              onChange={(e) => setBalance(Math.max(100, Number(e.target.value) || 100))}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#089981]"
            />
            {/* Quick Balance Presets */}
            <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[11px]">
              {[1000, 5000, 10000, 25000, 50000, 100000].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBalance(b)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    balance === b
                      ? 'bg-[#089981]/20 border-[#089981] text-[#089981] font-bold'
                      : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                  }`}
                >
                  ${b >= 1000 ? `${b / 1000}k` : b}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#787b86]">
                {isAr ? 'نسبة المخاطرة لكل صفقة (%)' : 'Risk Percentage per Trade (%)'}
              </span>
              <span className="font-mono text-amber-400 font-bold">{riskPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="flex-1 accent-[#089981] cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-white bg-[#131722] px-2.5 py-1 rounded-lg border border-[#2a2e39]">
                {riskPercent}%
              </span>
            </div>
            {/* Quick Risk Pills */}
            <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[11px]">
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskPercent(r)}
                  className={`px-2.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    riskPercent === r
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                      : 'bg-[#131722] border-[#2a2e39] text-[#787b86] hover:text-white'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss Pips */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#787b86]">
                {isAr ? `مسافة وقف الخسارة (${currentSpec.unit})` : `Stop Loss Distance (${currentSpec.unit})`}
              </span>
              <span className="font-mono text-white font-bold">{slPips} {currentSpec.unit}</span>
            </div>
            <input
              type="number"
              min="5"
              max="500"
              value={slPips}
              onChange={(e) => setSlPips(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#089981]"
            />
          </div>

          {/* RESULT BOX */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#131722] to-[#1e222d] border border-[#089981]/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2.5">
              <div>
                <span className="text-xs text-[#787b86] block">
                  {isAr ? 'حجم العقد المقترح الآمن (Recommended Lot Size)' : 'Recommended Safe Lot Size'}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-[#089981]">
                  {calculatedLot} <span className="text-sm font-sans font-normal text-white">Lots</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#089981]/15 border border-[#089981]/30 flex items-center justify-center text-[#089981]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#131722]/80 border border-[#2a2e39]">
                <span className="text-[#787b86] block text-[11px]">
                  {isAr ? 'المخاطرة المالية القصوى' : 'Max Dollar Risk'}
                </span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  -${dollarRisk.toFixed(2)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#131722]/80 border border-[#2a2e39]">
                <span className="text-[#787b86] block text-[11px]">
                  {isAr ? 'قيمة النقطة بهذا اللوت' : 'Pip Value per Point'}
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  ${pipValueAtCalculatedLot.toFixed(2)} / pip
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-[11px] text-[#787b86] flex items-center gap-1.5 border-t border-[#2a2e39]/60">
          <Info className="w-3.5 h-3.5 text-[#089981] shrink-0" />
          <span>
            {isAr
              ? 'تساعدك إدارة رأس المال الصارمة (1-2% لكل صفقة) على البقاء في السوق على المدى الطويل.'
              : 'Strict 1-2% risk per trade ensures sustainable long-term market longevity.'}
          </span>
        </div>
      </div>
    </div>
  );
};
