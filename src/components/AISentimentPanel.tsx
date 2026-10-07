import React, { useState } from 'react';
import { AISessionReport } from '../types/trading';
import { AISentimentService } from '../services/aiSentimentService';
import {
  Sparkles,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Zap,
  Globe,
  Database,
  CheckCircle2
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export const AISentimentPanel: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<'ny' | 'london' | 'asia'>('ny');
  const [isGeneratingLive, setIsGeneratingLive] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [liveResult, setLiveResult] = useState<{
    text: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    timestamp: string;
    sources?: Array<{ title: string; uri: string }>;
    modelUsed?: string;
  } | null>(null);

  const report: AISessionReport = AISentimentService.getSession(selectedSession);

  const handleGenerateLive = async () => {
    soundManager.playClick();
    setIsGeneratingLive(true);
    try {
      const res = await AISentimentService.generateLiveAnalysis('US100', useSearchGrounding);
      setLiveResult({
        text: res.analysisTextAr,
        bias: res.bias,
        confidence: res.confidence,
        timestamp: res.timestamp,
        sources: res.sources,
        modelUsed: res.modelUsed
      });
      soundManager.playSignalPing();
    } finally {
      setIsGeneratingLive(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                التحليل الذكي ومعنويات الأسواق (AI Market Intelligence)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Gemini 3.1 Flash-Lite • Best Low-Cost AI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              تحليل خوارزمي مخصص لخدمة المتداولين يعتمد على نموذج Gemini 3.1 Flash-Lite الأوفر تكلفة لضمان استمرارية الخدمة مجاناً مع كاش ذكي لجلسات التداول
            </p>
          </div>
        </div>

        {/* Live on-demand generator controls */}
        <div className="flex items-center gap-2">
          {/* Toggle for Google Search Grounding */}
          <button
            onClick={() => {
              soundManager.playClick();
              setUseSearchGrounding(!useSearchGrounding);
            }}
            title={useSearchGrounding ? 'البحث الحي في الويب مفعل' : 'تفعيل البحث الحي في أخبار الويب'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              useSearchGrounding
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{useSearchGrounding ? 'بيانات الويب مفعلة (Search Grounding)' : 'تفعيل البحث المباشر'}</span>
          </button>

          <button
            onClick={handleGenerateLive}
            disabled={isGeneratingLive}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingLive ? 'animate-spin' : ''}`} />
            <span>{isGeneratingLive ? 'جاري التحليل...' : 'توليد تحليل لحظي فوري (Gemini)'}</span>
          </button>
        </div>
      </div>

      {/* Batch Sessions Selector */}
      <div className="px-4 py-3 bg-[#0c121d] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-300 font-semibold">الدورة المجدولة المعروضة:</span>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'ny', label: 'جلسة نيويورك (الحالية)', time: '13:30 UTC' },
            { id: 'london', label: 'جلسة لندن (الأوروبية)', time: '07:00 UTC' },
            { id: 'asia', label: 'جلسة طوكيو (الآسيوية)', time: '00:00 UTC' }
          ].map((sess) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSession(sess.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedSession === sess.id
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{sess.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live AI Generation Result Banner (if triggered) */}
      {liveResult && (
        <div className="m-4 p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 shadow-xl space-y-2.5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>تحليل فوري تم إنشاؤه عبر Gemini AI Model ({liveResult.timestamp})</span>
              {liveResult.modelUsed && (
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-cyan-300 font-mono">
                  {liveResult.modelUsed}
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              ثقة الذكاء الاصطناعي: {liveResult.confidence}%
            </span>
          </div>

          <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {liveResult.text}
          </p>

          {/* Sources from Google Search Grounding */}
          {liveResult.sources && liveResult.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                مصادر البيانات المباشرة (Google Search Grounding):
              </span>
              <div className="flex flex-wrap gap-2">
                {liveResult.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-slate-300 bg-slate-900/90 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 flex items-center gap-1 transition-colors"
                  >
                    <span>{src.title}</span>
                    <Globe className="w-2.5 h-2.5 text-cyan-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cached Session Detailed Cards */}
      <div className="p-5 space-y-5">
        {/* Session Time & Macro Outlook */}
        <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>{report.sessionNameAr}</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{report.lastUpdated}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">{report.macroSummaryAr}</p>
        </div>

        {/* 2 Core Assets Grid: US100 & XAUUSD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* US100 (NASDAQ) Card */}
          <div className="p-4 rounded-xl bg-[#141b28] border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-100 text-sm font-mono">ناسداك US100</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  عقود الفروقات
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                    report.us100.bias === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {report.us100.bias === 'BULLISH' ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{report.us100.bias === 'BULLISH' ? 'صعودي قوي (Bullish)' : 'هبوطي (Bearish)'}</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {report.us100.confidence}% ثقة
                </span>
              </div>
            </div>

            {/* Pivot and Levels */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#0c121d] text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">النقطة المحورية:</span>
                <span className="font-bold text-amber-400">{report.us100.pivot}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-sans">المقاومة R1:</span>
                <span className="font-bold text-emerald-300">{report.us100.resistance[0]}</span>
              </div>
              <div>
                <span className="text-[10px] text-rose-400 block font-sans">الدعم S1:</span>
                <span className="font-bold text-rose-300">{report.us100.support[0]}</span>
              </div>
            </div>

            {/* Catalysts */}
            <div>
              <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                محفزات السيولة وحركة السعر:
              </span>
              <ul className="space-y-1 text-xs text-slate-400">
                {report.us100.catalystsAr.map((cat, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{cat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs">
              <span className="font-bold text-indigo-300 block mb-1">توصية وخطة عمل الذكاء الاصطناعي:</span>
              <p className="text-slate-300 leading-relaxed">{report.us100.actionPlanAr}</p>
            </div>
          </div>

          {/* XAUUSD (Gold) Card */}
          <div className="p-4 rounded-xl bg-[#141b28] border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-100 text-sm font-mono">الذهب XAUUSD</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  الملاذ الآمن
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span>محايد / تجميع (Neutral)</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {report.gold.confidence}% ثقة
                </span>
              </div>
            </div>

            {/* Pivot and Levels */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#0c121d] text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">النقطة المحورية:</span>
                <span className="font-bold text-amber-400">{report.gold.pivot}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-sans">المقاومة R1:</span>
                <span className="font-bold text-emerald-300">{report.gold.resistance[0]}</span>
              </div>
              <div>
                <span className="text-[10px] text-rose-400 block font-sans">الدعم S1:</span>
                <span className="font-bold text-rose-300">{report.gold.support[0]}</span>
              </div>
            </div>

            {/* Catalysts */}
            <div>
              <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                محفزات السيولة والذهب:
              </span>
              <ul className="space-y-1 text-xs text-slate-400">
                {report.gold.catalystsAr.map((cat, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{cat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs">
              <span className="font-bold text-amber-300 block mb-1">توصية وخطة عمل الذكاء الاصطناعي:</span>
              <p className="text-slate-300 leading-relaxed">{report.gold.actionPlanAr}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
