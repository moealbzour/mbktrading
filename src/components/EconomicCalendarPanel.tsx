import React from 'react';
import { EconomicNewsItem } from '../types/trading';
import { Calendar, AlertTriangle, Clock, Globe } from 'lucide-react';

interface Props {
  events: EconomicNewsItem[];
}

export const EconomicCalendarPanel: React.FC<Props> = ({ events }) => {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>التقويم الاقتصادي عالي التأثير (Economic Calendar)</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                High Impact USD/EUR
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              مواعيد صدور بيانات التضخم CPI، الوظائف NFP، وقرارات الفائدة الفيدرالية
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pr-2">الحدث الاقتصادي</th>
                <th className="pb-3 px-3">العملة / الدولة</th>
                <th className="pb-3 px-3">التوقيت</th>
                <th className="pb-3 px-3">الأهمية والخطورة</th>
                <th className="pb-3 px-3">التقديري</th>
                <th className="pb-3 px-3">السابق</th>
                <th className="pb-3 pl-2">الفعلي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 pr-2 font-sans font-bold text-slate-200">
                    {ev.titleAr}
                  </td>
                  <td className="py-3 px-3 text-cyan-400 font-bold">
                    {ev.currency}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans">
                    {ev.timeAr}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    {ev.impact === 'HIGH' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        عالي التأثير 🔥
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        متوسط التأثير
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {ev.forecast}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {ev.previous}
                  </td>
                  <td className="py-3 pl-2 text-emerald-400 font-bold">
                    {ev.actual || 'قيد الانتظار'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
