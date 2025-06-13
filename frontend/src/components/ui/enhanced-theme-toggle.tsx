/**
 * Enhanced Theme Toggle for LEARN-X
 * Comprehensive theme selection with visual feedback and accessibility
 */

'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/enhanced-theme-provider';
import { 
  Monitor, 
  Moon, 
  Sun, 
  Clock, 
  Check,
  Palette 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getThemeDisplayName, getThemeDescription } from '@/lib/utils/theme';

interface ThemeOption {
  value: 'system' | 'light' | 'dark' | 'auto';
  label: string;
  icon: typeof Monitor;
  description: string;
}

export function EnhancedThemeToggle() {
  const { 
    preference, 
    setThemePreference, 
    resolvedTheme, 
    systemTheme,
    mounted 
  } = useTheme();

  const themeOptions: ThemeOption[] = [
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: getThemeDescription('system', systemTheme),
    },
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: getThemeDescription('light', systemTheme),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: getThemeDescription('dark', systemTheme),
    },
    {
      value: 'auto',
      label: 'Auto',
      icon: Clock,
      description: getThemeDescription('auto', systemTheme),
    },
  ];

  const getCurrentIcon = () => {
    const currentOption = themeOptions.find(option => option.value === preference);
    if (!currentOption) return Palette;
    return currentOption.icon;
  };

  const CurrentIcon = getCurrentIcon();

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Palette className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={cn(
            "relative transition-colors",
            resolvedTheme === 'dark' 
              ? "hover:bg-accent/20" 
              : "hover:bg-accent"
          )}
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">
            Toggle theme (current: {getThemeDisplayName(preference)})
          </span>
          
          {/* Visual indicator for current resolved theme */}
          <div 
            className={cn(
              "absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-background",
              resolvedTheme === 'dark' 
                ? "bg-blue-400" 
                : "bg-yellow-400"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Theme Settings
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = preference === option.value;
          
          return (
            <DropdownMenuItem 
              key={option.value}
              onClick={() => setThemePreference(option.value)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                isSelected && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <div className="p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Currently using:</span>
            <Badge variant="outline" className="text-xs">
              {resolvedTheme === 'dark' ? '🌙' : '☀️'} {resolvedTheme}
            </Badge>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple theme toggle button (just toggles between light/dark)
 */
export function SimpleThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Palette className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="transition-transform hover:scale-105"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">
        Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} theme
      </span>
    </Button>
  );
}