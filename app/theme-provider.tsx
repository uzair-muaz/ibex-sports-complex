'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Force dark theme on first load, ignore system preferences
    setTheme('dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', 'dark');
    }
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    // Always keep dark theme, even if some UI calls toggleTheme
    setTheme('dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', 'dark');
    }
    document.documentElement.classList.add('dark');
  };

  // Always provide the context, even before mounting
  // This prevents the "useTheme must be used within a ThemeProvider" error
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

