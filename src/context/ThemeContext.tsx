import React, { createContext, useContext, useEffect, useState } from 'react';
import { soundManager } from '../utils/audio';

export type ThemeMode = 'auto' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  cycleThemeMode: () => void;
}

const THEME_STORAGE_KEY = 'mbk_theme_mode_v2';

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'dark',
  resolvedTheme: 'dark',
  setThemeMode: () => {},
  cycleThemeMode: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };
    setSystemTheme(mq.matches ? 'light' : 'dark');
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    themeMode === 'auto' ? systemTheme : themeMode === 'light' ? 'light' : 'dark';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-theme-mode', themeMode);
    root.style.colorScheme = resolvedTheme;

    if (resolvedTheme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('dark', 'theme-dark');
    } else {
      root.classList.add('dark', 'theme-dark');
      root.classList.remove('theme-light');
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', resolvedTheme === 'light' ? '#F0F3FA' : '#06080c');
    }
  }, [resolvedTheme, themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    soundManager.playClick();
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const cycleThemeMode = () => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        cycleThemeMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
