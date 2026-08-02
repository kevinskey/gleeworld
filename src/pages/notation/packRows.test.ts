import { describe, it, expect } from 'vitest';
import { packRows } from './packRows';

describe('packRows', () => {
  it('returns no rows for an empty score', () => {
    expect(packRows({ widths: [], availableW: 400, maxPerRow: 4 })).toEqual([]);
  });

  it('packs measures into one row when they fit under the cap', () => {
    expect(packRows({ widths: [50, 50, 50, 50], availableW: 400, maxPerRow: 4 }))
      .toEqual([{ start: 0, end: 4 }]);
  });

  it('caps rows at maxPerRow even with width to spare', () => {
    expect(packRows({ widths: Array(8).fill(50), availableW: 4000, maxPerRow: 4 }))
      .toEqual([{ start: 0, end: 4 }, { start: 4, end: 8 }]);
  });

  it('breaks a row early when accumulated width overflows', () => {
    // 100+20 pad each = 120; 4th measure pushes 480 past 420.
    expect(packRows({ widths: [100, 100, 100, 100], availableW: 420, maxPerRow: 4 }))
      .toEqual([{ start: 0, end: 3 }, { start: 3, end: 4 }]);
  });

  it('pad 0 lets the same measures fill the row (the iPad 4-across case)', () => {
    expect(packRows({ widths: [100, 100, 100, 100], availableW: 420, maxPerRow: 4, pad: 0 }))
      .toEqual([{ start: 0, end: 4 }]);
  });

  it('still falls back to fewer per row when raw widths cannot fit', () => {
    expect(packRows({ widths: [200, 200, 200, 200], availableW: 420, maxPerRow: 4, pad: 0 }))
      .toEqual([{ start: 0, end: 2 }, { start: 2, end: 4 }]);
  });

  it('honors user-forced system breaks over the width heuristic', () => {
    expect(packRows({ widths: [50, 50, 50, 50], availableW: 4000, maxPerRow: 4, forcedBreaks: new Set([1]) }))
      .toEqual([{ start: 0, end: 2 }, { start: 2, end: 4 }]);
  });

  it('lets an oversized single measure overflow its own row', () => {
    expect(packRows({ widths: [900, 50], availableW: 400, maxPerRow: 4 }))
      .toEqual([{ start: 0, end: 1 }, { start: 1, end: 2 }]);
  });

  it('substitutes the 40px floor for zero/missing widths', () => {
    // 6 measures at the 40 floor + 20 pad = 360 ≤ 400, but cap is 4.
    expect(packRows({ widths: [0, 0, 0, 0, 0, 0], availableW: 400, maxPerRow: 4 }))
      .toEqual([{ start: 0, end: 4 }, { start: 4, end: 6 }]);
  });
});
