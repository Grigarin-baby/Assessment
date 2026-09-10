'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme, ThemeConfig } from 'antd';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('crm_theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
      document.documentElement.setAttribute('data-theme', saved);
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('crm_theme', newMode);
    document.documentElement.setAttribute('data-theme', newMode);
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  };

  const isDark = mode === 'dark';

  const themeConfig: ThemeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#3b82f6', // Clean Enterprise Accent (No Purple)
      colorInfo: '#3b82f6',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      borderRadius: 0,
      borderRadiusLG: 0,
      borderRadiusSM: 0,
      borderRadiusXS: 0,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      colorBgBase: isDark ? '#18181b' : '#ffffff',
      colorBgContainer: isDark ? '#25252b' : '#ffffff',
      colorBorder: isDark ? '#383842' : '#e2e8f0',
    },
    components: {
      Table: {
        headerBg: isDark ? '#202026' : '#f8fafc',
        headerColor: isDark ? '#f4f4f6' : '#475569',
        rowHoverBg: isDark ? '#2c2c34' : '#f1f5f9',
        borderColor: isDark ? '#383842' : '#e2e8f0',
        borderRadius: 0,
      },
      Card: {
        colorBgContainer: isDark ? '#25252b' : '#ffffff',
        colorBorderSecondary: isDark ? '#383842' : '#e2e8f0',
        borderRadiusLG: 0,
      },
      Button: {
        borderRadius: 0,
        borderRadiusLG: 0,
        borderRadiusSM: 0,
        controlHeight: 36,
        controlHeightSM: 28,
        controlHeightLG: 42,
        paddingContentHorizontal: 16,
      },
      Input: {
        borderRadius: 0,
        controlHeight: 36,
      },
      Select: {
        borderRadius: 0,
        controlHeight: 36,
      },
      DatePicker: {
        borderRadius: 0,
        controlHeight: 36,
      },
      Tag: {
        borderRadiusSM: 0,
      },
      Modal: {
        contentBg: isDark ? '#25252b' : '#ffffff',
        headerBg: isDark ? '#25252b' : '#ffffff',
      },
      Menu: {
        darkItemBg: '#18181b',
        darkSubMenuItemBg: '#202026',
        darkItemSelectedBg: '#33333c',
        darkItemSelectedColor: '#ffffff',
        itemSelectedBg: '#e4e4e7',
        itemSelectedColor: '#18181b',
      },
    },
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, toggleTheme, setTheme }}>
      <ConfigProvider theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
