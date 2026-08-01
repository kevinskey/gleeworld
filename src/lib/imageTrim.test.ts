import { describe, it, expect } from 'vitest';
import { computeOpaqueBounds, hasTransparency } from './imageTrim';

function rgba(width: number, height: number, opaque: Array<[number, number]>, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaque) {
    data[(y * width + x) * 4 + 3] = alpha;
  }
  return data;
}

describe('hasTransparency', () => {
  it('is false for a fully opaque image', () => {
    expect(hasTransparency(new Uint8ClampedArray(4 * 4 * 4).fill(255))).toBe(false);
  });

  it('is true when any pixel is partially transparent', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    data[7] = 254; // second pixel's alpha byte
    expect(hasTransparency(data)).toBe(true);
  });
});

describe('computeOpaqueBounds', () => {
  it('returns the bounding box of opaque pixels', () => {
    const data = rgba(10, 10, [[2, 3], [7, 3], [4, 6]]);
    expect(computeOpaqueBounds(data, 10, 10)).toEqual({ x: 2, y: 3, w: 6, h: 4 });
  });

  it('returns full frame when every pixel is opaque', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    expect(computeOpaqueBounds(data, 4, 4)).toEqual({ x: 0, y: 0, w: 4, h: 4 });
  });

  it('returns null for a fully transparent image', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4);
    expect(computeOpaqueBounds(data, 5, 5)).toBeNull();
  });

  it('handles a single opaque pixel', () => {
    const data = rgba(8, 8, [[5, 2]]);
    expect(computeOpaqueBounds(data, 8, 8)).toEqual({ x: 5, y: 2, w: 1, h: 1 });
  });

  it('ignores pixels at or below the alpha threshold', () => {
    const faint = rgba(6, 6, [[0, 0]], 8); // exactly at default threshold — ignored
    const solid = rgba(6, 6, [[3, 3]]);
    for (let i = 0; i < faint.length; i++) faint[i] = Math.max(faint[i], solid[i]);
    expect(computeOpaqueBounds(faint, 6, 6)).toEqual({ x: 3, y: 3, w: 1, h: 1 });
  });
});
