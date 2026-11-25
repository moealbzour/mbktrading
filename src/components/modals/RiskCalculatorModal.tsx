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
import { MarketSymbol, MarketTicker } from '../../types/trading';

type CalculatorSymbol = MarketSymbol | 'USDCAD' | 'USDJPY';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  defaultSymbol?: MarketSymbol;
  tickers?: MarketTicker[];
}

export const RiskCalculatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'ar',
  defaultSymbol = 'XAUUSD',
  tickers = []
}) => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [slPips, setSlPips] = useState<number>(30);
  const [symbol, setSymbol] = useState<CalculatorSymbol>(defaultSymbol);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const getLiveRate = (sym: string, fallback: number): number => {
    const found = tickers.find((t) => String(t.symbol).toUpperCase() === sym.toUpperCase());
    if (found && Number.isFinite(found.price) && found.price > 0) {
      return found.price;
    }
    return fallback;
  };

  const usdCadRate = getLiveRate('USDCAD', 1.38);
  const usdJpyRate = getLiveRate('USDJPY', 154.0);

  // Institutional broker contract size & pip/point value per 1.00 standard lot:
  // - XAUUSD: 1.00 lot = 100 oz -> $1.00 move = $100/lot (1 pip = 0.10 = $10/lot)
  // - US100: 1.00 lot CFD -> $1.00 per 1.00 index point move ($1/pt/lot)
  // - EURUSD / GBPUSD: 1.00 lot = 100,000 units -> 1 pip (0.0001) = $10/lot
  // - USDCAD: 1.00 lot = 100,000 units -> 1 pip (0.0001 CAD) = $10 / USDCAD
  // - USDJPY: 1.00 lot = 100,000 units -> 1 pip (0.01 JPY) = 1,000 JPY / USDJPY
  // - WTI: 1.00 lot = 1,000 barrels -> $0.01 move = $10/lot
  // - BTCUSD: 1.00 lot = 1 BTC -> $1.00 move = $1/lot
  const instrumentSpecs: Record<CalculatorSymbol, { pipValueStandard: number; unit: string; shortUnit: string }> = {
    XAUUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips', shortUnit: 'pip' },
    US100: { pipValueStandard: 1, unit: isAr ? 'نقاط (Pts)' : 'Points', shortUnit: 'pt' },
    EURUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips', shortUnit: 'pip' },
    GBPUSD: { pipValueStandard: 10, unit: isAr ? 'نقاط (Pips)' : 'Pips', shortUnit: 'pip' },
    USDCAD: {
      pipValueStandard: usdCadRate > 0 ? 10 / usdCadRate : 7.25,
      unit: isAr ? 'نقاط (Pips)' : 'Pips',
      shortUnit: 'pip'
    },
    USDJPY: {
      pipValueStandard: usdJpyRate > 0 ? 1000 / usdJpyRate : 6.49,
      unit: isAr ? 'نقاط (Pips)' : 'Pips',
      shortUnit: 'pip'
    },
    WTI: { pipValueStandard: 10, unit: isAr ? 'سنت (Cents)' : 'Cents', shortUnit: 'pip' },
    BTCUSD: { pipValueStandard: 1, unit: isAr ? 'دولار ($)' : 'Dollars', shortUnit: 'pt' }
  };

  const currentSpec = instrumentSpecs[symbol] || instrumentSpecs.XAUUSD;

  // Strict guards against 0, empty string, negative numbers, or NaN
  const safeBalance = Number.isFinite(balance) && balance > 0 ? balance : 0;
  const safeRiskPercent = Number.isFinite(riskPercent) && riskPercent > 0 ? riskPercent : 0;
  const safeSlPips = Number.isFinite(slPips) && slPips > 0 ? slPips : 0;
  const safePipValue =
    Number.isFinite(currentSpec.pipValueStandard) && currentSpec.pipValueStandard > 0
      ? currentSpec.pipValueStandard
      : 10;

  // Max risk dollar amount
  const rawDollarRisk = (safeBalance * safeRiskPercent) / 100;
  const dollarRisk = Number.isFinite(rawDollarRisk) && rawDollarRisk > 0 ? rawDollarRisk : 0;

  // Safe lot size calculation: (Dollar Risk) / (SL Distance * Pip/Point Value per 1.00 lot)
  const rawLot =
    safeSlPips > 0 && safePipValue > 0 && dollarRisk > 0
      ? dollarRisk / (safeSlPips * safePipValue)
      : 0;
  const calculatedLot =
    Number.isFinite(rawLot) && rawLot > 0
      ? Math.max(0.01, Math.floor(rawLot * 100) / 100)
      : 0.01;

  const rawPipValueAtLot = calculatedLot * safePipValue;
  const pipValueAtCalculatedLot =
    Number.isFinite(rawPipValueAtLot) && rawPipValueAtLot >= 0 ? rawPipValueAtLot : 0;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-[#FFFFFF]/90 dark:bg-[#131722]/50 dark:bg-black/85 dark:backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      <div className="bg-[#F8F9FD] dark:bg-[#1e222d] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-2xl relative text-[#131722] dark:text-[#d1d4dc] my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E0E3EB] dark:border-[#2a2e39]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF1F7] dark:bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-[#1E53E5] dark:text-blue-400 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#131722] dark:text-white flex items-center gap-2">
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
            className="p-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#131722] hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] border border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white transition-colors cursor-pointer"
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
                      ? 'bg-[#131722] dark:bg-white text-white dark:text-[#131722] border-white shadow-sm font-bold'
                      : 'bg-[#FFFFFF] dark:bg-[#131722] border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white'
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
              <span className="font-mono text-[#131722] dark:text-white font-bold">${safeBalance.toLocaleString()}</span>
            </div>
            <input
              type="number"
              min="100"
              step="500"
              value={balance}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                setBalance(Number.isFinite(parsed) && parsed > 0 ? Math.max(100, parsed) : 100);
              }}
              className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-xl px-3 py-2 text-sm font-mono text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#089981]"
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
                      ? 'bg-[#E6F5F2] dark:bg-[#089981]/20 border-[#089981] text-[#089981] font-bold'
                      : 'bg-[#FFFFFF] dark:bg-[#131722] border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white'
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
              <span className="font-mono text-[#9A6700] dark:text-amber-400 font-bold">{safeRiskPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={safeRiskPercent}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  setRiskPercent(Number.isFinite(parsed) && parsed > 0 ? parsed : 0.5);
                }}
                className="flex-1 accent-[#089981] cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-[#131722] dark:text-white bg-[#FFFFFF] dark:bg-[#131722] px-2.5 py-1 rounded-lg border border-[#E0E3EB] dark:border-[#2a2e39]">
                {safeRiskPercent}%
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
                      ? 'bg-[#FDF6E3] dark:bg-amber-500/20 border-amber-500 text-[#9A6700] dark:text-amber-400 font-bold'
                      : 'bg-[#FFFFFF] dark:bg-[#131722] border-[#E0E3EB] dark:border-[#2a2e39] text-[#787b86] hover:text-[#131722] dark:hover:text-white'
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
              <span className="font-mono text-[#131722] dark:text-white font-bold">{safeSlPips} {currentSpec.unit}</span>
            </div>
            <input
              type="number"
              min="1"
              max="5000"
              value={slPips}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                setSlPips(Number.isFinite(parsed) && parsed > 0 ? Math.max(1, parsed) : 1);
              }}
              className="w-full bg-[#FFFFFF] dark:bg-[#131722] border border-[#E0E3EB] dark:border-[#2a2e39] rounded-xl px-3 py-2 text-sm font-mono text-[#131722] dark:text-white focus:outline-none focus:border-[#1E53E5] dark:focus:border-[#089981]"
            />
          </div>

          {/* RESULT BOX */}
          <div className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-gradient-to-br dark:from-[#131722] dark:to-[#1e222d] border border-[#B3E2D9] dark:border-[#089981]/50 shadow-[0_1px_2px_rgba(19,23,34,0.04)] dark:shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#E0E3EB] dark:border-[#2a2e39] pb-2.5">
              <div>
                <span className="text-xs text-[#787b86] block">
                  {isAr ? 'حجم العقد المقترح الآمن (Recommended Lot Size)' : 'Recommended Safe Lot Size'}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-[#089981]">
                  {calculatedLot} <span className="text-sm font-sans font-normal text-[#131722] dark:text-white">Lots</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#E6F5F2] dark:bg-[#089981]/15 border border-[#B3E2D9] dark:border-[#089981]/30 flex items-center justify-center text-[#089981]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#FFFFFF]/95 dark:bg-[#131722]/80 border border-[#E0E3EB] dark:border-[#2a2e39]">
                <span className="text-[#787b86] block text-[11px]">
                  {isAr ? 'المخاطرة المالية القصوى' : 'Max Dollar Risk'}
                </span>
                <span className="font-mono font-bold text-[#9A6700] dark:text-amber-400 text-sm">
                  -${dollarRisk.toFixed(2)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#FFFFFF]/95 dark:bg-[#131722]/80 border border-[#E0E3EB] dark:border-[#2a2e39]">
                <span className="text-[#787b86] block text-[11px]">
                  {isAr ? 'قيمة النقطة بهذا اللوت' : 'Pip Value per Point'}
                </span>
                <span className="font-mono font-bold text-[#131722] dark:text-white text-sm">
                  ${pipValueAtCalculatedLot.toFixed(2)} / {currentSpec.shortUnit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-[11px] text-[#787b86] flex items-center gap-1.5 border-t border-[#E0E3EB] dark:border-[#2a2e39]/60">
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
