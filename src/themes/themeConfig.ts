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

export type ThemeName = 'glee-world' | 'spelman-blue' | 'spelhouse' | 'music' | 'hbcu';

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
    headingShadow?: string;
    style: 'bold-friendly' | 'academic-serif' | 'collegiate' | 'modern-performance';
  };
  
  // Background settings
  background: {
    type: 'image' | 'gradient' | 'solid';
    value: string; // Image URL, gradient CSS, or solid color
    overlay?: string; // Optional overlay for readability
    position?: string; // Background position for images
    size?: string; // Background size (e.g., 'cover', '50%', '100px')
  };
  
  // Optional decorative elements
  decorations?: {
    headerLogo?: string;
    floatingElements?: 'music-notes' | 'equalizer' | 'watermark';
    animations?: boolean;
  };
  
  // Glass effect for cards (liquid glass / glassmorphism)
  glassEffect?: boolean;
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
    primary: '203 85% 63%',           // Sky blue accent #55BBEE
    primaryForeground: '219 78% 15%', // Dark blue text on primary
    secondary: '219 78% 31%',         // Spelman dark blue #11448B
    secondaryForeground: '0 0% 100%', // White on blue
    accent: '203 85% 63%',            // Sky blue accent
    accentForeground: '219 78% 15%',
    background: '219 78% 15%',        // Dark navy background
    foreground: '0 0% 100%',          // White text for dark background
    card: '219 60% 20%',              // Slightly lighter navy for cards
    cardForeground: '0 0% 100%',      // White text on cards
    muted: '219 50% 25%',             // Muted navy backgrounds
    mutedForeground: '0 0% 85%',      // Light muted text
    border: '219 40% 35%',            // Navy border
  },
  
  typography: {
    fontFamily: "'Roboto', sans-serif",
    headingFamily: "'Montserrat', sans-serif",
    style: 'bold-friendly',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(219 78% 15%) 0%, hsl(219 78% 25%) 50%, hsl(203 60% 20%) 100%)',
    overlay: 'none',
    position: 'center center',
  },
  
  decorations: {
    floatingElements: 'music-notes',
    animations: true,
  },
};

/**
 * SPELMAN BLUE THEME
 * Modern, bright, and spacious - inspired by official Spelman College portal
 */
const spelmanBlueTheme: ThemeConfig = {
  id: 'spelman-blue',
  name: 'Spelman Blue',
  description: 'Clean, modern, and professional - inspired by Spelman College',
  
  colors: {
    primary: '203 85% 63%',             // Lighter blue for buttons #55BBEE
    primaryForeground: '0 0% 100%',     // White on primary
    secondary: '208 100% 50%',          // Medium blue
    secondaryForeground: '0 0% 100%',   // White on secondary
    accent: '197 80% 70%',              // Light sky blue accent
    accentForeground: '208 100% 20%',   // Dark blue on accent
    background: '208 100% 33%',         // Spelman Blue background
    foreground: '0 0% 100%',            // White text for dark background
    card: '0 0% 100% / 0.15',           // Glass effect - translucent white
    cardForeground: '0 0% 100%',        // White text on cards
    muted: '0 0% 100% / 0.1',           // Translucent muted backgrounds
    mutedForeground: '0 0% 85%',        // Light muted text
    border: '0 0% 100% / 0.25',         // Translucent white border
  },
  
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    headingFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    style: 'modern-performance',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)',
    overlay: 'none',
  },
  
  decorations: {
    animations: false,
  },
  
  glassEffect: true,
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
    value: 'linear-gradient(to right, hsl(210 65% 45%) 0%, hsl(210 65% 45%) 50%, hsl(352 65% 28%) 50%, hsl(352 65% 28%) 100%)',
    overlay: 'rgba(255, 255, 255, 0.03)',
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
 * HBCU THEME
 * Bold Pan-African celebration with collegiate energy
 */
const hbcuTheme: ThemeConfig = {
  id: 'hbcu',
  name: 'HBCU Pride',
  description: 'Bold Pan-African celebration - Red, Gold, Green & Black',
  
  colors: {
    primary: '45 65% 55%',              // African Gold #D9B84B
    primaryForeground: '0 0% 0%',       // Black text on gold
    secondary: '0 72% 42%',             // Pan-African Red #BA1E1E
    secondaryForeground: '45 65% 75%',  // Light gold on red
    accent: '135 38% 27%',              // Deep Collegiate Green #2C5E32
    accentForeground: '45 65% 85%',     // Light gold on green
    background: '0 0% 0%',              // Pure black background
    foreground: '45 65% 75%',           // Gold text for dark bg
    card: '0 0% 8%',                    // Near-black cards
    cardForeground: '45 65% 75%',       // Gold text on cards
    muted: '0 0% 12%',                  // Dark muted bg
    mutedForeground: '135 30% 55%',     // Green muted text
    border: '0 72% 42%',                // Red borders
  },
  
  typography: {
    fontFamily: "'Graduate', 'Bebas Neue', sans-serif",
    headingFamily: "'Graduate', 'Oswald', sans-serif",
    headingShadow: '2px 2px 0px hsl(0 0% 0%), 3px 3px 0px hsl(0 72% 42%)',
    style: 'collegiate',
  },
  
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(0 0% 5%) 0%, hsl(0 0% 8%) 50%, hsl(135 20% 8%) 100%)',
    overlay: 'none',
  },
  
  decorations: {
    floatingElements: 'watermark',
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
  'hbcu': hbcuTheme,
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
