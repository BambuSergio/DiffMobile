import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { Colors } from '../constants/theme';

interface ThemeContextValue {
  isDark: boolean;
  themeColors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark');
  const themeColors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(() => ({ isDark, themeColors }), [isDark, themeColors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
