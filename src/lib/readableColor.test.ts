// Auto-adjusted tenant colors: too-light brand colors must darken to a
// readable level for app chrome (icons/text/buttons on white cards),
// while already-dark brands pass through byte-identical.
import { describe, it, expect } from 'vitest';
import { readableOnLightHex, contrastVsWhite } from './readableColor';

describe('readableOnLightHex', () => {
  it('leaves already-readable dark colors unchanged', () => {
    expect(readableOnLightHex('#0f172a')).toBe('#0f172a'); // navy
    expect(readableOnLightHex('#9333ea')).toBe('#9333ea'); // default accent
  });

  it('darkens a pale gold until it clears 4.5:1 on white', () => {
    const out = readableOnLightHex('#e8c97a')!;
    expect(out).not.toBe('#e8c97a');
    expect(contrastVsWhite(out)!).toBeGreaterThanOrEqual(4.5);
  });

  it('handles the degenerate white case', () => {
    const out = readableOnLightHex('#ffffff')!;
    expect(contrastVsWhite(out)!).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves hue family when darkening', () => {
    // A light warm gold should stay warm (red+green dominant over blue).
    const out = readableOnLightHex('#e8c97a')!;
    const r = parseInt(out.slice(1, 3), 16);
    const g = parseInt(out.slice(3, 5), 16);
    const b = parseInt(out.slice(5, 7), 16);
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it('returns null for junk input', () => {
    expect(readableOnLightHex('nope')).toBeNull();
    expect(readableOnLightHex('')).toBeNull();
  });

  it('honors a custom ratio', () => {
    const out = readableOnLightHex('#e8c97a', 3)!;
    expect(contrastVsWhite(out)!).toBeGreaterThanOrEqual(3);
  });
});
