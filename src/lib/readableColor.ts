// Contrast-safe tenant colors for app chrome.
//
// Tenants pick brand colors for their PUBLIC site, where light golds and
// pastels sit on dark hero photos and look great. The app then routes the
// same hex into shadcn's --primary/--accent, which get used as text, icon,
// and button colors on white cards — where a light brand color becomes
// unreadable (2026-07-31: pale-gold toolbar icons invisible on white).
//
// readableOnLightHex() keeps the tenant's hue and saturation but walks
// lightness DOWN until the color clears `minRatio` WCAG contrast against
// white. Colors that already pass return unchanged, so dark brands are
// byte-identical. The public site's raw --site-* variables are never
// clamped — this is for app-chrome tokens only.

function parseHex(hex: string): [number, number, number] | null {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of a hex color against white. 1 (white) … 21 (black). */
export function contrastVsWhite(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 1.05 / (relLuminance(...rgb) + 0.05);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/**
 * Return `hex` darkened (hue/saturation preserved) until it reaches
 * `minRatio` contrast against white; unchanged if it already passes.
 * Null for unparseable input.
 */
export function readableOnLightHex(hex: string, minRatio = 4.5): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  if (1.05 / (relLuminance(...rgb) + 0.05) >= minRatio) return hex;
  const [h, s, l0] = rgbToHsl(...rgb);
  for (let l = l0; l >= 0; l -= 0.01) {
    const cand = hslToRgb(h, s, l);
    if (1.05 / (relLuminance(...cand) + 0.05) >= minRatio) return toHex(...cand);
  }
  return '#000000';
}
