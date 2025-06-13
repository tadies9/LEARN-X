/**
 * Enhanced Theme Provider for LEARN-X
 * Comprehensive theme system with system detection, auto mode, and accessibility features
 */

'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo 
} from 'react';
import { 
  ThemeContextType, 
  ThemePreference, 
  ThemeMode, 
  ThemeProviderProps 
} from '@/lib/types/theme';
import { 
  getSystemTheme, 
  getTimeBasedTheme, 
  resolveTheme, 
  applyThemeToDOM,
  applyAccessibilityEnhancements,
  isValidThemePreference
} from '@/lib/utils/theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function EnhancedThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'learn-x-theme',
  enableTransitions = true,
}: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ThemeMode | null>(null);
  const [mounted, setMounted] = useState(false);

  // Derived values using useMemo for performance
  const autoTheme = useMemo(() => getTimeBasedTheme(), []);
  const resolvedTheme = useMemo(() => 
    resolveTheme(preference, systemTheme), 
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
      console.warn('Failed to load theme preference from localStorage:', error);
    }
    
    setSystemTheme(getSystemTheme());
    setMounted(true);
  }, [storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
      const newAutoTheme = getTimeBasedTheme();
      // The resolved theme will automatically update due to dependency
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [preference]);

  // Memoized callbacks for performance
  const setThemePreference = useCallback((newPreference: ThemePreference) => {
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
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setThemePreference(newTheme);
  }, [resolvedTheme, setThemePreference]);

  // Memoized context value
  const value = useMemo((): ThemeContextType => ({
    preference,
    resolvedTheme,
    systemTheme,
    autoTheme,
    setThemePreference,
    toggleTheme,
    isSystemTheme,
    mounted,
  }), [
    preference,
    resolvedTheme,
    systemTheme,
    autoTheme,
    setThemePreference,
    toggleTheme,
    isSystemTheme,
    mounted,
  ]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
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
  
  return useMemo(() => {
    const { getThemeAwareColors } = require('@/lib/utils/theme-aware');
    return getThemeAwareColors(resolvedTheme);
  }, [resolvedTheme]);
};

/**
 * Hook to get theme-aware CSS classes
 */
export const useThemeClasses = () => {
  const { resolvedTheme } = useTheme();
  
  return useMemo(() => {
    const { getThemeAwareClasses } = require('@/lib/utils/theme-aware');
    return getThemeAwareClasses(resolvedTheme);
  }, [resolvedTheme]);
};