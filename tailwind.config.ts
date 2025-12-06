import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				lg: '2rem',
			},
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		extend: {
			fontFamily: {
				'dancing': ['Dancing Script', 'cursive'],
				'bebas': ['Bebas Neue', 'cursive'],
				'roboto': ['Roboto', 'sans-serif'],
				'playfair': ['Playfair Display', 'serif'],
				'bravura': ['Bravura', 'serif'],
				'sans': ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
				'display': ['Bebas Neue', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Custom brand colors
				'spelman-blue': {
					dark: 'hsl(var(--spelman-blue-dark))',
					light: 'hsl(var(--spelman-blue-light))',
				},
				brand: {
					50: 'hsl(203 85% 97%)',
					100: 'hsl(203 85% 94%)',
					200: 'hsl(203 85% 87%)',
					300: 'hsl(203 85% 73%)',
					400: 'hsl(203 85% 63%)',
					500: 'hsl(203 85% 55%)',
					600: 'hsl(219 78% 31%)',
					700: 'hsl(219 78% 25%)',
					800: 'hsl(219 78% 20%)',
					900: 'hsl(219 78% 15%)',
					950: 'hsl(219 78% 10%)'
				},
				// Success/Warning/Info semantic colors
				success: {
					DEFAULT: 'hsl(142 76% 36%)',
					foreground: 'hsl(0 0% 100%)',
					muted: 'hsl(142 76% 92%)',
				},
				warning: {
					DEFAULT: 'hsl(38 92% 50%)',
					foreground: 'hsl(0 0% 0%)',
					muted: 'hsl(38 92% 92%)',
				},
				info: {
					DEFAULT: 'hsl(199 89% 48%)',
					foreground: 'hsl(0 0% 100%)',
					muted: 'hsl(199 89% 92%)',
				},
				// Event type colors
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
				},
				// Status colors
				status: {
					scheduled: 'hsl(var(--status-scheduled))',
					'scheduled-fg': 'hsl(var(--status-scheduled-fg))',
					confirmed: 'hsl(var(--status-confirmed))',
					'confirmed-fg': 'hsl(var(--status-confirmed-fg))',
					cancelled: 'hsl(var(--status-cancelled))',
					'cancelled-fg': 'hsl(var(--status-cancelled-fg))',
					completed: 'hsl(var(--status-completed))',
					'completed-fg': 'hsl(var(--status-completed-fg))',
				}
			},
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'2xl': 'calc(var(--radius) + 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(0.95)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-in-down': {
					'0%': { transform: 'translateY(-100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'marquee': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(-100%)' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				},
				'bounce-soft': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				'spin-slow': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(-2deg)' },
					'50%': { transform: 'rotate(2deg)' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'fade-in': 'fade-in 0.4s ease-out',
				'fade-in-up': 'fade-in-up 0.5s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'scale-out': 'scale-out 0.2s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-in-up': 'slide-in-up 0.4s ease-out',
				'slide-in-down': 'slide-in-down 0.4s ease-out',
				'shimmer': 'shimmer 2s linear infinite',
				'marquee': 'marquee 15s linear infinite',
				'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
				'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
				'spin-slow': 'spin-slow 3s linear infinite',
				'wiggle': 'wiggle 0.3s ease-in-out',
				'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out',
			},
			backdropBlur: {
				xs: '2px',
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(85, 187, 238, 0.15)',
				'glass-lg': '0 25px 50px -12px rgba(85, 187, 238, 0.25)',
				'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
				'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
				'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)',
				'button': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				'button-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
			},
			transitionTimingFunction: {
				'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
