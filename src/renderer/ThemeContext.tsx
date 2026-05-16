import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppTheme, themes, defaultThemeId } from './themes';

interface ThemeContextValue {
  theme: AppTheme;
  themeId: string;
  setThemeId: (id: string) => void;
  availableThemes: { id: string; name: string }[];
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('themeId') || defaultThemeId);
  const theme = themes[themeId] || themes[defaultThemeId];

  const applyTheme = useCallback((t: AppTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--bg', t.ui.bg);
    root.style.setProperty('--surface', t.ui.surface);
    root.style.setProperty('--text', t.ui.text);
    root.style.setProperty('--accent', t.ui.accent);
    root.style.setProperty('--border', t.ui.border);
    root.style.setProperty('--red', t.ui.red);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('themeId', themeId);
  }, [theme, themeId, applyTheme]);

  const availableThemes = Object.entries(themes).map(([id, t]) => ({ id, name: t.name }));

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}
