/**
 * THEME CONFIGURATION SYSTEM
 * 
 * This file defines the centralized theme configuration for the GleeWorld application.
 * Each theme includes colors, typography, backgrounds, and optional decorative elements.
 * 
 * HOW TO ADD A NEW THEME:
 * 1. Add a new key to the ThemeName type below
 * 2. Create a new theme object following the ThemeConfig interface
 * 3. Add it to the THEMES object
 * 4. Update the database constraint in the migration to include the new theme name
 * 5. Add background images to src/assets/themes/ if needed
 */

export type ThemeName = 'glee-world' | 'spelman-blue' | 'spelhouse' | 'music';

export interface ThemeConfig {
  id: ThemeName;
  name: string;
  description: string;
  
  // Color palette (HSL format for Tailwind CSS variables)
  colors: {
    primary: string;           // Main brand color
    primaryForeground: string; // Text on primary
    secondary: string;          // Secondary accent
    secondaryForeground: string;
    accent: string;             // Accent color
    accentForeground: string;
    background: string;         // Page background
    foreground: string;         // Main text color
    card: string;               // Card background
    cardForeground: string;     // Card text
    muted: string;              // Muted backgrounds
    mutedForeground: string;    // Muted text
    border: string;             // Border color
  };
  
  // Typography settings
  typography: {
    fontFamily: string;
    headingFamily?: string;
    style: 'bold-friendly' | 'academic-serif' | 'collegiate' | 'modern-performance';
  };
  
  // Background settings
  background: {
    type: 'image' | 'gradient' | 'solid';
    value: string; // Image URL, gradient CSS, or solid color
    overlay?: string; // Optional overlay for readability
    position?: string; // Background position for images
  };
  
  // Optional decorative elements
  decorations?: {
    headerLogo?: string;
    floatingElements?: 'music-notes' | 'equalizer' | 'watermark';
    animations?: boolean;
  };
}

/**
 * GLEE WORLD THEME
 * The default theme featuring Glee World branding
 */
const gleeWorldTheme: ThemeConfig = {
  id: 'glee-world',
  name: 'Glee World',
  description: 'Bold, musical, and vibrant - the signature Glee World experience',
  
  colors: {
    primary: '45 100% 50%',           // Gold
    primaryForeground: '0 0% 0%',     // Black text on gold
    secondary: '270 60% 40%',         // Royal purple
    secondaryForeground: '0 0% 100%', // White on purple
    accent: '45 100% 55%',            // Bright gold accent
    accentForeground: '0 0% 0%',
    background: '0 0% 98%',           // Very light gray
    foreground: '0 0% 8%',            // Near black
    card: '0 0% 100%',                // White cards
    cardForeground: '0 0% 8%',
    muted: '0 0% 96%',
    mutedForeground: '0 0% 25%',
    border: '0 0% 85%',
  },
  
  typography: {
    fontFamily: "'Roboto', sans-serif",
    headingFamily: "'Montserrat', sans-serif",
    style: 'bold-friendly',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(45 100% 95%) 0%, hsl(270 60% 95%) 100%)',
    overlay: 'rgba(255, 255, 255, 0.7)',
  },
  
  decorations: {
    floatingElements: 'music-notes',
    animations: true,
  },
};

/**
 * SPELMAN BLUE THEME
 * Clean academic aesthetic with Spelman's signature blue
 */
