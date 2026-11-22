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

const THEME_STORAGE_KEY = 'mbk_theme_mode_v1';

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'auto',
  resolvedTheme: 'dark',
  setThemeMode: () => {},
  cycleThemeMode: () => {}
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'auto' || saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = themeMode === 'auto' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-theme-mode', themeMode);
    if (resolvedTheme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
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
    const order: ThemeMode[] = ['auto', 'dark', 'light'];
    const nextIndex = (order.indexOf(themeMode) + 1) % order.length;
    setThemeMode(order[nextIndex]);
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
