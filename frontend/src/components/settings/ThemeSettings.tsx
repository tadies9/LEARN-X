/**
 * Comprehensive Theme Settings Component for LEARN-X
 * Full theme configuration interface with visual feedback
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTheme, useThemeColors } from '@/components/providers/EnhancedThemeProvider';
import { Monitor, Sun, Moon, Clock, Palette, Eye, Contrast, Zap, Download } from 'lucide-react';
import { getThemeDisplayName, getThemeDescription } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

export function ThemeSettings() {
  const {
    preference,
    setThemePreference,
    resolvedTheme,
    systemTheme,
    autoTheme,
    isSystemTheme,
    mounted,
  } = useTheme();

  const colors = useThemeColors(resolvedTheme);

  const themeOptions = [
    {
      value: 'system' as const,
      label: 'System',
      description: getThemeDescription('system', systemTheme),
      icon: Monitor,
      badge: 'Recommended',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      value: 'light' as const,
      label: 'Light',
      description: getThemeDescription('light', systemTheme),
      icon: Sun,
      badge: 'Classic',
      badgeColor: 'bg-yellow-100 text-yellow-800',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: getThemeDescription('dark', systemTheme),
      icon: Moon,
      badge: 'Focus',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      value: 'auto' as const,
      label: 'Auto',
      description: getThemeDescription('auto', systemTheme),
      icon: Clock,
      badge: 'Smart',
      badgeColor: 'bg-green-100 text-green-800',
    },
  ];

  const exportThemeSettings = () => {
    const settings = {
      preference,
      resolvedTheme,
      timestamp: new Date().toISOString(),
      systemTheme,
      autoTheme,
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learn-x-theme-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 animate-pulse" />
            Loading Theme Settings...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Preferences
          </CardTitle>
          <CardDescription>
            Customize how LEARN-X appears across all your devices and study sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Theme Mode</Label>
            <RadioGroup value={preference} onValueChange={setThemePreference} className="space-y-4">
              {themeOptions.map((option) => (
                <div key={option.value} className="relative">
                  <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-accent/50">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                        <Badge variant="outline" className={cn('text-xs', option.badgeColor)}>
                          {option.badge}
                        </Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Current Theme Status
          </CardTitle>
          <CardDescription>Real-time information about your active theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Theme</Label>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2',
                    resolvedTheme === 'dark'
                      ? 'bg-gray-800 border-gray-600'
                      : 'bg-white border-gray-300'
                  )}
                />
                <span className="font-mono text-sm">{resolvedTheme}</span>
                <Badge variant="outline">{resolvedTheme === 'dark' ? '🌙' : '☀️'}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Preference</Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{getThemeDisplayName(preference)}</span>
                {isSystemTheme && (
                  <Badge variant="secondary" className="text-xs">
                    Following System
                  </Badge>
                )}
              </div>
            </div>

            {systemTheme && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">System Theme</Label>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{systemTheme}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Auto Theme</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{autoTheme}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Contrast className="h-5 w-5" />
            Color Preview
          </CardTitle>
          <CardDescription>
            Preview of theme-specific colors used throughout LEARN-X
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Features</Label>
            <div className={cn('p-4 rounded-lg border', colors.aiGradient)}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-ai-primary" />
                <span className="text-sm font-medium text-ai-foreground">
                  AI-powered personalization active
                </span>
              </div>
            </div>
          </div>

          {/* Learning Status Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Learning Progress</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(colors.statusColors).map(([status, colorClass]) => (
                <div
                  key={status}
                  className={cn('p-2 rounded text-xs text-center', colorClass as string)}
                >
                  {status.replace('-', ' ')}
                </div>
              ))}
            </div>
          </div>

          {/* Achievement Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Achievements</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(colors.achievementColors).map(([level, gradient]) => (
                <div
                  key={level}
                  className={cn(
                    'p-2 rounded text-xs text-center text-white bg-gradient-to-r',
                    gradient as string
                  )}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
          <CardDescription>Export your theme preferences and additional options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Export Theme Settings</Label>
              <p className="text-xs text-muted-foreground">
                Download your current theme configuration
              </p>
            </div>
            <Button onClick={exportThemeSettings} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
