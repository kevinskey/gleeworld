/**
 * THEME STYLES HOOK
 * 
 * Utility hook that provides theme-aware CSS classes and inline styles
 * for components that need dynamic styling based on the current theme.
 */

import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeStyles() {
  const { currentTheme, themeName } = useTheme();

  // Generate theme-specific CSS classes
  const themeClasses = useMemo(() => ({
    // Background classes
    background: 'bg-background text-foreground',
    backgroundGradient: themeName === 'music' ? 'dark' : '',
    
    // Card styles
    card: 'bg-card text-card-foreground border-border',
    cardHover: 'hover:shadow-lg transition-shadow',
    
    // Button styles
    buttonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    buttonSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    buttonAccent: 'bg-accent text-accent-foreground hover:bg-accent/90',
    
    // Text styles
    heading: currentTheme?.font_heading 
      ? `font-[${currentTheme.font_heading}]`
      : '',
    textPrimary: 'text-foreground',
    textSecondary: 'text-muted-foreground',
    textAccent: 'text-accent',
    
    // Border styles
    border: 'border-border',
    divider: 'divide-border',
  }), [currentTheme, themeName]);

  // Generate inline styles for complex backgrounds
  const themeStyles = useMemo(() => ({
    backgroundStyle: currentTheme ? {
      background: currentTheme.background_type !== 'image' 
        ? currentTheme.background_value 
        : undefined,
      backgroundImage: currentTheme.background_type === 'image'
        ? `url(${currentTheme.background_value})`
        : undefined,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    } as React.CSSProperties : {},
    
    overlayStyle: undefined as React.CSSProperties | undefined,
  }), [currentTheme]);

  // Helper function to get card styles with theme background
  const getCardStyles = (elevated = false) => ({
    backgroundColor: `hsl(var(--card))`,
    color: `hsl(var(--card-foreground))`,
    borderColor: `hsl(var(--border))`,
    ...(elevated && {
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    }),
  });

  // Helper function to get button styles
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

  // Theme features (simplified - no decorations in database model)
  const hasDecorations = false;
  const decorationType = undefined;
  const hasAnimations = false;

  return {
    currentTheme,
    themeName,
    themeClasses,
    themeStyles,
    getCardStyles,
    getButtonStyles,
    hasDecorations,
    decorationType,
    hasAnimations,
  };
}
