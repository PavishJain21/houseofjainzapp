/**
 * Single source of truth for app theming.
 * Change theme here and the entire app updates via ThemeContext.
 */
export const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#4CAF50',
    primaryDark: '#388E3C',
    primaryLight: '#81C784',
    background: '#f8f9fa',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    error: '#f44336',
    success: '#4CAF50',
    tabActive: '#4CAF50',
    tabInactive: 'gray',
    headerBg: '#ffffff',
    cardBg: '#ffffff',
    inputBg: '#fafafa',
    emptyIcon: '#cccccc',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#66BB6A',
    primaryDark: '#4CAF50',
    primaryLight: '#81C784',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceElevated: '#2d2d2d',
    text: '#f5f5f5',
    textSecondary: '#b0b0b0',
    textMuted: '#808080',
    border: '#333333',
    borderLight: '#2a2a2a',
    error: '#ef5350',
    success: '#66BB6A',
    tabActive: '#66BB6A',
    tabInactive: '#9e9e9e',
    headerBg: '#1e1e1e',
    cardBg: '#1e1e1e',
    inputBg: '#2d2d2d',
    emptyIcon: '#606060',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};
