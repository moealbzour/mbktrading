import React, { useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertOctagon,
  Target,
  Clock,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { PlaybookItem } from '../../types/trading';
import { soundManager } from '../../utils/audio';

const INITIAL_PLAYBOOKS: PlaybookItem[] = [
  {
    id: 'pb-1',
    title: 'London Open Liquidity Sweep',
    titleAr: 'سحب سيولة افتتاح لندن (Asian Sweep + MSS)',
    category: 'ICT_SMC',
    timeframe: '5M - 15M',
    recommendedSessions: ['London Open (07:00 - 09:30 UTC)'],
    descriptionAr: 'استراتيجية صيد سيولة جلسة آسيا حيث يقوم صانع السوق بالاختراق الوهمي لقمة أو قاع آسيا قبل الانعكاس المؤسسي السريع باتجاه سيولة الجلسة المقابلة.',
    checklist: [
      'تحديد أعلى وأدنى سعر لجلسة آسيا (Asian High & Low)',
      'انتظار سحب السيولة خارج النطاق بشمعة سريعة (Judas Swing)',
      'تأكيد كسر هيكل السوق الداخلي (MSS) بشمعة قوية وواضحة',
      'تحديد الفجوة السعرية العادلة (FVG) المتشكلة أثناء الاندفاع',
      'الدخول بأمر معلق عند خط توازن الفجوة (50% FVG Equilibrium)'
    ],
    invalidationRules: [
      'إغلاق شمعة فريم 15 دقيقة خلف ذيل الشمعة التي سحبت سيولة آسيا يبطل الفكرة فورياً',
      'فشل تشكيل كسر هيكلي (MSS) خلال 45 دقيقة من سحب السيولة'
    ],
    takeProfitRules: [
      'الهدف الأول TP1: إغلاق 50% من العقود عند عائد 1:2 R:R ونقل الوقف إلى نقطة الدخول (Breakeven)',
      'الهدف الثاني TP2: استهداف سيولة الجانب المقابل (Opposing Liquidity Pool) بنسبة 1:3+ R:R'
    ],
    winRate: 78,
    tradesCount: 46,
    avgRiskReward: '1:2.8',
    isBuiltIn: true
  },
  {
    id: 'pb-2',
    title: 'ICT Silver Bullet (10-11 AM NY)',
    titleAr: 'الرصاصة الفضية (ICT Silver Bullet Window)',
    category: 'ICT_SMC',
    timeframe: '1M - 5M',
    recommendedSessions: ['New York Morning (10:00 - 11:00 AM NY)'],
    descriptionAr: 'نافذة الخوارزميات المؤسسية الصباحية في بورصة نيويورك حيث يتم تسليم الأسعار باتجاه أهداف سيولة واضحة بدقة هندسية.',
    checklist: [
      'بدء مراقبة الشارت مع دقات الساعة 10:00 صباحاً بتوقيت نيويورك',
      'تحديد تجمع السيولة الأقرب (Previous High/Low أو Equal Highs)',
      'رصد أول فجوة سعرية (FVG) واضحة بعد الانطلاق',
      'الدخول الفوري بنسبة مخاطرة لا تتجاوز 1% من رأس المال'
    ],
    invalidationRules: [
      'عدم تشكيل فجوة سعرية قبل انتهاء الساعة 11:00 AM NY',
      'تجاوز السعر لمنطقة بداية الشمعة المندفعة'
    ],
    takeProfitRules: [
      'هدف ثابت لا يقل عن 15 - 20 نقطة في ناسداك أو 15 دولار في الذهب',
      'تحقيق عائد 1:2 R:R كحد أدنى'
    ],
    winRate: 74,
    tradesCount: 62,
    avgRiskReward: '1:2.4',
    isBuiltIn: true
  },
  {
    id: 'pb-3',
    title: 'Institutional Order Block Retest',
    titleAr: 'إعادة اختبار البلوك المؤسسي (Order Block Retest)',
    category: 'ICT_SMC',
    timeframe: '15M - 1H',
    recommendedSessions: ['London Open', 'New York Open'],
    descriptionAr: 'دخول متوافق مع الاتجاه العام عند عودة السعر لإعادة اختبار آخر شمعة بيعية قبل الصعود الاندفاعي المؤسسي (أو العكس).',
    checklist: [
      'توافق الاتجاه على الفريم الأكبر (H4 / Daily Trend Alignment)',
      'اندفاع سعري عنيف ترك وراءه اختلالاً سعرياً (Imbalance)',
      'تزامن البلوك مع مستويات فيبوناتشي الذهبية (0.618 - 0.705 OTE)',
      'ظهور ذيل رفض (Rejection Wick) عند ملامسة البلوك'
    ],
    invalidationRules: [
      'إغلاق شمعة فريم الساعة داخل قاع البلوك المؤسسي يلغي القوة الدافعة'
    ],
    takeProfitRules: [
      'الهدف الرئيسي عند قمة/قاع التأرجح الأخير بنسبة 1:3 R:R'
    ],
    winRate: 71,
    tradesCount: 38,
    avgRiskReward: '1:3.2',
    isBuiltIn: true
  },
  {
    id: 'pb-4',
    title: 'Fair Value Gap (FVG) Inversion',
    titleAr: 'انعكاس الفجوة السعرية (Inversion FVG)',
    category: 'LIQUIDITY',
    timeframe: '5M - 15M',
    recommendedSessions: ['جميع الجلسات'],
    descriptionAr: 'استراتيجية تحول الفجوة السعرية من دعم إلى مقاومة أو العكس بعد فشل الدفاع عنها.',
    checklist: [
      'كسر فجوة سعرية سابقة بقوة وإغلاق شموع خارجها بالكامل',
      'انتظار إعادة اختبار الفجوة المكسورة من الجهة المقابلة',
      'تأكيد التغير في تسليم الطلبات المؤسسية (Order Flow Change)'
    ],
    invalidationRules: [
      'عودة السعر للإغلاق داخل الفجوة من جديد'
    ],
    takeProfitRules: [
      'مستويات السيولة التالية بنسبة عائد 1:2.5 R:R'
    ],
    winRate: 76,
    tradesCount: 51,
    avgRiskReward: '1:2.6',
    isBuiltIn: true
  }
];

export const PlaybooksLibrary: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<PlaybookItem[]>(() => {
    try {
      const saved = localStorage.getItem('mbk_tic_playbooks');
      return saved ? JSON.parse(saved) : INITIAL_PLAYBOOKS;
    } catch {
      return INITIAL_PLAYBOOKS;
    }
  });

  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookItem | null>(playbooks[0]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Playbook Form
  const [newPb, setNewPb] = useState({
    title: '',
    titleAr: '',
    category: 'ICT_SMC' as const,
    timeframe: '15M',
    session: 'London / NY',
    descriptionAr: '',
    checklistText: '',
    invalidationText: '',
    tpText: ''
  });

  const savePlaybooks = (updated: PlaybookItem[]) => {
    setPlaybooks(updated);
    try {
      localStorage.setItem('mbk_tic_playbooks', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleToggleCheck = (index: number) => {
    soundManager.playClick();
    setCheckedItems((prev) => ({
      ...prev,
      [`${selectedPlaybook?.id}-${index}`]: !prev[`${selectedPlaybook?.id}-${index}`]
    }));
  };

  const handleCreatePlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPb.titleAr.trim()) return;

    const created: PlaybookItem = {
      id: `pb-${Date.now()}`,
      title: newPb.title || newPb.titleAr,
      titleAr: newPb.titleAr,
      category: newPb.category,
      timeframe: newPb.timeframe,
      recommendedSessions: [newPb.session],
      descriptionAr: newPb.descriptionAr || 'نموذج تداول مخصص مسجل في مكتبة Playbooks.',
      checklist: newPb.checklistText.split('\n').filter((l) => l.trim().length > 0),
      invalidationRules: newPb.invalidationText.split('\n').filter((l) => l.trim().length > 0),
      takeProfitRules: newPb.tpText.split('\n').filter((l) => l.trim().length > 0),
      winRate: 70,
      tradesCount: 0,
      avgRiskReward: '1:2.5',
      isBuiltIn: false
    };

    soundManager.playSuccess();
    const updated = [created, ...playbooks];
    savePlaybooks(updated);
    setSelectedPlaybook(created);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="rounded-2xl border border-slate-800 p-5 bg-gradient-to-br from-slate-900/95 via-[#0e1526] to-slate-900/95 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0a0f18] rounded-[10px] flex items-center justify-center">
                <Layers className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide">
                  MBK PLAYBOOKS • نماذج واستراتيجيات التداول الموثقة
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Institutional Edge
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                قواعد الدخول الصارمة، شروط الإلغاء، وإدارة المخاطر لكل نموذج تداول مؤسسي
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-black text-xs transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة نموذج مخصص (Custom Playbook)</span>
          </button>
        </div>

        {/* PLAYBOOK SELECTOR HORIZONTAL CHIPS */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {playbooks.map((pb) => {
            const isSelected = selectedPlaybook?.id === pb.id;
            return (
              <button
                key={pb.id}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedPlaybook(pb);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border text-right cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-slate-200">{pb.titleAr}</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">{pb.winRate}%</span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                  <span>{pb.timeframe}</span>
                  <span>•</span>
                  <span>{pb.tradesCount} صفقات مسجلة</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELECTED PLAYBOOK IN-DEPTH CARD */}
      {selectedPlaybook && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: RULES & CHECKLIST (8 Cols) */}
          <div className="lg:col-span-8 bg-[#101624] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-100">{selectedPlaybook.titleAr}</h3>
                  <span className="text-xs font-mono text-cyan-400">({selectedPlaybook.title})</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedPlaybook.descriptionAr}</p>
              </div>

              <div className="text-left shrink-0">
                <span className="text-[10px] text-slate-400 block mb-0.5">معدل الفوز التاريخي</span>
                <span className="text-xl font-black font-mono text-emerald-400">{selectedPlaybook.winRate}%</span>
              </div>
            </div>

            {/* INTERACTIVE ENTRY CHECKLIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>قائمة الشروط والتأكيدات المطلوبة قبل الدخول (Entry Checklist)</span>
                </h4>
                <span className="text-[10px] text-slate-400">انقر للتأكيد قبل التنفيذ</span>
              </div>

              <div className="space-y-2">
                {selectedPlaybook.checklist.map((rule, idx) => {
                  const isChecked = !!checkedItems[`${selectedPlaybook.id}-${idx}`];
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleCheck(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium">{rule}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INVALIDATION & HARD STOP LOSS */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <h4 className="text-xs font-bold text-rose-300 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>شروط إلغاء النموذج ووقف الخسارة الصارم (Invalidation Rules)</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {selectedPlaybook.invalidationRules.map((rule, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* TAKE PROFIT & RISK MANAGEMENT */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>قواعد جني الأرباح ونسبة العائد للمخاطرة (Take Profit & R:R)</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {selectedPlaybook.takeProfitRules.map((rule, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT: SETUP METRICS & QUICK EXECUTION (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#101624] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Award className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-100">إحصائيات النموذج الموثقة</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">الفريم الزمني المعتمد:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedPlaybook.timeframe}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">الجلسات الموصى بها:</span>
                  <span className="font-mono text-cyan-300 text-[11px] truncate max-w-[160px]">
                    {selectedPlaybook.recommendedSessions.join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">متوسط نسبة العائد للمخاطرة:</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedPlaybook.avgRiskReward}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">إجمالي الصفقات المسجلة:</span>
                  <span className="font-mono font-bold text-slate-200">{selectedPlaybook.tradesCount} صفقات</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>نصيحة الانضباط المؤسسي:</span>
                  </div>
                  <p className="text-slate-400">
                    لا تقم بفتح أي صفقة إذا لم تكتمل 100% من بنود قائمة التأكيدات أعلاه. حماية رأس المال تسبق دائماً جني الأرباح.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL: ADD CUSTOM PLAYBOOK */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121927] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-slate-100">إضافة نموذج تداول جديد (Playbook)</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlaybook} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">اسم النموذج بالعربية</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كسر وإعادة اختبار قمة لندن"
                  value={newPb.titleAr}
                  onChange={(e) => setNewPb({ ...newPb, titleAr: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">الفريم الزمني (Timeframe)</label>
                  <input
                    type="text"
                    placeholder="5M / 15M"
                    value={newPb.timeframe}
                    onChange={(e) => setNewPb({ ...newPb, timeframe: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">الجلسة الموصى بها</label>
                  <input
                    type="text"
                    placeholder="افتتاح نيويورك 14:30 UTC"
                    value={newPb.session}
                    onChange={(e) => setNewPb({ ...newPb, session: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شروط الدخول (اكتب كل شرط في سطر مستقل)</label>
                <textarea
                  rows={3}
                  placeholder="1. سحب السيولة&#10;2. تأكيد MSS&#10;3. الدخول عند FVG"
                  value={newPb.checklistText}
                  onChange={(e) => setNewPb({ ...newPb, checklistText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شروط إلغاء الفكرة ووقف الخسارة (سطر لكل شرط)</label>
                <textarea
                  rows={2}
                  placeholder="إغلاق شمعة فريم 15 دقيقة خلف القاع يلغي الفكرة"
                  value={newPb.invalidationText}
                  onChange={(e) => setNewPb({ ...newPb, invalidationText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  حفظ النموذج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
