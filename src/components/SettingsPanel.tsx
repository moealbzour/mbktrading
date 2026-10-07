import React, { useState } from 'react';
import { Settings, Volume2, Bell, Radio, Shield, Key, Terminal, Copy } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ isMuted, onToggleMute }) => {
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [telegramSync, setTelegramSync] = useState(true);
  const [autoSlippageFilter, setAutoSlippageFilter] = useState(true);

  const webhookUrl = 'https://api.mbktrading.live/v1/webhooks/pine-script-ingest';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    soundManager.playClick();
    setTimeout(() => setWebhookCopied(false), 2500);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              إعدادات المنصة والربط الخوارزمي (Platform Settings)
            </h2>
            <p className="text-xs text-slate-400">
              تكوين روابط Webhook لـ TradingView، التنبيهات الصوتية، ومزامنة تيليجرام
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6 text-xs">
        {/* TradingView Pine Script Webhook URL */}
        <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>عنوان Webhook لاستقبال إشارات TradingView Pine Script:</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">حالة الرابط: مفعل 200 OK</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs select-all"
            />
            <button
              onClick={handleCopyWebhook}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{webhookCopied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            الصق هذا العنوان في حقل Webhook URL في نافذة تنبيهات TradingView لتلقي الإشارات الفورية هنا.
          </p>
        </div>

        {/* Audio & Visual Alerts */}
        <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-4">
          <span className="font-bold text-slate-200 block">
            التنبيهات اللحظية والأصوات:
          </span>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div>
                <span className="text-slate-200 font-semibold block">صافرة التنبيه المالي (Acoustic Chime)</span>
                <span className="text-[11px] text-slate-400">
                  تشغيل صوت نقي عند صدور إشارة جديدة أو تحقيق الهدف (TP1 / TP2)
                </span>
              </div>
              <button
                onClick={onToggleMute}
                className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  !isMuted ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {!isMuted ? 'مفعل' : 'مكتوم'}
              </button>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div>
                <span className="text-slate-200 font-semibold block">المزامنة مع تيليجرام</span>
                <span className="text-[11px] text-slate-400">
                  إرسال نسخة من كل صفقة ورسالة نقاش لقناة وتطبيق Telegram فوراً
                </span>
              </div>
              <button
                onClick={() => setTelegramSync(!telegramSync)}
                className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  telegramSync ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {telegramSync ? 'متصل' : 'معطل'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-semibold block">فلتر الانزلاق السعري (Slippage Guard)</span>
                <span className="text-[11px] text-slate-400">
                  إلغاء دخول الصفقات تلقائياً إذا زاد السبريد عن 1.5 نقطة أثناء صدور الأخبار
                </span>
              </div>
              <button
                onClick={() => setAutoSlippageFilter(!autoSlippageFilter)}
                className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  autoSlippageFilter ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {autoSlippageFilter ? 'نشط' : 'معطل'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
