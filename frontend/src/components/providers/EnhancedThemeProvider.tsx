/**
 * Enhanced Theme Provider for LEARN-X
 * Comprehensive theme system with system detection, auto mode, and accessibility features
 */

'use client';

import { createContext, useContext, useMemo } from 'react';
import { ThemeContextType, ThemeProviderProps } from '@/lib/types/theme';
import { useThemeInitialization } from '@/hooks/useThemeInitialization';
import { useSystemThemeListener } from '@/hooks/useSystemThemeListener';
import { useThemeActions } from '@/hooks/useThemeActions';
import { useThemeEffects } from '@/hooks/useThemeEffects';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function EnhancedThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'learn-x-theme',
  enableTransitions = true,
}: ThemeProviderProps) {
  const {
    preference,
    setPreference,
    systemTheme,
    setSystemTheme,
    mounted,
    autoTheme,
    resolvedTheme,
    isSystemTheme,
  } = useThemeInitialization({ defaultTheme, storageKey, enableTransitions });

  useSystemThemeListener({ setSystemTheme });

  const { setThemePreference, toggleTheme } = useThemeActions({
    storageKey,
    resolvedTheme,
    setPreference,
  });

  useThemeEffects({
    preference,
    resolvedTheme,
    mounted,
    enableTransitions,
  });

  // Memoized context value
  const value = useMemo(
    (): ThemeContextType => ({
      preference,
      resolvedTheme,
      systemTheme,
      autoTheme,
      setThemePreference,
      toggleTheme,
      isSystemTheme,
      mounted,
    }),
    [
      preference,
      resolvedTheme,
      systemTheme,
      autoTheme,
      setThemePreference,
      toggleTheme,
      isSystemTheme,
      mounted,
    ]
  );

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to use the theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within an EnhancedThemeProvider');
  }
  return context;
};

/**
 * Hook to get theme-aware colors
 */
export const useThemeColors = () => {
  const { resolvedTheme } = useTheme();
  const { useThemeColors: useColorsHook } = require('@/hooks/useThemeColors');
  return useColorsHook(resolvedTheme);
};

/**
 * Hook to get theme-aware CSS classes
 */
export const useThemeClasses = () => {
  const { resolvedTheme } = useTheme();
  const { useThemeClasses: useClassesHook } = require('@/hooks/useThemeColors');
  return useClassesHook(resolvedTheme);
};
