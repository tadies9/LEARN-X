import { useState, useEffect, useMemo } from 'react';
import { ThemePreference, ThemeMode } from '@/lib/types/theme';
import {
  getSystemTheme,
  getTimeBasedTheme,
  resolveTheme,
  isValidThemePreference,
} from '@/lib/utils/theme';

interface UseThemeInitializationProps {
  defaultTheme: ThemePreference;
  storageKey: string;
  enableTransitions: boolean;
}

export function useThemeInitialization({ defaultTheme, storageKey }: UseThemeInitializationProps) {
  const [preference, setPreference] = useState<ThemePreference>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ThemeMode | null>(null);
  const [mounted, setMounted] = useState(false);

  // Derived values using useMemo for performance
  const autoTheme = useMemo(() => getTimeBasedTheme(), []);
  const resolvedTheme = useMemo(
    () => resolveTheme(preference, systemTheme),
    [preference, systemTheme]
  );
  const isSystemTheme = preference === 'system';

  // Load saved preference and initialize system theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && isValidThemePreference(saved)) {
        setPreference(saved);
      }
    } catch (error) {
      // Failed to load theme preference from localStorage
    }

    setSystemTheme(getSystemTheme());
    setMounted(true);
  }, [storageKey]);

  return {
    preference,
    setPreference,
    systemTheme,
    setSystemTheme,
    mounted,
    autoTheme,
    resolvedTheme,
    isSystemTheme,
  };
}
