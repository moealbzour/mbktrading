import React, { useState } from 'react';
import { TradeSignal } from '../types/trading';
import {
  ChevronUp,
  ChevronDown,
  Radio,
  Lock,
  Ticket,
  ExternalLink,
  Target,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  signals: TradeSignal[];
  isVip: boolean;
  onOpenPromoModal: () => void;
  onSelectSignal?: (sig: TradeSignal) => void;
}

export const MobileSignalDrawer: React.FC<Props> = ({
  signals,
  isVip,
  onOpenPromoModal,
  onSelectSignal
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeSignals = signals.filter((s) => s.status === 'ACTIVE' || s.status === 'TP1_HIT');
  const topSignal = activeSignals[0] || signals[0];

  const handleToggle = () => {
    soundManager.playClick();
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`fixed left-0 right-0 z-40 bg-[#0d1424]/95 backdrop-blur-xl border-t border-[#1E2638] transition-all duration-300 ease-in-out font-['Cairo',sans-serif] md:hidden shadow-[0_-10px_35px_rgba(0,0,0,0.7)] ${
        isOpen ? 'bottom-[60px] max-h-[70vh] rounded-t-2xl' : 'bottom-[56px] h-12 rounded-t-xl'
      }`}
    >
      {/* Drawer Handle & Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-200 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-cyan-400 font-mono text-[11px] font-bold">إشارات Webhook اللحظية</span>
          {topSignal && !isOpen && (
            <span className="text-slate-300 font-mono text-[11px] truncate max-w-[190px]">
              {topSignal.type === 'BUY' ? '🟢 شراء' : '🔴 بيع'} {topSignal.symbol} @ {topSignal.entryPrice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[10px] text-slate-400">{isOpen ? 'تصغير' : 'عرض التوصيات'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronUp className="w-4 h-4 text-cyan-400" />}
        </div>
      </button>

      {/* Expanded Sheet Content */}
      {isOpen && (
        <div className="p-4 overflow-y-auto max-h-[calc(70vh-48px)] space-y-3 pb-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
            <span className="text-slate-400 font-mono">
              {activeSignals.length} إشارة نشطة مؤكدة من باين سكريبت
            </span>
            {!isVip && (
              <button
                onClick={onOpenPromoModal}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <Ticket className="w-3 h-3" />
                <span>فك قفل الأهداف الكاملة</span>
              </button>
            )}
          </div>

          {signals.slice(0, 5).map((sig, idx) => {
            const isLocked = !isVip && idx > 0;
            const isBuy = sig.type === 'BUY';

            return (
              <div
                key={sig.id}
                onClick={() => onSelectSignal && onSelectSignal(sig)}
                className={`p-3 rounded-xl border relative transition-all ${
                  isLocked
                    ? 'bg-[#101626]/80 border-slate-800'
                    : 'bg-[#141d2e] border-slate-700/80 hover:border-cyan-500/50'
                }`}
              >
                {/* Free User Blur Cover */}
                {isLocked && (
                  <div className="absolute inset-0 bg-[#0c121d]/85 backdrop-blur-[4px] rounded-xl z-10 flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">
                        إشارة VIP لحظية ({sig.symbol})
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPromoModal();
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] cursor-pointer"
                    >
                      تفعيل VIP
                    </button>
                  </div>
                )}

                {/* Signal Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                        isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isBuy ? 'BUY شراء' : 'SELL بيع'}
                    </span>
                    <span className="font-bold text-slate-100 text-xs font-mono">{sig.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({sig.timeframe})</span>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    +{sig.pips} Pips
                  </span>
                </div>

                {/* Levels Grid */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-[#090e18] p-2 rounded-lg text-center">
                  <div>
                    <span className="text-slate-500 block">الدخول:</span>
                    <span className="text-slate-200 font-bold">{sig.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500 block">الهدف 1:</span>
                    <span className="text-emerald-400 font-bold">{sig.tp1}</span>
                  </div>
                  <div>
                    <span className="text-rose-500 block">الوقف:</span>
                    <span className="text-rose-400 font-bold">{sig.sl}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
