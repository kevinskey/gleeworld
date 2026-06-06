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
// Foreground tokens are now aligned with the surface they sit on:
//   - `--background` is cream (the actual page bg via UniversalLayout)
//     so `--foreground` and `--muted-foreground` are DARK text.
//   - `--card` is dark navy (modules / control center cards),
//     so `--card-foreground` stays WHITE for use inside cards.
// This pairing means `text-foreground` reads correctly on the page
// AND `text-card-foreground` reads correctly inside dark cards.
const GW_TOKENS = {
  '--primary':                '203 85% 63%',
  '--primary-foreground':     '219 78% 15%',
  '--secondary':              '219 78% 31%',
  '--secondary-foreground':   '0 0% 100%',
  '--accent':                 '203 85% 63%',
  '--accent-foreground':      '219 78% 15%',
  '--background':             '40 10% 96%',     // cream page bg (matches UniversalLayout)
  '--foreground':             '222 47% 11%',    // slate-900 — dark text for cream
  '--card':                   '220 35% 12%',    // dark navy module card
  '--card-foreground':        '0 0% 96%',       // near-white for dark cards
  '--muted':                  '40 8% 92%',      // very light warm gray
  '--muted-foreground':       '215 25% 27%',    // slate-700 — readable on cream
  '--border':                 '220 13% 85%',    // light cool gray border
  '--destructive':            '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
} as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Apply tokens once on mount
  useEffect(() => {
    const root = document.documentElement;
    // GleeWorld brand is "dark cards on cream page", NOT a true dark theme.
    // Previously we forced `.dark` on root, which activated Tailwind's
    // `dark:` variants across ~543 components — many of those use
    // `dark:text-slate-100` (white) and rendered invisibly on the cream page.
    // The semantic tokens below still drive the design; `dark:` variants
    // stay dormant.
    root.classList.remove('dark');
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
