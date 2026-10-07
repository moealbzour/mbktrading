import React, { useState } from 'react';
import { CopyTradingMaster } from '../types/trading';
import {
  Copy,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  Users,
  Award,
  Sliders,
  ExternalLink,
  Zap,
  HelpCircle
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  masterProfile: CopyTradingMaster;
  onOpenBrokerModal: () => void;
}

export const CopyTradingPanel: React.FC<Props> = ({
  masterProfile,
  onOpenBrokerModal
}) => {
  const [multiplier, setMultiplier] = useState(masterProfile.copierMultiplier);
  const [isSynced, setIsSynced] = useState(masterProfile.isSynced);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [mtAccount, setMtAccount] = useState('');
  const [mtBroker, setMtBroker] = useState('الوسيط المعتمد (ECN Broker)');

  const handleSyncToggle = () => {
    soundManager.playClick();
    setIsSynced(!isSynced);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-cyan-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center text-amber-400">
              <Copy className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>خدمة نسخ الصفقات المباشرة (MBK Copy-Trading)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Master Trader
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              اربط حسابك تلقائياً لنسخ صفقات نظام التداول المؤسسي المعتمد بنفس اللحظة وبإدارة مخاطر محسوبة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-sm shadow-cyan-600/30 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>ربط حساب تداول جديد (MT4 / MT5)</span>
          </button>
        </div>
      </div>

      {/* Master Trader Profile Showcase */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-b from-[#141d2e] to-[#0f1726]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 border-2 border-amber-500/40 shadow-xl flex items-center justify-center text-cyan-200 font-mono font-black text-xl">
                MBK
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
                MASTER
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-100">{masterProfile.name}</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  موثق 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{masterProfile.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <strong className="text-slate-200">{masterProfile.totalCopiers}</strong> ناسخ نشط
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold">
                  حجم المحافظ المدارة: {masterProfile.managedEquity}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncToggle}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                isSynced
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isSynced ? 'النسخ متصل ومفعل بحسابك ✓' : 'تفعيل نسخ الصفقات الآن'}</span>
            </button>
          </div>
        </div>

        {/* Performance KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-[#0b1019] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">إجمالي الأرباح التاريخية:</span>
            <span className="text-lg font-black text-emerald-400 font-mono tabular-nums">
              {masterProfile.allTimeGain}
            </span>
            <span className="text-[10px] text-emerald-500/80 block mt-0.5 font-bold">
              أرباح الشهر الحالي: {masterProfile.monthlyGain}
            </span>
          </div>

          <div className="bg-[#0b1019] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">نسبة نجاح الصفقات (Win Rate):</span>
            <span className="text-lg font-black text-amber-300 font-mono tabular-nums">
              {masterProfile.winRate}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">من أصل 640+ صفقة</span>
          </div>

          <div className="bg-[#0b1019] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">أقصى تراجع للمحفظة (Max Drawdown):</span>
            <span className="text-lg font-black text-cyan-300 font-mono tabular-nums">
              {masterProfile.currentDrawdown}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">إدارة مخاطر صارمة جداً</span>
          </div>

          <div className="bg-[#0b1019] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">تقاسم الأرباح (Profit Share):</span>
            <span className="text-lg font-black text-slate-100 font-mono tabular-nums">
              {masterProfile.profitSharePercent}%
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5 font-bold">
              مجاناً 0% مع وسيط الشراكة المعتمد
            </span>
          </div>
        </div>
      </div>

      {/* Copy Settings & Multiplier Controls */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Risk Multiplier Slider */}
        <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>مضاعف حجم العقود (Risk Multiplier):</span>
            </span>
            <span className="text-sm font-black text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
              {multiplier}x
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            يحدد حجم العقد بالنسبة لحجم صفقات المتداول الرئيسي. القيمة الموصى بها هي 1.0x (أو 0.5x للمحافظ الصغيرة).
          </p>

          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.1"
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0.2x (حذر جداً)</span>
            <span>1.0x (متطابق تماماً)</span>
            <span>2.0x (مخاطرة مضاعفة)</span>
          </div>
        </div>

        {/* Free Access via Partner Broker Info */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#1a2333] to-[#121824] border border-amber-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="text-xs font-bold">نسخ مجاني مدى الحياة بدون عمولة أرباح</h4>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            عند فتح حساب وتفعيله مع وسيطنا المعتمد برابط الوكالة الرسمي، يتم إعفاؤك من نسبة الـ 20% لتقاسم الأرباح وتحصل على ربط مباشر وسريع عبر خوادم London LD4.
          </p>

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={onOpenBrokerModal}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-md shadow-amber-500/20"
            >
              افتح حساب مع الوسيط المعتمد مجاناً
            </button>
            <span className="text-[11px] text-slate-400 font-mono">الحد الأدنى: ${masterProfile.minCapital}</span>
          </div>
        </div>
      </div>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161f30] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>ربط حساب التداول للنسخ الآلي</span>
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">رقم حساب التداول (MT4 / MT5 Login):</label>
                <input
                  type="text"
                  placeholder="مثال: 8840219"
                  value={mtAccount}
                  onChange={(e) => setMtAccount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">الوسيط المالي (Broker):</label>
                <select
                  value={mtBroker}
                  onChange={(e) => setMtBroker(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                >
                  <option value="الوسيط المعتمد (ECN Broker)">الوسيط المعتمد لـ MBK (مجاني 0% عمولة)</option>
                  <option value="IC Markets">IC Markets</option>
                  <option value="Exness">Exness</option>
                  <option value="XM Global">XM Global</option>
                  <option value="Pepperstone">Pepperstone</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">كلمة مرور المستثمر (Investor Password - Read Only):</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  🔒 كلمة مرور القراءة فقط للمستثمر تضمن أمان حسابك وأنه لا يمكن لأحد سحب سنت واحد من أموالك.
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  setIsSynced(true);
                  setShowConnectModal(false);
                }}
                className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                تأكيد وبدء المزامنة الفورية
              </button>
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
