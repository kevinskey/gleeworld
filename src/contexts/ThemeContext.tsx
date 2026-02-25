/**
 * THEME CONTEXT (Simplified — Single Opinionated Theme)
 * 
 * GleeWorld uses a single, hardcoded "2026 Bento Glass" aesthetic.
 * No user-selectable themes. The brand owns the look.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  themeName: 'glee-world';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hardcoded GleeWorld design tokens (HSL triplets).
 * Applied once on mount — no switching, no DB calls, no local storage.
 */
const GW_TOKENS = {
  '--primary':                '203 85% 63%',
  '--primary-foreground':     '219 78% 15%',
  '--secondary':              '219 78% 31%',
  '--secondary-foreground':   '0 0% 100%',
  '--accent':                 '203 85% 63%',
  '--accent-foreground':      '219 78% 15%',
  '--background':             '220 40% 8%',
  '--foreground':             '0 0% 96%',
  '--card':                   '220 35% 12%',
  '--card-foreground':        '0 0% 96%',
  '--muted':                  '220 30% 16%',
  '--muted-foreground':       '0 0% 82%',
  '--border':                 '220 20% 22%',
  '--destructive':            '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
} as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Apply tokens once on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'glee-world');

    for (const [prop, value] of Object.entries(GW_TOKENS)) {
      root.style.setProperty(prop, value);
    }

    root.style.setProperty('--font-family', "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif");
    root.style.setProperty('--font-heading', "'Cinzel', 'Georgia', serif");
    root.style.setProperty('--theme-background', 'hsl(40 10% 96%)');
    root.style.removeProperty('--heading-shadow');
  }, []);

  return (
    <ThemeContext.Provider value={{ themeName: 'glee-world' }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * Returns a fixed themeName — kept for backward compatibility so
 * consuming components don't break.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Re-export for backward compat — any file importing ThemeName still compiles
export type ThemeName = 'glee-world';
