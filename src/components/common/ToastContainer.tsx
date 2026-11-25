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

        const borderAccentClass = isBot
          ? 'border-[#EFE0B4] dark:border-amber-500/40'
          : isInfoOrSuccess
          ? 'border-[#CBD2DF] dark:border-cyan-500/45'
          : isBuy
          ? 'border-[#B3E2D9] dark:border-emerald-500/40'
          : 'border-[#F5C2C7] dark:border-rose-500/40';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#1e222d]/95 dark:backdrop-blur-xl border ${borderAccentClass} shadow-[0_4px_16px_rgba(19,23,34,0.08)] dark:shadow-2xl text-[#131722] dark:text-white transform transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
          >
            {/* Icon Badge */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isBot
                  ? 'bg-[#FDF6E3] dark:bg-amber-500/20 text-[#9A6700] dark:text-amber-400 border border-[#EFE0B4] dark:border-amber-500/30'
                  : isInfoOrSuccess
                  ? 'bg-[#EDF1F7] dark:bg-cyan-500/20 text-[#1E53E5] dark:text-cyan-400 border border-[#CBD2DF] dark:border-cyan-500/30'
                  : isBuy
                  ? 'bg-[#E6F5F2] dark:bg-emerald-500/20 text-[#089981] dark:text-emerald-400 border border-[#B3E2D9] dark:border-emerald-500/30'
                  : 'bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-400 border border-[#F5C2C7] dark:border-rose-500/30'
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
                  <span className="font-bold text-sm text-[#131722] dark:text-white">{toast.title}</span>
                  {toast.symbol && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F8F9FD] dark:bg-[#2a2e39] text-[#089981] dark:text-[#22c55e] font-mono text-xs font-bold border border-[#E0E3EB] dark:border-[#363a45]">
                      {toast.symbol}
                    </span>
                  )}
                  {toast.action && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isBuy
                          ? 'bg-[#E6F5F2] dark:bg-emerald-500/20 text-[#089981] dark:text-emerald-400'
                          : 'bg-[#FDECEE] dark:bg-rose-500/20 text-[#D93848] dark:text-rose-400'
                      }`}
                    >
                      {toast.action}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#787B86] dark:text-[#787b86] shrink-0">
                  {toast.timestamp || 'الآن'}
                </span>
              </div>
              <p className="text-xs text-[#4A5162] dark:text-[#b2b5be] line-clamp-2 leading-relaxed dir-rtl">
                {toast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#787B86] hover:text-[#131722] dark:hover:text-white p-1 rounded-lg hover:bg-[#EDF1F7] dark:hover:bg-[#2a2e39] transition-colors shrink-0 cursor-pointer"
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
