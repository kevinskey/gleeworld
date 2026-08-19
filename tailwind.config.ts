import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

// Container-query variants for the public-site blocks: `cq-sm:`, `cq-md:`,
// `cq-lg:` mirror the `sm:`/`md:`/`lg:` breakpoints but resolve against the
// nearest `gwsite` container (the `.gw-site` root) instead of the viewport.
//
// Why: the public page builder previews a site inside a 390px-wide frame that
// still lives in the editor's (wide) viewport, so plain `sm:`/`lg:` media
// queries fire and the "phone" preview renders the desktop layout, overflowing
// the frame. On the published `/sites/:slug` route `.gw-site` spans the
// viewport, so `cq-*` and the media-query breakpoints agree there.
const siteContainerVariants = plugin(({ matchVariant }) => {
  matchVariant('cq', (value: string) => `@container gwsite ${value}`, {
    values: {
      sm: '(min-width: 640px)',
      md: '(min-width: 768px)',
      lg: '(min-width: 1024px)',
      xl: '(min-width: 1280px)',
    },
  });
});

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    // xs (480px, large phones / phone-landscape) declared BEFORE the default
    // scale — screen order = emitted media-query order, and a later query
    // wins ties, so appending xs via extend would let `xs:` overrides beat
    // `sm:`/`md:` ones. ~30 `xs:` classes across 12 files were written
    // assuming this breakpoint existed and silently compiled to nothing
    // until 2026-08-02 (the audio scrubber was invisible at every width).
    screens: { xs: '480px', ...defaultTheme.screens },
    extend: {
      fontFamily: {
        // Route `font-serif` through a token so the serif voice (the House
        // greeting, People) can follow tenant branding. It previously
        // resolved to Tailwind's built-in Georgia stack, which is a
        // hardcoded font literal — a tenant that picks a display face in
        // Theme Studio still got Georgia here.
        serif: ['var(--font-serif)'],
      },
      fontSize: {
        // Apple HIG Dynamic Type (Large) — px on purpose: rem would ride
        // the 17px body and break the 4px spacing grid.
        '2xs': ['11px', { lineHeight: '13px' }],                              // Caption 2 — tab labels only
        xs:   ['13px', { lineHeight: '18px', letterSpacing: '-0.08px' }],     // Footnote
        sm:   ['15px', { lineHeight: '20px', letterSpacing: '-0.23px' }],     // Subhead
        base: ['17px', { lineHeight: '22px', letterSpacing: '-0.43px' }],     // Body
        lg:   ['20px', { lineHeight: '25px', letterSpacing: '-0.45px' }],     // Title 3
        xl:   ['22px', { lineHeight: '28px', letterSpacing: '-0.26px' }],     // Title 2
        '2xl': ['28px', { lineHeight: '34px', letterSpacing: '0.38px' }],     // Title 1
        '3xl': ['34px', { lineHeight: '41px', letterSpacing: '0.4px' }],      // Large Title
        // 4xl+ left at Tailwind defaults; hero surfaces get audited in Phase 2.
      },
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
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          text: 'hsl(var(--success-text))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
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
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        jiggle: {
          '0%, 100%': { transform: 'rotate(-1.5deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        jiggle: 'jiggle 0.3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography'), siteContainerVariants],
};

export default config;
