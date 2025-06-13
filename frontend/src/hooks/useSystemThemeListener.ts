import { useEffect } from 'react';

import { ThemeMode } from '@/lib/types/theme';

interface UseSystemThemeListenerProps {
  setSystemTheme: (theme: ThemeMode) => void;
}

export function useSystemThemeListener({ setSystemTheme }: UseSystemThemeListenerProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setSystemTheme]);
}