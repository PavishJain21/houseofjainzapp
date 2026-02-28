import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, themes } from '../theme/theme';

const THEME_STORAGE_KEY = 'app_theme'; // 'light' | 'dark' | null (system)

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState(null); // null = use system
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeModeState(saved);
      } else {
        setThemeModeState(null);
      }
    } catch (e) {
      setThemeModeState(null);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode) => {
    try {
      if (mode === 'light' || mode === 'dark') {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        setThemeModeState(mode);
      } else {
        await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        setThemeModeState(null);
      }
    } catch (e) {
      console.warn('Failed to save theme', e);
    }
  };

  const effectiveMode = themeMode ?? systemColorScheme ?? 'light';
  const theme = themes[effectiveMode] || lightTheme;

  const value = {
    theme,
    themeMode: effectiveMode,
    themePreference: themeMode,
    isDark: effectiveMode === 'dark',
    setThemeMode,
    isLoaded,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;
