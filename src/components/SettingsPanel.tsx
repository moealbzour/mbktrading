import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  Bell,
  Radio,
  Shield,
  Key,
  Terminal,
  Copy,
  Eye,
  Check,
  Moon,
  Coffee,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { useTheme, DarkThemeMode } from '../context/ThemeContext';

interface Props {
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ isMuted, onToggleMute }) => {
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [telegramSync, setTelegramSync] = useState(true);
  const [autoSlippageFilter, setAutoSlippageFilter] = useState(true);

  const {
    theme,
    setTheme,
    eyeCareMode,
    toggleEyeCareMode,
    reduceMotion,
    toggleReduceMotion,
    themeLabels
  } = useTheme();

  const webhookUrl = 'https://api.mbktrading.live/v1/webhooks/pine-script-ingest';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    soundManager.playClick();
    setTimeout(() => setWebhookCopied(false), 2500);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-colors duration-200">
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              إعدادات المنصة ومظهر راحة العين (Platform & Display Settings)
            </h2>
            <p className="text-xs text-slate-400">
              تخصيص أنماط الوضع الداكن لحماية النظر، التنبيهات الصوتية، وروابط Webhook لـ TradingView
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6 text-xs">
        {/* Eye Comfort & Dark Themes Section */}
        <div className="p-4 rounded-xl bg-[#0c121d] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>مظهر المنصة وحماية العين من الإجهاد (Eye Comfort Themes):</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              {eyeCareMode ? 'حماية العين نشطة' : 'وضع قياسي'}
            </span>
          </div>

          <p className="text-slate-400 text-[11px] leading-relaxed">
            تمت معايرة كافة درجات التباين في الوضع الداكن لتقليل إجهاد القرنية والصداع أثناء مراقبة الشاشات لفترات طويلة. اختر النمط الأنسب لإضاءة غرفتك:
          </p>

          {/* Theme Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {(Object.keys(themeLabels) as DarkThemeMode[]).map((mode) => {
              const item = themeLabels[mode];
              const isSelected = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTheme(mode);
                  }}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center text-sm shadow-inner"
                      style={{ backgroundColor: item.bgPreview }}
                    >
                      <span>{item.icon}</span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">{item.nameAr}</h4>
                    <span className="text-[10px] text-slate-500 font-mono block mb-1">{item.nameEn}</span>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.descAr}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Eye Protection Toggles in Settings */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-slate-200 font-semibold block text-[11px]">
                    فلترة الوهج النيون وتعطيل مسح الليزر (Soft Contrast Filter)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    استبدال الهالات الفسفورية الحادة بإضاءات محيطية ناعمة تحافظ على صحة العين
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={eyeCareMode}
                onClick={() => {
                  soundManager.playClick();
                  toggleEyeCareMode();
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  eyeCareMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {eyeCareMode ? 'مفعل 🟢' : 'معطل'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-slate-200 font-semibold block text-[11px]">
                    تهدئة الشبكة الخلفية ومنع نبض الإضاءة (Motion & Flicker Reduction)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    إيقاف حركة تنفس شبكة الخلفية لمنع التشتت أثناء قراءة الشموع اليابانية
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => {
                  soundManager.playClick();
                  toggleReduceMotion();
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  reduceMotion ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {reduceMotion ? 'مفعل' : 'معطل'}
              </button>
            </div>
          </div>
        </div>

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
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
          <span className="font-bold text-slate-200 block text-xs">
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
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
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
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
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
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
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
