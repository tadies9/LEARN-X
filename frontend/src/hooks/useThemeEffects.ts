import { useEffect } from 'react';
import { ThemePreference, ThemeMode } from '@/lib/types/theme';
import {
  getTimeBasedTheme,
  applyThemeToDOM,
  applyAccessibilityEnhancements,
} from '@/lib/utils/theme';

interface UseThemeEffectsProps {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  mounted: boolean;
  enableTransitions: boolean;
}

export function useThemeEffects({
  preference,
  resolvedTheme,
  mounted,
  enableTransitions,
}: UseThemeEffectsProps) {
  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    const cleanup = applyThemeToDOM(resolvedTheme, enableTransitions);
    applyAccessibilityEnhancements(resolvedTheme);

    return cleanup;
  }, [resolvedTheme, mounted, enableTransitions]);

  // Auto theme updates for auto mode
  useEffect(() => {
    if (preference !== 'auto') return;

    const interval = setInterval(() => {
      getTimeBasedTheme();
      // The resolved theme will automatically update due to dependency
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [preference]);
}
