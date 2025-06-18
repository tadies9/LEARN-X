/**
 * Theme Script for SSR
 * Prevents flash of unstyled content by applying theme before React hydration
 */

export function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('learn-x-theme') || 'system';
        var resolvedTheme = theme;
        
        if (theme === 'system') {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else if (theme === 'auto') {
          var hour = new Date().getHours();
          resolvedTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }
        
        if (resolvedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
        
        // Set CSS custom property for theme awareness
        document.documentElement.style.setProperty('--resolved-theme', resolvedTheme);
        
        // Update meta theme-color for mobile browsers
        var metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#111827' : '#ffffff');
        }
      } catch (e) {
        console.warn('Theme script failed:', e);
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
