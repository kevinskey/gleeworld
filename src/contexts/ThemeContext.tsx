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
 * GleeWorld design tokens are owned by `:root` in src/index.css (the
 * iOS 26 House/Stage system) — that stylesheet is the single source of
 * truth for these values.
 *
 * This used to be a `GW_TOKENS` map of hardcoded HSL triplets applied via
 * `element.style.setProperty` on every mount. Inline styles set on
 * `documentElement` always win over stylesheet rules, regardless of CSS
 * specificity or source order — so that map silently froze the app on
 * whatever colors it listed (stale oatmeal/cyan values) no matter what
 * `:root` in index.css said. When index.css was migrated to the iOS 26
 * palette, this component kept clobbering it back to the old look.
 *
 * The map never encoded a "reset to tenant-neutral defaults" mechanism —
 * TenantThemeRoot.tsx owns tenant color overrides (--site-accent,
 * --primary/--accent/--ring) independently and never depended on this
 * list. So instead of restating index.css's values here in a second
 * place (guaranteed to drift again), we just make sure nothing is left
 * inline: `removeProperty` for each token guards against any stray
 * inline value (e.g. leftover from HMR) and lets the stylesheet cascade
 * take over, same effect as never having set them.
 */
const RESET_TOKENS = [
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--muted',
  '--muted-foreground',
  '--border',
  '--destructive',
  '--destructive-foreground',
] as const;

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

    for (const prop of RESET_TOKENS) {
      root.style.removeProperty(prop);
    }

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
