import { useCallback } from 'react';

import { ThemePreference, ThemeMode } from '@/lib/types/theme';

interface UseThemeActionsProps {
  storageKey: string;
  resolvedTheme: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function useThemeActions({
  storageKey,
  resolvedTheme,
  setPreference,
}: UseThemeActionsProps) {
  const setThemePreference = useCallback(
    (newPreference: ThemePreference) => {
      try {
        localStorage.setItem(storageKey, newPreference);
        setPreference(newPreference);

        // Track theme change for analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'theme_preference_change', {
            event_category: 'UX',
            event_label: newPreference,
          });
        }
      } catch (error) {
        console.warn('Failed to save theme preference to localStorage:', error);
        // Still update the preference in memory
        setPreference(newPreference);
      }
    },
    [storageKey, setPreference]
  );

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setThemePreference(newTheme);
  }, [resolvedTheme, setThemePreference]);

  return {
    setThemePreference,
    toggleTheme,
  };
}
