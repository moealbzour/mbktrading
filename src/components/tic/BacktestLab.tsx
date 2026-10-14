import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Play,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Calculator,
  Target,
  Sparkles
} from 'lucide-react';
import { BacktestLog } from '../../types/trading';
import { soundManager } from '../../utils/audio';

const INITIAL_BACKTESTS: BacktestLog[] = [
  {
    id: 'bt-1',
    symbol: 'US100',
    playbookTitle: 'London Open Liquidity Sweep',
    timeframe: '5M',
    direction: 'LONG',
    entryPrice: 20420.0,
    slPrice: 20380.0,
    tpPrice: 20540.0,
    outcome: 'WIN',
    rMultiple: 3.0,
    notes: 'سحب سيولة قاع آسيا مع تشكيل MSS واضح وإعادة اختبار FVG.',
    date: '2026-10-12'
  },
  {
    id: 'bt-2',
    symbol: 'US100',
    playbookTitle: 'ICT Silver Bullet (10-11 AM)',
    timeframe: '1M',
    direction: 'LONG',
    entryPrice: 20510.0,
    slPrice: 20485.0,
    tpPrice: 20585.0,
    outcome: 'WIN',
    rMultiple: 3.0,
    notes: 'استهداف سيولة القمة السابقة بدقة خلال نافذة 10:00 صباحاً.',
    date: '2026-10-11'
  },
  {
    id: 'bt-3',
    symbol: 'XAUUSD',
    playbookTitle: 'Institutional Order Block Retest',
    timeframe: '15M',
    direction: 'SHORT',
    entryPrice: 2685.0,
    slPrice: 2692.0,
    tpPrice: 2664.0,
    outcome: 'WIN',
    rMultiple: 3.0,
    notes: 'ملامسة البلوك البيعي مع ظهور ذيل رفض قوي وتأكيد هبوطي.',
    date: '2026-10-10'
  },
  {
    id: 'bt-4',
    symbol: 'EURUSD',
    playbookTitle: 'London Open Liquidity Sweep',
    timeframe: '15M',
    direction: 'LONG',
    entryPrice: 1.0910,
    slPrice: 1.0890,
    tpPrice: 1.0900,
    outcome: 'LOSS',
    rMultiple: -1.0,
    notes: 'استمرار الزخم البيعي دون احترام منطقة الفجوة السعرية.',
    date: '2026-10-09'
  }
];

