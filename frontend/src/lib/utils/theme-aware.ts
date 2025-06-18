/**
 * Theme-Aware Utilities for LEARN-X
 * Utilities for components that need to adapt to the current theme
 */

import { ThemeMode, ThemeColors } from '@/lib/types/theme';

/**
 * Hook to get theme-aware colors based on current theme
 */
export const getThemeAwareColors = (theme: ThemeMode): ThemeColors => {
  return {
    // AI-specific gradients
    aiGradient:
      theme === 'dark' ? 'from-green-400/20 to-purple-600/20' : 'from-green-50 to-purple-50',

    // Status colors
    statusColors: {
      'not-started': theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
      'in-progress': theme === 'dark' ? 'bg-yellow-900/50' : 'bg-yellow-100',
      completed: theme === 'dark' ? 'bg-green-900/50' : 'bg-green-100',
      mastered: theme === 'dark' ? 'bg-purple-900/50' : 'bg-purple-100',
    },

    // Gamification colors
    achievementColors: {
      bronze: theme === 'dark' ? 'from-orange-600 to-orange-800' : 'from-orange-400 to-orange-600',
      silver: theme === 'dark' ? 'from-gray-400 to-gray-600' : 'from-gray-300 to-gray-500',
      gold: theme === 'dark' ? 'from-yellow-400 to-yellow-600' : 'from-yellow-300 to-yellow-500',
      diamond: theme === 'dark' ? 'from-purple-400 to-purple-600' : 'from-purple-300 to-purple-500',
    },
  };
};

/**
 * Get theme-aware icon based on current theme
 */
export const getThemeAwareIcon = (
  lightIcon: string,
  darkIcon?: string,
  theme: ThemeMode = 'light'
): string => {
  return theme === 'dark' && darkIcon ? darkIcon : lightIcon;
};

/**
 * Get theme-aware CSS classes
 */
export const getThemeAwareClasses = (theme: ThemeMode) => {
  return {
    // Card backgrounds
    card:
      theme === 'dark'
        ? 'bg-card border-border hover:shadow-lg'
        : 'bg-card border-border hover:shadow-sm',

    // Input styles
    input:
      theme === 'dark'
        ? 'bg-background border-border focus:border-primary'
        : 'bg-background border-border focus:border-primary',

    // Button styles
    button: {
      primary:
        theme === 'dark'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary:
        theme === 'dark'
          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost:
        theme === 'dark'
          ? 'hover:bg-accent hover:text-accent-foreground'
          : 'hover:bg-accent hover:text-accent-foreground',
    },

    // Navigation styles
    sidebar: theme === 'dark' ? 'bg-card border-border' : 'bg-background border-border',

    // AI-specific styles
    aiIndicator:
      theme === 'dark'
        ? 'bg-gradient-to-r from-ai-primary/20 to-ai-secondary/20 border-ai-primary/30'
        : 'bg-gradient-to-r from-ai-primary/10 to-ai-secondary/10 border-ai-primary/20',
  };
};

/**
 * Get theme-aware shadow classes
 */
export const getThemeAwareShadows = (theme: ThemeMode) => {
  return {
    sm: theme === 'dark' ? 'shadow-lg shadow-black/20' : 'shadow-sm',
    md: theme === 'dark' ? 'shadow-xl shadow-black/30' : 'shadow-md',
    lg: theme === 'dark' ? 'shadow-2xl shadow-black/40' : 'shadow-lg',
  };
};

/**
 * Get theme-aware text colors for better contrast
 */
export const getThemeAwareTextColors = (theme: ThemeMode) => {
  return {
    primary: theme === 'dark' ? 'text-foreground' : 'text-foreground',
    secondary: theme === 'dark' ? 'text-muted-foreground' : 'text-muted-foreground',
    accent: theme === 'dark' ? 'text-primary' : 'text-primary',
    success: theme === 'dark' ? 'text-success' : 'text-success',
    warning: theme === 'dark' ? 'text-warning' : 'text-warning',
    error: theme === 'dark' ? 'text-error' : 'text-error',
  };
};

/**
 * Get theme-aware border styles
 */
export const getThemeAwareBorders = (theme: ThemeMode) => {
  return {
    default: theme === 'dark' ? 'border-border' : 'border-border',
    focus: theme === 'dark' ? 'border-primary' : 'border-primary',
    success: theme === 'dark' ? 'border-success' : 'border-success',
    warning: theme === 'dark' ? 'border-warning' : 'border-warning',
    error: theme === 'dark' ? 'border-error' : 'border-error',
  };
};

/**
 * Get theme-aware animation durations (respecting user preferences)
 */
export const getThemeAwareAnimations = () => {
  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  if (prefersReducedMotion) {
    return {
      fast: 'duration-0',
      normal: 'duration-0',
      slow: 'duration-0',
    };
  }

  return {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
  };
};
