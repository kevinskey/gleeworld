
export const THEME_COLORS = {
  // Spelman Brand Colors (locked)
  brand: {
    primary: '#114488', // Spelman Dark Blue
    secondary: '#55BBEE', // Spelman Light Blue
    white: '#FFFFFF',
    black: '#000000',
  },
  // New accessible secondary palette
  palette: {
    teal: '#0E7C86', // success/calm
    emerald: '#2E7D32', // positive
    amber: '#B7791F', // warning  
    crimson: '#B3261E', // error
    orchid: '#7C4DFF', // creative/accent
  },
  // Slate ramp for text/backgrounds
  slate: {
    900: '#0F172A',
    800: '#1E293B', 
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },
  // Base backgrounds
  backgrounds: {
    app: '#F8FAFC', // --bg: var(--slate-50)
    surface: '#FFFFFF', // Surface default
    surfaceAlt: '#F6FAFF', // Alternate section (tinted light blue wash)
  },
  // Text colors
  text: {
    primary: '#0E1621', // near-black for body
    muted: '#475569',
    inverse: '#FFFFFF',
  },
  // Link colors
  links: {
    default: '#114488',
    hover: '#0D3A75',
    visited: '#0B2F5F',
  },
  // State colors
  states: {
    success: '#2E7D32',
    warning: '#B7791F', 
    error: '#B3261E',
    info: '#114488',
  }
} as const;

export const THEME_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const THEME_TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'SF Pro Text', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
    mono: ['Fira Code', 'monospace'],
    display: ['Bebas Neue', 'cursive'],
  },
  // Responsive font sizes using clamp()
  fontSize: {
    display: 'clamp(2.2rem, 2.5vw, 3rem)',
    h1: 'clamp(1.8rem, 2vw, 2.4rem)',
    h2: 'clamp(1.5rem, 1.5vw, 1.9rem)',
    h3: 'clamp(1.25rem, 1.2vw, 1.5rem)',
    body: 'clamp(1rem, 0.9vw, 1.0625rem)',
    small: 'clamp(0.9rem, 0.8vw, 0.95rem)',
  },
  lineHeight: {
    heading: '1.2',
    body: '1.6', 
    small: '1.45',
  }
} as const;

export const THEME_SPACING = {
  // Responsive spacing scale
  space: {
    1: '4px',
    2: '8px', 
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    7: '48px',
    8: '64px',
  }
} as const;

export const THEME_SHADOWS = {
  elevation: {
    1: '0 1px 2px rgba(2,6,23,.06)',
    2: '0 2px 8px rgba(2,6,23,.08)', 
    3: '0 10px 24px rgba(2,6,23,.12)',
  }
} as const;
