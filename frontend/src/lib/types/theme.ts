/**
 * Theme System Types for LEARN-X
 * Comprehensive type definitions for the multi-level theme system
 */

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  systemTheme: ThemeMode | null;
  autoTheme: ThemeMode;
}

export interface ThemeContextType extends ThemeConfig {
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  mounted: boolean;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  storageKey?: string;
  enableTransitions?: boolean;
}

export interface ThemeColors {
  // AI-specific gradients
  aiGradient: string;
  
  // Status colors
  statusColors: {
    'not-started': string;
    'in-progress': string;
    'completed': string;
    'mastered': string;
  };
  
  // Gamification colors
  achievementColors: {
    bronze: string;
    silver: string;
    gold: string;
    diamond: string;
  };
}

export interface ThemeAnalytics {
  trackThemeChange: (from: string, to: string) => void;
  trackThemePreference: (preference: string) => void;
  getThemeUsageStats: () => Promise<{
    lightUsage: number;
    darkUsage: number;
    autoUsage: number;
    systemUsage: number;
  }>;
}

export interface AccessibilityOptions {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersDarkMode: boolean;
}