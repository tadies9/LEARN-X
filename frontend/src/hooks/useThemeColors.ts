import { useMemo } from 'react';

import { ThemeMode } from '@/lib/types/theme';
import { getThemeAwareColors, getThemeAwareClasses } from '@/lib/utils/theme-aware';

export function useThemeColors(resolvedTheme: ThemeMode) {
  return useMemo(() => {
    return getThemeAwareColors(resolvedTheme);
  }, [resolvedTheme]);
}

export function useThemeClasses(resolvedTheme: ThemeMode) {
  return useMemo(() => {
    return getThemeAwareClasses(resolvedTheme);
  }, [resolvedTheme]);
}
