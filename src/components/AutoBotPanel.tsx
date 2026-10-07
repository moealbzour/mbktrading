import React, { useState } from 'react';
import { BotState, BotStrategy, BotLogEntry } from '../types/trading';
import {
  Cpu,
  Play,
  Square,
  ShieldAlert,
  Server,
  Zap,
  CheckCircle,
  Activity,
  Sliders,
  TrendingUp,
  Terminal,
  RefreshCw,
  Clock
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  botState: BotState;
  botLogs: BotLogEntry[];
  onToggleBot: () => void;
  onUpdateStrategy: (strat: BotStrategy) => void;
  onUpdateRisk: (risk: number) => void;
  onUpdateLimit: (limit: number) => void;
  onClearLogs?: () => void;
}

export const AutoBotPanel: React.FC<Props> = ({
  botState,
  botLogs,
  onToggleBot,
  onUpdateStrategy,
  onUpdateRisk,
  onUpdateLimit
}) => {
  const [trailingStop, setTrailingStop] = useState(botState.trailingStopActive);
  const [autoRiskGuard, setAutoRiskGuard] = useState(true);

  const strategies: { id: BotStrategy; nameAr: string; descAr: string; target: string }[] = [
    {
      id: 'SCALPING_NASDAQ',
      nameAr: 'خوارزمية سكالبينغ ناسداك (MBK Scalp M1/M5)',
      descAr: 'مضاربة سريعة على كسر كتل الأوامر أثناء افتتاح نيويورك',
      target: 'US100'
    },
    {
      id: 'GOLD_TREND_RIDER',
      nameAr: 'راكب اتجاه الذهب (Gold Trend Rider H1)',
      descAr: 'اقتناص الموجات الكبرى على الذهب بنسب عائد تتجاوز 1:3',
      target: 'XAUUSD'
    },
    {
      id: 'LONDON_BREAKOUT',
      nameAr: 'ماتريكس كسر نطاق لندن (London Breakout)',
      descAr: 'رصد السيولة الفجائية عند جرس الافتتاح الأوروبي 08:00 UTC',
      target: 'EURUSD / GBPUSD'
    },
    {
      id: 'MBK_ALLIGATOR_FLOW',
      nameAr: 'تدفق التمساح والكسيريات (MBK Alligator Flow)',
      descAr: 'دخول متوافق مع اتساع خطوط التمساح وتأكيد كسر الكسيريات',
      target: 'جميع الأصول'
    }
  ];

  const handleToggle = () => {
    soundManager.playClick();
    onToggleBot();
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Bot Top Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              botState.isRunning
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100">
                لوحة تحكم البوت الآلي (MBK Auto-Trader)
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  botState.isRunning
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    botState.isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span>{botState.isRunning ? 'البوت نشط ويتداول' : 'البوت متوقف'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              خوارزميات تنفيذ صفقات فورية مبرمجة على خوادم ميتاتريدر 5 بدون تدخل يدوي
            </p>
          </div>
        </div>

        {/* Master Start / Stop Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
              botState.isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30'
            }`}
          >
            {botState.isRunning ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>إيقاف تشغيل البوت (Stop Bot)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>تشغيل التداول الآلي (Start Bot)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Bot Grid */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Strategy & Parameters Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* VPS & Execution Status Card */}
          <div className="p-3.5 rounded-xl bg-[#0c121d] border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">خادم التنفيذ (VPS Live Bridge):</span>
                <span className="font-mono font-bold text-slate-200">{botState.mt5Server}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block font-sans">الرصيد / السيولة (Equity):</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  ${botState.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                زمن الاستجابة: 1.8ms
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>اختر استراتيجية التداول الآلي النشطة:</span>
              <span className="text-cyan-400 text-[11px] font-normal">
                مبنية على مؤشرات MBK الخاصة
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {strategies.map((strat) => {
                const isSelected = botState.selectedStrategy === strat.id;
                return (
                  <div
                    key={strat.id}
                    onClick={() => onUpdateStrategy(strat.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-[#151c2a] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-100">{strat.nameAr}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                        {strat.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{strat.descAr}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk & Order Management Controls */}
          <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800/90 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>إعدادات إدارة المخاطر وتأمين الصفقات (Risk Management)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Risk % selector */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  نسبة المخاطرة لكل صفقة (Risk %):
                </label>
                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((r) => (
                    <button
                      key={r}
                      onClick={() => onUpdateRisk(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        botState.riskPercentage === r
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade limit */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  الحد الأقصى للصفقات المتزامنة:
                </label>
                <select
                  value={botState.tradeLimit}
                  onChange={(e) => onUpdateLimit(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value={3}>3 صفقات (متحفظ)</option>
                  <option value={5}>5 صفقات (متوسط)</option>
                  <option value={10}>10 صفقات (سكالبينغ نشط)</option>
                  <option value={15}>15 صفقة (مكثف)</option>
                </select>
              </div>

              {/* Trailing Stop & Risk Guard Toggles */}
              <div className="flex flex-col justify-end gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trailingStop}
                    onChange={(e) => setTrailingStop(e.target.checked)}
                    className="rounded accent-cyan-500 w-3.5 h-3.5"
                  />
                  <span>وقف خسارة متحرك (Trailing Stop)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRiskGuard}
                    onChange={(e) => setAutoRiskGuard(e.target.checked)}
                    className="rounded accent-cyan-500 w-3.5 h-3.5"
                  />
                  <span>حماية السبريد وأوقات الأخبار الحادة</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bot Execution Performance & Live Console */}
        <div className="space-y-4">
          {/* Performance Summary Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121d2f] to-[#0c121d] border border-cyan-500/30 shadow-lg">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
              إجمالي أرباح البوت اليوم (P&L):
            </span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                +${botState.todayPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                {botState.winRate}% دقة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-2 text-slate-400">
              <div>
                <span>عدد الصفقات:</span>
                <span className="text-slate-200 font-mono font-bold mr-1">
                  {botState.totalTradesToday}
                </span>
              </div>
              <div>
                <span>الصفقات الرابحة:</span>
                <span className="text-emerald-400 font-mono font-bold mr-1">
                  {botState.successfulTrades}
                </span>
              </div>
            </div>
          </div>

          {/* Live Webhook Execution Console Log */}
          <div className="rounded-xl bg-[#080d14] border border-slate-800 overflow-hidden text-xs">
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>سجل التنفيذ اللحظي (Execution Console)</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto font-mono text-[11px] text-slate-300">
              {botLogs.map((log) => {
                let badgeColor = 'text-cyan-400';
                if (log.level === 'SUCCESS') badgeColor = 'text-emerald-400';
                if (log.level === 'ALERT') badgeColor = 'text-amber-400';
                if (log.level === 'TRADE') badgeColor = 'text-sky-300';

                return (
                  <div key={log.id} className="leading-relaxed border-b border-slate-900 pb-1.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={`font-bold ${badgeColor}`}>[{log.level}]</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{log.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
