import { useMemo } from 'react';

import { ThemeMode } from '@/lib/types/theme';

export function useThemeColors(resolvedTheme: ThemeMode) {
  return useMemo(() => {
    const { getThemeAwareColors } = require('@/lib/utils/theme-aware');
    return getThemeAwareColors(resolvedTheme);
  }, [resolvedTheme]);
}

export function useThemeClasses(resolvedTheme: ThemeMode) {
  return useMemo(() => {
    const { getThemeAwareClasses } = require('@/lib/utils/theme-aware');
    return getThemeAwareClasses(resolvedTheme);
  }, [resolvedTheme]);
}