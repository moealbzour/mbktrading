import React, { useState } from 'react';
import { TechnicalBreakdown } from '../types/trading';
import {
  TrendingUp,
  Target,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronDown,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface Props {
  posts: TechnicalBreakdown[];
}

export const TechnicalAnalysisPanel: React.FC<Props> = ({ posts }) => {
  const [selectedPostId, setSelectedPostId] = useState<string>(posts[0]?.id || '');
  const activePost = posts.find((p) => p.id === selectedPostId) || posts[0];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>التحليل الفني والهيكلي للأسواق (MBK Market Structure)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Daily Breakdowns
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              تفكيك بنية السوق ومناطق السيولة ومستويات الدعم والمقاومة المؤسسية
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List Selector */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 block mb-2">
            التحليلات المنشورة حديثاً:
          </span>

          {posts.map((post) => {
            const isSelected = post.id === activePost.id;
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-[#141b29] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-cyan-400">{post.symbol}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{post.timeframe}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed mb-2">
                  {post.titleAr}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{post.author}</span>
                  <span>{post.publishedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Breakdown Card */}
        {activePost && (
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-xl bg-[#0c121d] border border-slate-800 space-y-4">
              {/* Cover Banner with Trading Chart visual */}
              <div className="relative rounded-xl overflow-hidden h-52 border border-slate-700/60 shadow-lg">
                <img
                  src={activePost.coverImage}
                  alt={activePost.titleAr}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-[#0c121d]/40 to-transparent" />
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-slate-900/90 text-cyan-400 font-mono font-bold text-xs border border-slate-700">
                      {activePost.symbol} • {activePost.timeframe}
                    </span>
                    <span className="px-2 py-1 rounded bg-emerald-500/90 text-slate-950 font-black text-xs">
                      {activePost.direction === 'BULLISH' ? 'اتجاه صاعد ↗' : 'اتجاه هابط ↘'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Author Info */}
              <div>
                <h3 className="text-base font-black text-slate-100 mb-1 leading-snug">
                  {activePost.titleAr}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>المحلل: <strong className="text-slate-200">{activePost.author}</strong></span>
                  <span>•</span>
                  <span>{activePost.publishedAt}</span>
                </div>
              </div>

              {/* Targets and Invalidation Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#141d2c] border border-slate-700/80 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">الهدف التوسعي المتوقع:</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {activePost.targetPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">مستوى إلغاء السيناريو (Invalidation):</span>
                    <span className="text-sm font-bold text-rose-400 tabular-nums">
                      {activePost.invalidationLevel.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Structural Key Zones Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>المناطق الهيكلية وكتل الأوامر (Key Order Blocks):</span>
                </h4>

                <div className="space-y-1.5">
                  {activePost.keyZonesAr.map((zone, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#080d15] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-200">{zone.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-300">{zone.price}</span>
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {zone.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Text */}
              <div className="text-xs text-slate-300 leading-relaxed font-sans border-t border-slate-800 pt-3">
                <p>{activePost.summaryAr}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
