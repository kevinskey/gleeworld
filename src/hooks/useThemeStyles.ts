/**
 * THEME STYLES HOOK (Simplified — single theme)
 */

import { useMemo } from 'react';

export function useThemeStyles() {
  const themeClasses = useMemo(() => ({
    background: 'bg-background text-foreground',
    backgroundGradient: '',
    card: 'bg-card text-card-foreground border-border',
    cardHover: 'hover:shadow-lg transition-shadow',
    buttonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    buttonSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    buttonAccent: 'bg-accent text-accent-foreground hover:bg-accent/90',
    heading: '',
    textPrimary: 'text-foreground',
    textSecondary: 'text-muted-foreground',
    textAccent: 'text-accent',
    border: 'border-border',
    divider: 'divide-border',
  }), []);

  const themeStyles = useMemo(() => ({
    backgroundStyle: {} as React.CSSProperties,
    overlayStyle: undefined as React.CSSProperties | undefined,
  }), []);

  const getCardStyles = (elevated = false) => ({
    backgroundColor: `hsl(var(--card))`,
    color: `hsl(var(--card-foreground))`,
    borderColor: `hsl(var(--border))`,
    ...(elevated && {
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    }),
  });

  const getButtonStyles = (variant: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: { bg: '--primary', fg: '--primary-foreground' },
      secondary: { bg: '--secondary', fg: '--secondary-foreground' },
      accent: { bg: '--accent', fg: '--accent-foreground' },
    };
    const colors = colorMap[variant];
    return {
      backgroundColor: `hsl(var(${colors.bg}))`,
      color: `hsl(var(${colors.fg}))`,
    };
  };

  return {
    currentTheme: null,
    themeName: 'glee-world' as const,
    themeClasses,
    themeStyles,
    getCardStyles,
    getButtonStyles,
    hasDecorations: false,
    decorationType: undefined,
    hasAnimations: false,
  };
}
