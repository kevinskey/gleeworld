// Command Center background color — the user-chosen canvas behind the
// /dashboard plates. Stored per user in gw_user_preferences under
// BG_PREF_KEY (null/absent = the default token background).
//
// Why colors are clamped: the page's greeting, section labels, and ledger
// text render DIRECTLY on this background with the standard foreground
// tokens (near-black). A free-for-all picker would let a navy background
// make the greeting unreadable — and overriding --foreground on the wrapper
// would cascade into every card. So any custom pick is softened to a pastel
// of the chosen hue (lightness floor + saturation cap), which keeps WCAG AA
// contrast with the foreground token for every possible hue. The curated
// swatches below are pre-softened variants of the same rule.
//
// These hex literals are user-preference DATA (like a tenant's primaryColor
// hex in themeSchema), not component styling — the design-system "no
// hardcoded colors in styles" rule is about the latter.

export const BG_PREF_KEY = 'command_center_bg';

/** Lightness floor / saturation cap for readability (HSL, 0–100). */
const MIN_LIGHTNESS = 74;
const MAX_SATURATION = 55;

export interface BgSwatch {
  name: string;
  value: string | null; // null = default token background
}

export const BG_SWATCHES: BgSwatch[] = [
  { name: 'Default',  value: null },
  { name: 'Paper',    value: '#f6f4ef' },
  { name: 'Sand',     value: '#efe4d2' },
  { name: 'Blush',    value: '#f4dfdf' },
  { name: 'Rose',     value: '#f2dcea' },
  { name: 'Lavender', value: '#e6e0f4' },
  { name: 'Sky',      value: '#dce9f4' },
  { name: 'Mint',     value: '#dcefe3' },
  { name: 'Sage',     value: '#e4e9dc' },
  { name: 'Stone',    value: '#e4e2df' },
];

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isValidBgColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * Soften an arbitrary hex pick into a readable pastel of the same hue.
 * Already-soft colors (every curated swatch) pass through unchanged.
 */
export function softenBgColor(hex: string): string {
  if (!isValidBgColor(hex)) return hex;
  const { h, s, l } = hexToHsl(hex);
  const s2 = Math.min(s, MAX_SATURATION);
  const l2 = Math.max(l, MIN_LIGHTNESS);
  if (s2 === s && l2 === l) return hex.toLowerCase();
  return hslToHex(h, s2, l2);
}
