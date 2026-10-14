import React, { useState, useRef, useEffect } from 'react';
import { useTheme, DarkThemeMode } from '../context/ThemeContext';
import { Eye, Moon, Coffee, Sparkles, Check, ChevronDown, Sliders, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

export const EyeComfortToggle: React.FC<Props> = ({ variant = 'full', className = '' }) => {
  const {
    theme,
    setTheme,
    eyeCareMode,
    toggleEyeCareMode,
    reduceMotion,
    toggleReduceMotion,
    themeLabels
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTheme = (mode: DarkThemeMode) => {
    soundManager.playClick();
    setTheme(mode);
  };

  const handleToggleEyeCare = () => {
    soundManager.playClick();
    toggleEyeCareMode();
  };

  const handleToggleMotion = () => {
    soundManager.playClick();
    toggleReduceMotion();
  };

  const currentMeta = themeLabels[theme];

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          soundManager.playClick();
          setIsOpen(!isOpen);
        }}
        aria-label="تغيير مظهر حماية العين والوضع الليلي"
        title="تخصيص الوضع المظلم لحماية العين (Eye-Comfort Dark Mode)"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
          eyeCareMode
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/50'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-750 hover:text-slate-100'
        }`}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-black/40 text-sm">
          {currentMeta.icon}
        </span>

        {variant === 'full' && (
          <div className="hidden sm:flex flex-col text-right leading-tight">
            <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
              {currentMeta.nameAr}
              {eyeCareMode && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="وضع حماية العين مفعل" />
              )}
            </span>
            <span className="text-[9px] text-slate-400">مظهر مريح للعين</span>
          </div>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f1420] border border-slate-700/80 shadow-2xl shadow-black/80 z-50 p-4 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
          style={{
            backgroundColor: theme === 'warm' ? '#181410' : theme === 'oled' ? '#090c12' : '#0f1420'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">أنماط راحة العين (Eye Comfort)</h4>
                <p className="text-[10px] text-slate-400">مظهر داكن مهدئ للجلسات الطويلة</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {eyeCareMode ? 'حماية العين: مفعّلة' : 'قياسي'}
            </span>
          </div>

          {/* Theme Choices */}
          <div className="space-y-2 mb-3.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              اختر درجة السواد والحرارة:
            </label>

            {(Object.keys(themeLabels) as DarkThemeMode[]).map((mode) => {
              const item = themeLabels[mode];
              const isSelected = theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleSelectTheme(mode)}
                  className={`w-full text-right p-2.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  {/* Color preview circle */}
                  <div
                    className="w-8 h-8 rounded-lg shrink-0 border border-slate-700/80 flex items-center justify-center text-sm shadow-inner"
                    style={{ backgroundColor: item.bgPreview }}
                  >
                    <span>{item.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{item.nameAr}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                      {item.descAr}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Eye Protection Toggles */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            {/* Soft Glow & Scanline Toggle */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-200 block">
                    فلترة الوهج النيون (Soft Contrast)
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    تعطيل أشعة الليزر والوميض الساطع المجهد
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={eyeCareMode}
                onClick={handleToggleEyeCare}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  eyeCareMode ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    eyeCareMode ? 'translate-x-0' : '-translate-x-4'
                  }`}
                />
              </button>
            </div>

            {/* Reduce Motion Toggle */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-200 block">
                    تهدئة الشبكة الخلفية المتحركة
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    إيقاف حركة التنفس في خلفية المنصة
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={handleToggleMotion}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  reduceMotion ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    reduceMotion ? 'translate-x-0' : '-translate-x-4'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
