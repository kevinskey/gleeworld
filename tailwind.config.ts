import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        brand: {
          50: 'hsl(var(--brand-50, 270 100% 97%))',
          100: 'hsl(var(--brand-100, 270 100% 93%))',
          200: 'hsl(var(--brand-200, 270 95% 85%))',
          300: 'hsl(var(--brand-300, 270 90% 75%))',
          400: 'hsl(var(--brand-400, 270 85% 65%))',
          500: 'hsl(var(--brand-500, 270 80% 55%))',
          600: 'hsl(var(--brand-600, 270 75% 45%))',
          700: 'hsl(var(--brand-700, 270 70% 35%))',
          800: 'hsl(var(--brand-800, 270 65% 25%))',
          900: 'hsl(var(--brand-900, 270 60% 15%))',
        },
        spelman: {
          navy: 'hsl(var(--spelman-navy, 220 70% 12%))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        'status-warning-bg': 'hsl(var(--status-warning-bg))',
        'status-warning-fg': 'hsl(var(--status-warning-fg))',
        'status-warning-border': 'hsl(var(--status-warning-border))',
        // Event-type chip tokens. These CSS custom properties already existed
        // in src/index.css but were never registered here, so every
        // `bg-event-*` / `text-event-*-fg` class referencing them across the
        // app (colorUtils.ts, EventDetailDialog, EventsList, etc.) was a
        // no-op — Tailwind never generated the utility. Registering them
        // makes those existing classes render for the first time, plus adds
        // the new 'service' (Church Service / Mass) pair.
        event: {
          performance: 'hsl(var(--event-performance))',
          'performance-fg': 'hsl(var(--event-performance-fg))',
          rehearsal: 'hsl(var(--event-rehearsal))',
          'rehearsal-fg': 'hsl(var(--event-rehearsal-fg))',
          sectional: 'hsl(var(--event-sectional))',
          'sectional-fg': 'hsl(var(--event-sectional-fg))',
          meeting: 'hsl(var(--event-meeting))',
          'meeting-fg': 'hsl(var(--event-meeting-fg))',
          'member-meeting': 'hsl(var(--event-member-meeting))',
          'member-meeting-fg': 'hsl(var(--event-member-meeting-fg))',
          'exec-meeting': 'hsl(var(--event-exec-meeting))',
          'exec-meeting-fg': 'hsl(var(--event-exec-meeting-fg))',
          'voice-lesson': 'hsl(var(--event-voice-lesson))',
          'voice-lesson-fg': 'hsl(var(--event-voice-lesson-fg))',
          tutorial: 'hsl(var(--event-tutorial))',
          'tutorial-fg': 'hsl(var(--event-tutorial-fg))',
          social: 'hsl(var(--event-social))',
          'social-fg': 'hsl(var(--event-social-fg))',
          workshop: 'hsl(var(--event-workshop))',
          'workshop-fg': 'hsl(var(--event-workshop-fg))',
          audition: 'hsl(var(--event-audition))',
          'audition-fg': 'hsl(var(--event-audition-fg))',
          general: 'hsl(var(--event-general))',
          'general-fg': 'hsl(var(--event-general-fg))',
          service: 'hsl(var(--event-service))',
          'service-fg': 'hsl(var(--event-service-fg))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        // shadcn-style cascade off the CSS variable
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Wireframe-segregation pass: every fixed-pixel "large" radius
        // utility (rounded-xl / 2xl / 3xl) is flattened to 0 so dialogs,
        // stat tiles, and feature cards land in the same crisp
        // geometry as the rest of the system. `rounded-full` is
        // untouched so pills + avatars still pill.
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