export const BacktestLab: React.FC = () => {
  const [logs, setLogs] = useState<BacktestLog[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_tic_backtests');
      return saved ? JSON.parse(saved) : INITIAL_BACKTESTS;
    } catch {
      return INITIAL_BACKTESTS;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<{
    symbol: string;
    playbookTitle: string;
    timeframe: string;
    direction: 'LONG' | 'SHORT';
    entryPrice: string;
    slPrice: string;
    tpPrice: string;
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
    rMultiple: string;
    notes: string;
  }>({
    symbol: 'US100',
    playbookTitle: 'London Open Liquidity Sweep',
    timeframe: '5M',
    direction: 'LONG',
    entryPrice: '',
    slPrice: '',
    tpPrice: '',
    outcome: 'WIN',
    rMultiple: '2.5',
    notes: ''
  });

  const saveLogs = (updated: BacktestLog[]) => {
    setLogs(updated);
    try {
      localStorage.setItem('mbk_tic_backtests', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(newLog.entryPrice) || 0;
    const sl = parseFloat(newLog.slPrice) || 0;
    const tp = parseFloat(newLog.tpPrice) || 0;
    const r = parseFloat(newLog.rMultiple) || (newLog.outcome === 'WIN' ? 2.5 : -1);

    const created: BacktestLog = {
      id: `bt-${Date.now()}`,
      symbol: newLog.symbol,
      playbookTitle: newLog.playbookTitle,
      timeframe: newLog.timeframe,
      direction: newLog.direction,
      entryPrice: entry,
      slPrice: sl,
      tpPrice: tp,
      outcome: newLog.outcome,
      rMultiple: r,
      notes: newLog.notes || 'تسجيل محاكاة باك تيست لاختبار الاستراتيجية.',
      date: new Date().toISOString().split('T')[0]
    };

    soundManager.playSuccess();
    saveLogs([created, ...logs]);
    setIsModalOpen(false);
    setNewLog({
      symbol: 'US100',
      playbookTitle: 'London Open Liquidity Sweep',
      timeframe: '5M',
      direction: 'LONG',
      entryPrice: '',
      slPrice: '',
      tpPrice: '',
      outcome: 'WIN',
      rMultiple: '2.5',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    soundManager.playClick();
    saveLogs(logs.filter((l) => l.id !== id));
  };

  // Mathematical Expectancy Calculations
  const total = logs.length;
  const wins = logs.filter((l) => l.outcome === 'WIN');
  const losses = logs.filter((l) => l.outcome === 'LOSS');
  const winRate = total > 0 ? wins.length / total : 0.75;
  const lossRate = 1 - winRate;

  const avgWinR = wins.length > 0 ? wins.reduce((acc, l) => acc + l.rMultiple, 0) / wins.length : 3.0;
  const avgLossR = losses.length > 0 ? Math.abs(losses.reduce((acc, l) => acc + l.rMultiple, 0) / losses.length) : 1.0;

  // System Mathematical Expectancy E = (W% * AvgWin) - (L% * AvgLoss)
  const expectancy = (winRate * avgWinR - lossRate * avgLossR).toFixed(2);
  const totalR = logs.reduce((acc, l) => acc + l.rMultiple, 0).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/95 via-[#0e1628] to-slate-900/95 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK BACKTEST LAB • مختبر الباك تيست ومحاكاة الاستراتيجيات
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Statistical Edge
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                أعد تشغيل الشارت تاريخياً، اختبر التزامك بالنماذج، وتأكد من الجدوى الإحصائية (Expectancy) قبل المخاطرة بأموالك
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل تجربة باك تيست جديدة</span>
          </button>
        </div>

        {/* MATHEMATICAL EXPECTANCY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">الجدوى الرياضية (Expectancy)</span>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-400">+{expectancy}R</span>
            </div>
            <span className="text-[10px] text-slate-500">متوسط الربح المتوقع لكل صفقة</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">معدل الفوز المحاكى (Win Rate)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-cyan-400">{Math.round(winRate * 100)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{wins.length} رابحة من {total}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">متوسط العائد للرابحة (Avg Win)</span>
            <span className="text-lg sm:text-xl font-black font-mono text-amber-400">+{avgWinR.toFixed(1)}R</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">مقابل خسارة -1.0R</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">إجمالي العائد التراكمي</span>
            <span className="text-lg sm:text-xl font-black font-mono text-indigo-400">+{totalR}R</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">تطابق مع شروط Playbook</span>
          </div>
        </div>
      </div>

      {/* 2. LOGS TABLE */}
      <div className="bg-[#101624] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0b0f17] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">سجل تجارب الباك تيست ({logs.length})</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#0e1320] text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="p-3.5 font-bold">الأصل / الاتجاه</th>
                <th className="p-3.5 font-bold">النموذج المختبر (Playbook)</th>
                <th className="p-3.5 font-bold">الفريم الزمني</th>
                <th className="p-3.5 font-bold">النتيجة</th>
                <th className="p-3.5 font-bold">العائد (R-Multiple)</th>
                <th className="p-3.5 font-bold">الملاحظات</th>
                <th className="p-3.5 font-bold">التاريخ</th>
                <th className="p-3.5 font-bold text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 font-mono text-sm">{log.symbol}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.direction === 'LONG'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.direction}
                      </span>
                    </div>
                  </td>

                  <td className="p-3.5 font-medium text-slate-200">{log.playbookTitle}</td>
                  <td className="p-3.5 font-mono text-slate-400">{log.timeframe}</td>

                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        log.outcome === 'WIN'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {log.outcome === 'WIN' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>ناجحة</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>خاسرة</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono font-bold">
                    <span className={log.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {log.rMultiple >= 0 ? `+${log.rMultiple}R` : `${log.rMultiple}R`}
                    </span>
                  </td>

                  <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">{log.notes}</td>
                  <td className="p-3.5 font-mono text-slate-500 text-[11px]">{log.date}</td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL: LOG NEW BACKTEST */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121927] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-slate-100">تسجيل محاكاة باك تيست</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">الأصل المالي</label>
                  <select
                    value={newLog.symbol}
                    onChange={(e) => setNewLog({ ...newLog, symbol: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="US100">ناسداك (US100)</option>
                    <option value="XAUUSD">الذهب (XAUUSD)</option>
                    <option value="EURUSD">اليورو (EURUSD)</option>
                    <option value="BTCUSD">البيتكوين (BTCUSD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الاتجاه</label>
                  <select
                    value={newLog.direction}
                    onChange={(e) => setNewLog({ ...newLog, direction: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LONG">شراء (LONG)</option>
                    <option value="SHORT">بيع (SHORT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">النموذج المختبر</label>
                <select
                  value={newLog.playbookTitle}
                  onChange={(e) => setNewLog({ ...newLog, playbookTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="London Open Liquidity Sweep">London Open Liquidity Sweep</option>
                  <option value="ICT Silver Bullet (10-11 AM)">ICT Silver Bullet (10-11 AM NY)</option>
                  <option value="Institutional Order Block Retest">Institutional Order Block Retest</option>
                  <option value="Fair Value Gap Inversion">Fair Value Gap Inversion</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">النتيجة</label>
                  <select
                    value={newLog.outcome}
                    onChange={(e) => setNewLog({ ...newLog, outcome: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="WIN">صفقة رابحة (WIN)</option>
                    <option value="LOSS">صفقة خاسرة (LOSS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">العائد (R-Multiple)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLog.rMultiple}
                    onChange={(e) => setNewLog({ ...newLog, rMultiple: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ملاحظات التحليل</label>
                <textarea
                  rows={2}
                  placeholder="كيف تفاعل السعر مع منطقة الدخول؟"
                  value={newLog.notes}
                  onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
                >
                  حفظ في مختبر الباك تيست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
