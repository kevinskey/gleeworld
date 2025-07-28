
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
				sm: '2rem',
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
				'sans': ['Roboto', 'system-ui', 'sans-serif'],
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
				// Custom brand colors - Updated Design System
				'spelman-blue': {
					dark: 'hsl(var(--spelman-blue-dark))',
					light: 'hsl(var(--spelman-blue-light))',
				},
				brand: {
					50: 'hsl(203, 85%, 97%)',
					100: 'hsl(203, 85%, 94%)',
					200: 'hsl(203, 85%, 87%)',
					300: 'hsl(203, 85%, 73%)',
					400: 'hsl(203, 85%, 63%)', // Secondary accent #55BBEE
					500: 'hsl(203, 85%, 63%)', // Secondary accent
					600: 'hsl(219, 78%, 31%)', // Primary brand #11448B
					700: 'hsl(219, 78%, 25%)',
					800: 'hsl(219, 78%, 20%)',
					900: 'hsl(219, 78%, 15%)',
					950: 'hsl(219, 78%, 10%)'
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
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'shimmer': {
					'0%': {
						backgroundPosition: '-200% 0'
					},
					'100%': {
						backgroundPosition: '200% 0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out',
				'scale-in': 'scale-in 0.4s ease-out',
				'shimmer': 'shimmer 2s linear infinite'
			},
			backdropBlur: {
				xs: '2px',
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(85, 187, 238, 0.15)',
				'glass-lg': '0 25px 50px -12px rgba(85, 187, 238, 0.25)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
