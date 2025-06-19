/**
 * Theme Utilities for LEARN-X
 * Core utilities for theme detection, resolution, and DOM manipulation
 */

import { ThemeMode, ThemePreference } from '@/lib/types/theme';

/**
 * Detects the user's system theme preference
 */
export const getSystemTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Gets theme based on time of day
 * 6 AM - 6 PM = Light mode
 * 6 PM - 6 AM = Dark mode
 */
export const getTimeBasedTheme = (): ThemeMode => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
};

/**
 * Gets theme based on location (sunrise/sunset)
 * This is a placeholder for future implementation with geolocation API
 */
export const getLocationBasedTheme = async (): Promise<ThemeMode> => {
  try {
    // Future implementation with geolocation + sunset/sunrise API
    // For now, fallback to time-based theme
    return getTimeBasedTheme();
  } catch {
    return getTimeBasedTheme();
  }
};

/**
 * Resolves the final theme based on user preference and system state
 */
export const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ThemeMode | null
): ThemeMode => {
  switch (preference) {
    case 'system':
      return systemTheme || 'light';
    case 'auto':
      return getTimeBasedTheme();
    case 'light':
    case 'dark':
      return preference;
    default:
      return 'light';
  }
};

/**
 * Applies the theme to the DOM with smooth transitions
 */
export const applyThemeToDOM = (theme: ThemeMode, enableTransitions = true) => {
  const root = window.document.documentElement;

  // Enable transitions
  if (enableTransitions) {
    root.style.setProperty('--theme-transition-duration', '200ms');
  }

  // Apply theme classes
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
  }

  // Set CSS custom property for theme awareness
  root.style.setProperty('--resolved-theme', theme);

  // Clean up transitions after theme change
  if (enableTransitions) {
    const timer = setTimeout(() => {
      root.style.removeProperty('--theme-transition-duration');
    }, 200);
    return () => clearTimeout(timer);
  }
};

/**
 * Checks if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Checks if user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Gets accessible theme based on user preferences
 */
export const getAccessibleTheme = (userPreference: ThemePreference): ThemeMode => {
  // Check for high contrast preference
  if (prefersHighContrast()) {
    return 'light'; // High contrast typically better in light mode
  }

  // Default behavior
  const systemTheme = getSystemTheme();
  return resolveTheme(userPreference, systemTheme);
};

/**
 * Applies accessibility enhancements based on user preferences
 */
export const applyAccessibilityEnhancements = () => {
  const root = document.documentElement;

  // Apply reduced motion if preferred
  if (prefersReducedMotion()) {
    root.style.setProperty('--theme-transition-duration', '0ms');
    root.classList.add('reduce-motion');
  }

  // Apply high contrast if needed
  if (prefersHighContrast()) {
    root.classList.add('high-contrast');
  }
};

/**
 * Validates theme preference value
 */
export const isValidThemePreference = (value: string): value is ThemePreference => {
  return ['system', 'light', 'dark', 'auto'].includes(value);
};

/**
 * Gets the display name for a theme preference
 */
export const getThemeDisplayName = (preference: ThemePreference): string => {
  const names = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
  };
  return names[preference];
};

/**
 * Gets the description for a theme preference
 */
export const getThemeDescription = (
  preference: ThemePreference,
  systemTheme: ThemeMode | null
): string => {
  const descriptions = {
    system: `Follow your device settings (currently ${systemTheme || 'unknown'})`,
    light: 'Always use light theme',
    dark: 'Always use dark theme',
    auto: `Switch based on time of day (currently ${getTimeBasedTheme()})`,
  };
  return descriptions[preference];
};
