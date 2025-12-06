/**
 * THEME CONTEXT
 * 
 * Provides global theme management for the application.
 * Handles loading user preferences from Supabase and applying themes.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ThemeName, ThemeConfig, getTheme, DEFAULT_THEME } from '@/themes/themeConfig';

interface ThemeContextType {
  currentTheme: ThemeConfig;
  themeName: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // Load user's theme preference from Supabase
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!user?.id) {
        setLoading(false);
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
        setLoading(false);
      }
    };

    loadThemePreference();
  }, [user?.id]);

  // Apply theme to document root whenever it changes
  useEffect(() => {
    console.log('🎨 Applying theme to document:', themeName);
    applyThemeToDocument(themeName);
  }, [themeName]);

  // Save theme preference to Supabase and update state
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

  const currentTheme = getTheme(themeName);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeName, setTheme, loading }}>
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
 * Apply theme colors to CSS custom properties on document root
 * This allows all components to use the theme colors via CSS variables
 */
function applyThemeToDocument(themeName: ThemeName) {
  const theme = getTheme(themeName);
  const root = document.documentElement;

  console.log('🎨 Theme being applied:', {
    themeName,
    background: theme.background,
    colors: theme.colors
  });

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVarName}`, value);
  });

  // Apply typography
  root.style.setProperty('--font-family', theme.typography.fontFamily);
  if (theme.typography.headingFamily) {
    root.style.setProperty('--font-heading', theme.typography.headingFamily);
  }

  // Apply background
  if (theme.background.type === 'image') {
    const bgSize = theme.background.size || 'cover';
    const bgValue = `${theme.background.value} no-repeat ${theme.background.position || 'center center'} / ${bgSize}`;
    root.style.setProperty('--theme-background', bgValue);
    console.log('🎨 Set --theme-background (image) to:', bgValue);
  } else if (theme.background.type === 'gradient' || theme.background.type === 'solid') {
    root.style.setProperty('--theme-background', theme.background.value);
    console.log('🎨 Set --theme-background to:', theme.background.value);
  }

  // Store theme name as data attribute for CSS targeting
  root.setAttribute('data-theme', themeName);
  
  // Apply dark mode class for dark themes
  if (themeName === 'music' || themeName === 'hbcu') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Apply HBCU theme class for special styling
  if (themeName === 'hbcu') {
    root.classList.add('hbcu-theme');
  } else {
    root.classList.remove('hbcu-theme');
  }
  
  // Apply heading shadow if defined
  if (theme.typography.headingShadow) {
    root.style.setProperty('--heading-shadow', theme.typography.headingShadow);
  } else {
    root.style.removeProperty('--heading-shadow');
  }
  
  // Apply glass effect class
  if (theme.glassEffect) {
    root.classList.add('glass-theme');
  } else {
    root.classList.remove('glass-theme');
  }
}
