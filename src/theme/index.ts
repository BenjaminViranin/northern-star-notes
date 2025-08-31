import { Theme } from '../types';

export const darkTheme: Theme = {
  colors: {
    primary: '#14b8a6', // teal-500
    secondary: '#0f766e', // teal-600
    background: '#0f172a', // slate-900
    surface: '#1e293b', // slate-800
    text: '#e2e8f0', // slate-200
    textSecondary: '#94a3b8', // slate-400
    border: '#334155', // slate-700
    accent: '#14b8a6', // teal-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    glass: 'rgba(30, 41, 59, 0.8)', // slate-800 with opacity
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
  },
};

export const lightTheme: Theme = {
  colors: {
    primary: '#14b8a6', // teal-500
    secondary: '#0f766e', // teal-600
    background: '#ffffff', // white
    surface: '#f8fafc', // slate-50
    text: '#1e293b', // slate-800
    textSecondary: '#64748b', // slate-500
    border: '#e2e8f0', // slate-200
    accent: '#14b8a6', // teal-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    glass: 'rgba(248, 250, 252, 0.8)', // slate-50 with opacity
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
  },
};

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

// Common styles that can be reused across components
export const commonStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  glassMorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  input: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
};

// Color utilities
export const colorUtils = {
  hexToRgba: (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
  
  lighten: (color: string, amount: number): string => {
    // Simple color lightening - in a real app, you might use a color manipulation library
    return color;
  },
  
  darken: (color: string, amount: number): string => {
    // Simple color darkening - in a real app, you might use a color manipulation library
    return color;
  },
};

// Default group colors
export const defaultGroupColors = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
];

export const getRandomGroupColor = (): string => {
  return defaultGroupColors[Math.floor(Math.random() * defaultGroupColors.length)];
};
