import { describe, it, expect } from 'vitest';
import {
  BG_SWATCHES, isValidBgColor, softenBgColor,
} from './commandCenterBackground';

// Relative luminance / contrast per WCAG. The whole promise of the clamp is
// that ANY hue the user picks stays readable against the near-black
// foreground token (#1a1a1a-ish) — so the test enforces the contrast ratio
// itself, not the clamp's internal numbers.
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 0xff) + 0.7152 * ch((n >> 8) & 0xff) + 0.0722 * ch(n & 0xff);
}
const contrastVsForeground = (bg: string) => {
  const dark = 0.011; // ~#171717, the light-theme foreground neighborhood
  const l = luminance(bg);
  return (Math.max(l, dark) + 0.05) / (Math.min(l, dark) + 0.05);
};

describe('commandCenterBackground', () => {
  it('accepts 6-digit hex and rejects everything else', () => {
    expect(isValidBgColor('#efe4d2')).toBe(true);
    expect(isValidBgColor('#EFE4D2')).toBe(true);
    expect(isValidBgColor('#fff')).toBe(false);
    expect(isValidBgColor('efe4d2')).toBe(false);
    expect(isValidBgColor('url(javascript:x)')).toBe(false);
    expect(isValidBgColor(null)).toBe(false);
  });

  it('keeps every curated swatch AA-readable against the foreground', () => {
    for (const s of BG_SWATCHES) {
      if (!s.value) continue;
      expect(contrastVsForeground(s.value), `${s.name} ${s.value}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('softens dark or saturated picks to an AA-readable pastel of the same-ish hue', () => {
    for (const pick of ['#000080', '#ff0000', '#123456', '#004400', '#310062']) {
      const soft = softenBgColor(pick);
      expect(isValidBgColor(soft)).toBe(true);
      expect(contrastVsForeground(soft), `${pick} -> ${soft}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('passes already-soft colors through unchanged', () => {
    expect(softenBgColor('#EFE4D2')).toBe('#efe4d2');
    for (const s of BG_SWATCHES) {
      if (!s.value) continue;
      expect(softenBgColor(s.value)).toBe(s.value);
    }
  });

  it('curated swatch values are themselves fixed points of the clamp (never re-softened)', () => {
    // If a swatch violated its own rule, choosing it then re-saving a custom
    // pick of the same value would silently change the stored color.
    for (const s of BG_SWATCHES) {
      if (!s.value) continue;
      expect(softenBgColor(softenBgColor(s.value))).toBe(s.value);
    }
  });
});
