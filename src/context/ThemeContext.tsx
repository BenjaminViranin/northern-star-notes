import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types';
import { darkTheme, lightTheme } from '../theme';
import { UserSettingsDAO } from '../database/userSettingsDAO';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Default to dark theme

  useEffect(() => {
    // Load theme preference from storage
    const loadTheme = async () => {
      try {
        const savedTheme = await UserSettingsDAO.getTheme();
        setIsDark(savedTheme === 'dark');
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    try {
      await UserSettingsDAO.setTheme(newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = async (newIsDark: boolean) => {
    setIsDark(newIsDark);
    
    try {
      await UserSettingsDAO.setTheme(newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
