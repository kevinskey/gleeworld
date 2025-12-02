/**
 * THEME STYLES HOOK
 * 
 * Utility hook that provides theme-aware CSS classes and inline styles
 * for components that need dynamic styling based on the current theme.
 * 
 * USAGE EXAMPLE:
 * 
 * import { useThemeStyles } from '@/hooks/useThemeStyles';
 * 
 * function MyComponent() {
 *   const { themeClasses, themeStyles, getCardStyles } = useThemeStyles();
 *   
 *   return (
 *     <div className={themeClasses.background}>
 *       <div className={themeClasses.card} style={getCardStyles()}>
 *         <h1 className={themeClasses.heading}>Hello</h1>
 *       </div>
 *     </div>
 *   );
 * }
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
    heading: currentTheme.typography.headingFamily 
      ? `font-[${currentTheme.typography.headingFamily}]`
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
    backgroundStyle: {
      background: currentTheme.background.type !== 'image' 
        ? currentTheme.background.value 
        : undefined,
      backgroundImage: currentTheme.background.type === 'image'
        ? `url(${currentTheme.background.value})`
        : undefined,
      backgroundPosition: currentTheme.background.position || 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    } as React.CSSProperties,
    
    overlayStyle: currentTheme.background.overlay
      ? {
          background: currentTheme.background.overlay,
        } as React.CSSProperties
      : undefined,
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

  // Helper to check if theme has decorations
  const hasDecorations = currentTheme.decorations !== undefined;
  const decorationType = currentTheme.decorations?.floatingElements;
  const hasAnimations = currentTheme.decorations?.animations || false;

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

/**
 * HOW TO USE THIS HOOK IN YOUR COMPONENTS:
 * 
 * Basic Usage:
 * ```tsx
 * function DashboardCard() {
 *   const { themeClasses, getCardStyles } = useThemeStyles();
 *   
 *   return (
 *     <div className={themeClasses.card} style={getCardStyles(true)}>
 *       <h2 className={themeClasses.heading}>Welcome</h2>
 *       <p className={themeClasses.textSecondary}>Your content here</p>
 *     </div>
 *   );
 * }
 * ```
 * 
 * With Background:
 * ```tsx
 * function PageBackground() {
 *   const { themeStyles } = useThemeStyles();
 *   
 *   return (
 *     <div style={themeStyles.backgroundStyle}>
 *       {themeStyles.overlayStyle && (
 *         <div style={themeStyles.overlayStyle} />
 *       )}
 *       <div>Content</div>
 *     </div>
 *   );
 * }
 * ```
 * 
 * Conditional Rendering Based on Theme:
 * ```tsx
 * function DecoratedCard() {
 *   const { decorationType, hasAnimations } = useThemeStyles();
 *   
 *   return (
 *     <div>
 *       {decorationType === 'music-notes' && <MusicNoteDecoration />}
 *       {hasAnimations && <AnimatedElement />}
 *     </div>
 *   );
 * }
 * ```
 */
