// Theme + print-format presentation registry.
//
// Each theme is a typography + palette + hero-backdrop bundle. The
// editor and the public /program/:slug page both render through these
// classes so a published program looks identical in both places.
//
// Themes use Google Fonts that index.html already preloads (Playfair
// Display, Cinzel, Cormorant Garamond, Bebas Neue, Lato, Open Sans,
// Libre Baskerville, etc), so adding a theme = one entry here, no
// extra <link> rewiring.

import type { CSSProperties } from 'react';
import type { VisualTheme, PrintFormat } from './types';

export interface ThemeStyle {
  /** Tailwind classes for the outer page wrapper. */
  container: string;
  /** Tailwind classes for each program-card surface. */
  card: string;
  /** Tailwind classes for the small uppercase "accent" label inside cards. */
  accent: string;
  /** Optional inline style for the hero card backdrop (gradient / pattern). */
  heroBg?: CSSProperties;
  /** Optional inline style for the hero title (font family / weight / colour). */
  heroTitle?: CSSProperties;
  /** Optional inline style applied to every card's body text (font family). */
  body?: CSSProperties;
}

export const THEME_OPTIONS: Array<{ value: VisualTheme; label: string; sub: string }> = [
  { value: 'classic-concert',    label: 'Classic Concert',    sub: 'Amber + Playfair serif' },
  { value: 'modern-show',        label: 'Modern Show',        sub: 'Cyan on zinc, monospace accents' },
  { value: 'chamber-minimalist', label: 'Chamber Minimalist', sub: 'Stone palette + JetBrains mono' },
  { value: 'cathedral',          label: 'Cathedral',          sub: 'Burgundy + Cinzel display' },
  { value: 'sunset-recital',     label: 'Sunset Recital',     sub: 'Peach gradient + Cormorant' },
  { value: 'jazz-club',          label: 'Jazz Club',          sub: 'Electric blue + Bebas Neue' },
  { value: 'spring-pastoral',    label: 'Spring Pastoral',    sub: 'Sage + Cormorant + Open Sans' },
  { value: 'black-tie',          label: 'Black Tie',          sub: 'Onyx + gold + Cinzel' },
];

export function themeStyles(theme: VisualTheme): ThemeStyle {
  switch (theme) {
    case 'modern-show':
      return {
        container: 'bg-zinc-950 text-zinc-100',
        card: 'bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-6',
        accent: 'text-cyan-400 font-mono tracking-wider text-[10px] uppercase block mb-1',
        heroBg: { background: 'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.25), transparent 60%), radial-gradient(circle at 80% 100%, rgba(168,85,247,0.18), transparent 55%), #0a0a0b' },
        heroTitle: { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontWeight: 400 },
      };
    case 'chamber-minimalist':
      return {
        container: 'bg-stone-50 text-stone-900',
        card: 'bg-white border border-stone-200 rounded-xl shadow-sm p-6',
        accent: 'text-stone-500 uppercase font-bold text-[10px] tracking-widest block mb-1',
        body: { fontFamily: "'Inter', system-ui, sans-serif" },
        heroTitle: { fontFamily: "'Libre Baskerville', serif", fontWeight: 700 },
      };
    case 'cathedral':
      return {
        container: 'bg-stone-100 text-[#3a1717]',
        card: 'bg-white border border-stone-300 rounded-sm shadow-md p-6',
        accent: 'text-[#7a1428] uppercase font-bold text-[10px] tracking-[0.24em] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #5e0b1d 0%, #3a0712 100%)', color: '#f6e9c8' },
        heroTitle: { fontFamily: "'Cinzel', serif", fontWeight: 700, letterSpacing: '0.06em', color: '#f6e9c8' },
        body: { fontFamily: "'Cormorant Garamond', 'Libre Baskerville', serif" },
      };
    case 'sunset-recital':
      return {
        container: 'bg-[#fff7ee] text-[#3b1f1a]',
        card: 'bg-white border border-orange-100 rounded-2xl shadow-md p-6',
        accent: 'text-[#c45a1f] uppercase font-semibold text-[10px] tracking-[0.22em] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #ffb27d 0%, #ff7a59 45%, #d94d8c 100%)', color: '#fff' },
        heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: '#fff' },
        body: { fontFamily: "'Cormorant Garamond', 'Libre Baskerville', serif" },
      };
    case 'jazz-club':
      return {
        container: 'bg-[#0a0f1e] text-[#e9eef9]',
        card: 'bg-[#101729] border border-[#1f2a44] rounded-xl shadow-xl p-6',
        accent: 'text-[#39c0ff] uppercase font-bold text-[10px] tracking-[0.26em] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #0a0f1e 0%, #1a2b56 60%, #002b6b 100%)', color: '#e9eef9' },
        heroTitle: { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontWeight: 400, color: '#39c0ff' },
        body: { fontFamily: "'Lato', system-ui, sans-serif" },
      };
    case 'spring-pastoral':
      return {
        container: 'bg-[#f6f9f2] text-[#2c3a2c]',
        card: 'bg-white border border-[#dde5d3] rounded-2xl shadow-sm p-6',
        accent: 'text-[#5a7c5a] uppercase font-semibold text-[10px] tracking-[0.22em] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #c8d5b9 0%, #e7eed6 50%, #d6e8b9 100%)' },
        heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: '#2c3a2c' },
        body: { fontFamily: "'Open Sans', system-ui, sans-serif" },
      };
    case 'black-tie':
      return {
        container: 'bg-[#0d0c0a] text-[#f0e6d2]',
        card: 'bg-[#15130f] border border-[#2c2620] rounded-md shadow-xl p-6',
        accent: 'text-[#d4b067] uppercase font-bold text-[10px] tracking-[0.32em] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #1c1610 0%, #0d0c0a 60%), radial-gradient(circle at 50% 0%, rgba(212,176,103,0.18), transparent 60%)', color: '#d4b067' },
        heroTitle: { fontFamily: "'Cinzel', serif", fontWeight: 700, letterSpacing: '0.12em', color: '#d4b067' },
        body: { fontFamily: "'Lato', system-ui, sans-serif" },
      };
    case 'classic-concert':
    default:
      return {
        container: 'bg-slate-50 text-slate-900',
        card: 'bg-white border-t-4 border-t-amber-700 border-x border-b border-slate-200 rounded-xl shadow-sm p-6',
        accent: 'text-amber-700 font-semibold tracking-wide uppercase text-[10px] block mb-1',
        heroBg: { background: 'linear-gradient(135deg, #fff8ec 0%, #f3e2bb 100%)' },
        heroTitle: { fontFamily: "'Playfair Display', serif", fontWeight: 700 },
        body: { fontFamily: "'Libre Baskerville', 'Playfair Display', serif" },
      };
  }
}

export function printFormatStyles(format: PrintFormat): string {
  // Max-widths are intentionally roomier than the equivalent paper
  // dimensions — these classes drive both the editor preview AND the
  // published /program/:slug page, and a literal 8.5" column reads as
  // a tiny strip on a 1440px+ monitor. The print stylesheet handles
  // actual paper geometry.
  switch (format) {
    case 'half-fold': return 'max-w-3xl mx-auto';
    case 'trifold':   return 'max-w-7xl mx-auto';
    case 'qr-lobby':  return 'max-w-lg mx-auto text-center';
    case 'letter-portrait':
    default:          return 'max-w-6xl mx-auto';
  }
}