const spelmanBlueTheme: ThemeConfig = {
  id: 'spelman-blue',
  name: 'Spelman Blue',
  description: 'Elegant and academic, inspired by Spelman College',
  
  colors: {
    primary: '201 52% 66%',           // Spelman Blue #7BAFD4
    primaryForeground: '0 0% 100%',
    secondary: '220 50% 20%',         // Deep Navy
    secondaryForeground: '0 0% 100%',
    accent: '201 70% 75%',            // Light blue accent
    accentForeground: '220 50% 20%',
    background: '0 0% 100%',          // Pure white
    foreground: '220 50% 20%',        // Navy text
    card: '201 70% 98%',              // Very light blue tint
    cardForeground: '220 50% 20%',
    muted: '201 50% 95%',
    mutedForeground: '220 30% 40%',
    border: '201 40% 85%',
  },
  
  typography: {
    fontFamily: "'Georgia', serif",
    headingFamily: "'Playfair Display', serif",
    style: 'academic-serif',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(160deg, hsl(201 70% 97%) 0%, hsl(0 0% 100%) 50%, hsl(201 50% 95%) 100%)',
    position: 'center',
  },
  
  decorations: {
    floatingElements: 'watermark',
  },
};

/**
 * SPELHOUSE THEME
 * Combined Spelman + Morehouse identity
 */
const spelhouseTheme: ThemeConfig = {
  id: 'spelhouse',
  name: 'SpelHouse',
  description: 'United excellence - Spelman Blue meets Morehouse Maroon',
  
  colors: {
    primary: '201 52% 66%',           // Spelman Blue
    primaryForeground: '0 0% 100%',
    secondary: '352 53% 32%',         // Morehouse Maroon #79242F
    secondaryForeground: '0 0% 100%',
    accent: '201 70% 75%',
    accentForeground: '352 53% 32%',
    background: '0 0% 98%',
    foreground: '0 0% 8%',
    card: '0 0% 100%',
    cardForeground: '0 0% 8%',
    muted: '0 0% 96%',
    mutedForeground: '0 0% 30%',
    border: '0 0% 85%',
  },
  
  typography: {
    fontFamily: "'Merriweather', serif",
    headingFamily: "'Cinzel', serif",
    style: 'collegiate',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(90deg, hsl(201 52% 96%) 0%, hsl(0 0% 99%) 50%, hsl(352 53% 96%) 100%)',
    overlay: 'rgba(255, 255, 255, 0.85)',
  },
};

/**
 * MUSIC THEME
 * Modern, performance-inspired aesthetic
 */
const musicTheme: ThemeConfig = {
  id: 'music',
  name: 'Music Studio',
  description: 'Sleek and modern with electric energy',
  
  colors: {
    primary: '210 100% 50%',          // Electric blue
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 10%',            // Near black
    secondaryForeground: '0 0% 100%',
    accent: '180 100% 50%',           // Neon cyan
    accentForeground: '0 0% 0%',
    background: '0 0% 8%',            // Dark background
    foreground: '0 0% 95%',           // Light text
    card: '0 0% 12%',                 // Dark card
    cardForeground: '0 0% 95%',
    muted: '0 0% 15%',
    mutedForeground: '0 0% 70%',
    border: '0 0% 25%',
  },
  
  typography: {
    fontFamily: "'Inter', sans-serif",
    headingFamily: "'Orbitron', sans-serif",
    style: 'modern-performance',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(0 0% 5%) 0%, hsl(210 50% 10%) 50%, hsl(0 0% 8%) 100%)',
    overlay: 'rgba(0, 0, 0, 0.3)',
  },
  
  decorations: {
    floatingElements: 'equalizer',
    animations: true,
  },
};

/**
 * THEMES REGISTRY
 * All available themes indexed by their ID
 */
export const THEMES: Record<ThemeName, ThemeConfig> = {
  'glee-world': gleeWorldTheme,
  'spelman-blue': spelmanBlueTheme,
  'spelhouse': spelhouseTheme,
  'music': musicTheme,
};

/**
 * DEFAULT THEME
 * Fallback theme when user hasn't selected one
 */
export const DEFAULT_THEME: ThemeName = 'glee-world';

/**
 * Get a theme by name with fallback to default
 */
export function getTheme(themeName: ThemeName | null | undefined): ThemeConfig {
  if (!themeName || !THEMES[themeName]) {
    return THEMES[DEFAULT_THEME];
  }
  return THEMES[themeName];
}

/**
 * Get all available themes as an array
 */
export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEMES);
}
