// Derive a three-stop dark gradient from a tenant's primary brand color.
// Used by auth pages so login / signup / reset chrome reflects the
// current tenant's colorway instead of GleeWorld's default navy/purple.
//
// Strategy:
//   1. Convert hex → HSL
//   2. Compose three stops at decreasing-then-increasing lightness with a
//      slight hue rotation between them, so the result reads as a moody
//      branded gradient rather than a flat tinted background.
//   3. Always keep lightness low (8–22%) so white text + the auth card's
//      white/20 backdrop-blur layer stay legible.
//
// Falls back to the original GleeWorld navy/purple if the color can't
// be parsed.

const FALLBACK = 'linear-gradient(135deg, hsl(220, 60%, 12%) 0%, hsl(265, 50%, 18%) 50%, hsl(290, 45%, 20%) 100%)';
const BUTTON_FALLBACK = 'linear-gradient(90deg, hsl(220, 70%, 55%) 0%, hsl(265, 65%, 60%) 50%, hsl(290, 60%, 70%) 100%)';

// Mid-to-light gradient suitable for primary action buttons and accents
// inside light cards — derived from the same primary brand color the auth
// background uses, so the two read as a coherent palette.
export function tenantButtonGradient(primaryColor: string | null | undefined): string {
  if (!primaryColor) return BUTTON_FALLBACK;
  const hsl = hexToHsl(primaryColor);
  if (!hsl) return BUTTON_FALLBACK;
  const { h, s } = hsl;
  const sat = Math.max(55, Math.min(85, s + 20));
  const stop1 = `hsl(${(h - 15 + 360) % 360}, ${sat}%, 52%)`;
  const stop2 = `hsl(${h}, ${sat}%, 58%)`;
  const stop3 = `hsl(${(h + 30) % 360}, ${Math.max(40, sat - 10)}%, 68%)`;
  return `linear-gradient(90deg, ${stop1} 0%, ${stop2} 50%, ${stop3} 100%)`;
}

export function tenantAuthGradient(primaryColor: string | null | undefined): string {
  if (!primaryColor) return FALLBACK;
  const hsl = hexToHsl(primaryColor);
  if (!hsl) return FALLBACK;
  const { h, s } = hsl;
  // Clamp saturation so a pastel brand still produces a readable gradient.
  const sat = Math.max(35, Math.min(70, s));
  const stop1 = `hsl(${(h - 10 + 360) % 360}, ${sat}%, 10%)`;
  const stop2 = `hsl(${h}, ${sat - 5}%, 16%)`;
  const stop3 = `hsl(${(h + 25) % 360}, ${sat - 10}%, 20%)`;
  return `linear-gradient(135deg, ${stop1} 0%, ${stop2} 50%, ${stop3} 100%)`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!m) return null;
  let c = m[1];
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
