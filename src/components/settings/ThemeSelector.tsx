/**
 * THEME SELECTOR COMPONENT
 * 
 * Allows users to preview and select their preferred dashboard theme.
 * Displays all available themes with previews and applies selection.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { getAllThemes, ThemeName } from '@/themes/themeConfig';
import { Check, Palette, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ThemeSelector() {
  const { currentTheme, themeName, setTheme, loading } = useTheme();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const themes = getAllThemes();

  const handleThemeSelect = async (newTheme: ThemeName) => {
    setSaving(true);
    try {
      await setTheme(newTheme);
      toast({
        title: 'Theme Updated',
        description: `Your dashboard theme has been changed to ${themes.find(t => t.id === newTheme)?.name}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to Update Theme',
        description: 'There was an error saving your theme preference. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Settings
          </CardTitle>
          <CardDescription>Loading your theme preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Settings
        </CardTitle>
        <CardDescription>
          Choose your preferred visual theme for your dashboard experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Theme Display */}
        <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Theme</p>
              <p className="text-lg font-bold">{currentTheme.name}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>

        {/* Theme Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {themes.map((theme) => {
            const isSelected = theme.id === themeName;
            const colors = theme.colors;

            return (
              <Card
                key={theme.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary shadow-md' : ''
                }`}
                onClick={() => !saving && handleThemeSelect(theme.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                )}

                {/* Theme Preview */}
                <div
                  className="h-32 rounded-t-lg p-4 flex items-end relative overflow-hidden"
                  style={{
                    background: theme.background.value,
                  }}
                >
                  {theme.background.overlay && (
                    <div
                      className="absolute inset-0"
                      style={{ background: theme.background.overlay }}
                    />
                  )}
                  
                  {/* Color Palette Preview */}
                  <div className="flex gap-2 relative z-10">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: `hsl(${colors.primary})` }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: `hsl(${colors.secondary})` }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: `hsl(${colors.accent})` }}
                    />
                  </div>
                </div>

                {/* Theme Info */}
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{theme.name}</h3>
                      {theme.decorations?.animations && (
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{theme.description}</p>
                    
                    {/* Typography Style Badge */}
                    <div className="pt-2">
                      <Badge variant="outline" className="text-xs">
                        {theme.typography.style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>

                {/* Select Button */}
                {!isSelected && (
                  <div className="px-4 pb-4">
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThemeSelect(theme.id);
                      }}
                    >
                      {saving ? 'Applying...' : 'Apply Theme'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Help Text */}
        <div className="pt-4 text-sm text-muted-foreground">
          <p>
            Your theme preference is saved automatically and will be applied across all your devices.
            The theme affects colors, typography, backgrounds, and overall visual style of your dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
