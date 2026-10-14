import React, { createContext, useContext, useState, useEffect } from 'react';

export type DarkThemeMode = 'midnight' | 'warm' | 'oled';

export interface ThemeContextValue {
  theme: DarkThemeMode;
  setTheme: (mode: DarkThemeMode) => void;
  eyeCareMode: boolean;
  setEyeCareMode: (enabled: boolean) => void;
  toggleEyeCareMode: () => void;
  reduceMotion: boolean;
  setReduceMotion: (enabled: boolean) => void;
  toggleReduceMotion: () => void;
  themeLabels: Record<DarkThemeMode, { nameAr: string; nameEn: string; descAr: string; icon: string; bgPreview: string }>;
}

const THEME_LABELS: Record<DarkThemeMode, { nameAr: string; nameEn: string; descAr: string; icon: string; bgPreview: string }> = {
  midnight: {
    nameAr: 'فحم كلاسيكي مريح',
    nameEn: 'Midnight Slate',
    descAr: 'تباين متوازن وهادئ لتقليل إجهاد النظر أثناء جلسات التحليل الطويلة',
    icon: '🌙',
    bgPreview: '#090D14'
  },
  warm: {
    nameAr: 'الوضع الليلي الدافئ',
    nameEn: 'Warm Night Shift',
    descAr: 'درجات عنبرية دافئة تقلل الضوء الأزرق وتريح عضلات العين ليلاً',
    icon: '☕',
    bgPreview: '#0E0C0A'
  },
  oled: {
    nameAr: 'أسود مطفأ فائق',
    nameEn: 'True OLED Black',
    descAr: 'سواد عميق بدون وهج مع الحفاظ على وضوح البيانات المصرفية',
    icon: '🌑',
    bgPreview: '#030407'
  }
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage or default to comfortable midnight + eyeCare on
  const [theme, setThemeState] = useState<DarkThemeMode>(() => {
    try {
      const saved = localStorage.getItem('mbk_dark_theme');
      if (saved === 'midnight' || saved === 'warm' || saved === 'oled') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'midnight';
  });

  const [eyeCareMode, setEyeCareModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mbk_eye_care');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return true; // Default to true for eye comfort!
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mbk_reduce_motion');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

  const setTheme = (mode: DarkThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem('mbk_dark_theme', mode);
    } catch {
      // ignore
    }
  };

  const setEyeCareMode = (enabled: boolean) => {
    setEyeCareModeState(enabled);
    try {
      localStorage.setItem('mbk_eye_care', String(enabled));
    } catch {
      // ignore
    }
  };

  const toggleEyeCareMode = () => {
    setEyeCareMode(!eyeCareMode);
  };

  const setReduceMotion = (enabled: boolean) => {
    setReduceMotionState(enabled);
    try {
      localStorage.setItem('mbk_reduce_motion', String(enabled));
    } catch {
      // ignore
    }
  };

  const toggleReduceMotion = () => {
    setReduceMotion(!reduceMotion);
  };

  // Sync with document element attributes for instant CSS styling
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-eye-care', eyeCareMode ? 'true' : 'false');
    root.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');

    // Also update theme-color meta tag for mobile browsers and PWA
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    const color = THEME_LABELS[theme].bgPreview;
    metaThemeColor.setAttribute('content', color);

    // Apply smooth classes to body
    document.body.className = `theme-${theme} ${eyeCareMode ? 'eye-care-active' : ''} ${reduceMotion ? 'reduce-motion-active' : ''}`;
  }, [theme, eyeCareMode, reduceMotion]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        eyeCareMode,
        setEyeCareMode,
        toggleEyeCareMode,
        reduceMotion,
        setReduceMotion,
        toggleReduceMotion,
        themeLabels: THEME_LABELS
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
