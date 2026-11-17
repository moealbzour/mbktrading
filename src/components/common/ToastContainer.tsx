import React from 'react';
import { Bell, ShieldAlert, Sparkles, X, TrendingUp, TrendingDown } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: 'signal' | 'bot' | 'info' | 'success';
  symbol?: string;
  action?: 'BUY' | 'SELL';
  timestamp?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isBuy = toast.action === 'BUY';
        const isBot = toast.type === 'bot';
        const isInfoOrSuccess = toast.type === 'info' || toast.type === 'success';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-[#1e222d]/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl text-white transform transition-all duration-300 animate-in fade-in slide-in-from-top-4"
            style={{
              borderColor: isBot
                ? 'rgba(234, 179, 8, 0.4)'
                : isInfoOrSuccess
                ? 'rgba(6, 182, 212, 0.45)'
                : isBuy
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(244, 63, 94, 0.4)'
            }}
          >
            {/* Icon Badge */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isBot
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : isInfoOrSuccess
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : isBuy
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isBot ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : isInfoOrSuccess ? (
                <Bell className="w-5 h-5 animate-pulse" />
              ) : isBuy ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">{toast.title}</span>
                  {toast.symbol && (
                    <span className="px-2 py-0.5 rounded-md bg-[#2a2e39] text-[#22c55e] font-mono text-xs font-bold border border-[#363a45]">
                      {toast.symbol}
                    </span>
                  )}
                  {toast.action && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {toast.action}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#787b86] shrink-0">
                  {toast.timestamp || 'الآن'}
                </span>
              </div>
              <p className="text-xs text-[#b2b5be] line-clamp-2 leading-relaxed dir-rtl">
                {toast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#787b86] hover:text-white p-1 rounded-lg hover:bg-[#2a2e39] transition-colors shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
