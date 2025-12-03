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
    primary: '219 78% 31%',           // Spelman dark blue #11448B
    primaryForeground: '0 0% 100%',   // White text on blue
    secondary: '203 85% 63%',         // Sky blue accent #55BBEE
    secondaryForeground: '0 0% 100%', // White on blue
    accent: '203 85% 63%',            // Sky blue accent
    accentForeground: '0 0% 100%',
    background: '0 0% 98%',           // Light background (near white)
    foreground: '0 0% 8%',            // Dark text for light background
    card: '0 0% 100%',                // White cards
    cardForeground: '0 0% 8%',        // Dark text on white cards
    muted: '0 0% 96%',                // Light muted backgrounds
    mutedForeground: '0 0% 25%',      // Dark muted text
    border: '0 0% 85%',               // Light border
  },
  
  typography: {
    fontFamily: "'Roboto', sans-serif",
    headingFamily: "'Montserrat', sans-serif",
    style: 'bold-friendly',
  },
  
  background: {
    type: 'image',
    value: 'url(/images/themes/gleeworld-bg.jpg)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    position: 'center center',
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
 * Combined Spelman + Morehouse identity - Bold collegiate styling
 */
const spelhouseTheme: ThemeConfig = {
  id: 'spelhouse',
  name: 'SpelHouse',
  description: 'United excellence - Spelman Blue meets Morehouse Maroon',
  
  colors: {
    primary: '210 65% 45%',              // Bold Spelman Blue (darker, more saturated)
    primaryForeground: '0 0% 100%',
    secondary: '352 65% 28%',            // Bold Morehouse Maroon (richer)
    secondaryForeground: '0 0% 100%',
    accent: '210 70% 55%',               // Lighter Spelman Blue accent
    accentForeground: '0 0% 100%',
    background: '210 30% 95%',           // Light blue-tinted background
    foreground: '352 65% 20%',           // Dark maroon text
    card: '0 0% 100%',
    cardForeground: '352 65% 20%',
    muted: '210 20% 92%',
    mutedForeground: '352 30% 35%',
    border: '210 20% 80%',
  },
  
  typography: {
    fontFamily: "'Libre Baskerville', 'Georgia', serif",
    headingFamily: "'Playfair Display', 'Georgia', serif",
    style: 'collegiate',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(210 65% 45%) 0%, hsl(210 65% 45%) 50%, hsl(352 65% 28%) 50%, hsl(352 65% 28%) 100%)',
    overlay: 'rgba(255, 255, 255, 0.08)',
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
