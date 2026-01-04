/**
 * THEME CONTEXT
 * 
 * Provides global theme management for the application.
 * Fetches theme definitions from Supabase (authoritative source)
 * and applies them as CSS variables to the document root.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useThemeTemplates, ThemeTemplate } from '@/hooks/useThemeTemplates';

// Theme names match database IDs
export type ThemeName = 'glee-world' | 'spelman-blue' | 'spelhouse' | 'music' | 'hbcu';

interface ThemeContextType {
  currentTheme: ThemeTemplate | null;
  themeName: ThemeName;
  themes: ThemeTemplate[];
  setTheme: (theme: ThemeName) => Promise<void>;
  loading: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeName = 'glee-world';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: themes = [], isLoading: themesLoading } = useThemeTemplates();
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
  const [userLoading, setUserLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('gw-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Load user's theme preference from Supabase
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!user?.id) {
        setUserLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('theme_preference')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading theme preference:', error);
        } else if (data?.theme_preference) {
          setThemeName(data.theme_preference as ThemeName);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setUserLoading(false);
      }
    };

    loadThemePreference();
  }, [user?.id]);

  // Apply theme to document root whenever it changes
  useEffect(() => {
    const theme = themes.find(t => t.id === themeName);
    if (theme) {
      applyThemeToDocument(theme, isDarkMode);
    }
  }, [themeName, themes, isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('gw-dark-mode', String(newValue));
      return newValue;
    });
  };

  const setTheme = async (newTheme: ThemeName) => {
    if (!user?.id) {
      setThemeName(newTheme);
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ theme_preference: newTheme })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving theme preference:', error);
        throw error;
      }

      setThemeName(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  };

  const currentTheme = themes.find(t => t.id === themeName) || null;
  const loading = themesLoading || userLoading;

  return (
    <ThemeContext.Provider value={{ currentTheme, themeName, themes, setTheme, loading, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Apply theme from database to CSS custom properties on document root
 * This is the single source of truth for all theme styling
 */
function applyThemeToDocument(theme: ThemeTemplate, isDarkMode: boolean) {
  const root = document.documentElement;

  // Determine if dark mode should be applied
  const forceDark = theme.is_dark_theme;
  const forceLight = !theme.is_dark_theme && theme.glass_effect; // Glass themes are always light

  if (forceLight) {
    root.classList.remove('dark');
    root.classList.add('light');
  } else if (isDarkMode || forceDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  // Apply theme-specific class for CSS targeting
  root.setAttribute('data-theme', theme.id);
  
  // Theme-specific classes
  root.classList.toggle('spelman-blue-theme', theme.id === 'spelman-blue');
  root.classList.toggle('hbcu-theme', theme.id === 'hbcu');
  root.classList.toggle('glass-theme', theme.glass_effect);

  // Apply color variables
  root.style.setProperty('--primary', theme.color_primary);
  root.style.setProperty('--primary-foreground', theme.color_primary_foreground);
  root.style.setProperty('--secondary', theme.color_secondary);
  root.style.setProperty('--secondary-foreground', theme.color_secondary_foreground);
  root.style.setProperty('--accent', theme.color_accent);
  root.style.setProperty('--accent-foreground', theme.color_accent_foreground);
  root.style.setProperty('--background', theme.color_background);
  root.style.setProperty('--foreground', theme.color_foreground);
  root.style.setProperty('--card', theme.color_card);
  root.style.setProperty('--card-foreground', theme.color_card_foreground);
  root.style.setProperty('--muted', theme.color_muted);
  root.style.setProperty('--muted-foreground', theme.color_muted_foreground);
  root.style.setProperty('--border', theme.color_border);
  root.style.setProperty('--destructive', theme.color_destructive);
  root.style.setProperty('--destructive-foreground', theme.color_destructive_foreground);

  // Apply typography
  root.style.setProperty('--font-family', theme.font_family);
  if (theme.font_heading) {
    root.style.setProperty('--font-heading', theme.font_heading);
  }
  if (theme.heading_shadow) {
    root.style.setProperty('--heading-shadow', theme.heading_shadow);
  } else {
    root.style.removeProperty('--heading-shadow');
  }

  // Apply background
  root.style.setProperty('--theme-background', theme.background_value);
}
