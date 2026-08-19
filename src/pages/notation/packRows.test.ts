import { describe, it, expect } from 'vitest';
import { packRows, fitScaleForRow } from './packRows';

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

describe('fitScaleForRow', () => {
  // The knob's whole purpose: `scale` is the size asked for, and this is the
  // largest size at which the requested bars per line survive.
  const base = { perRow: 2, cssWidth: 400, maxScale: 0.6, overheadUnits: 80, breathingUnits: 0 };

  it('leaves the requested size alone when the row already fits', () => {
    // 2 × 50 + 80 overhead = 180 units; 400px at 0.6 buys 666. No reduction.
    expect(fitScaleForRow({ ...base, widths: [50, 50] })).toBe(0.6);
  });

  it('shrinks to exactly the size the widest run needs', () => {
    // 2 × 200 + 80 overhead = 480 units, which 400 CSS px covers at 0.833 px
    // per unit — more than the 0.6 asked for, so the size is untouched.
    expect(fitScaleForRow({ ...base, widths: [200, 200] })).toBe(0.6);
    // 2 × 300 + 80 = 680 units needs 0.588 px per unit, under the ceiling.
    expect(fitScaleForRow({ ...base, widths: [300, 300] })).toBeCloseTo(400 / 680, 10);
  });

  it('measures the WIDEST run, not the first one', () => {
    // A comfortable opening bar pair followed by a crowded one: sizing to the
    // first would put the second over the edge and drop it to its own system.
    const widths = [50, 50, 400, 400];
    expect(fitScaleForRow({ ...base, widths })).toBeCloseTo(400 / (800 + 80), 10);
  });

  it('adds the breathing room it is given, per measure', () => {
    const tight = fitScaleForRow({ ...base, widths: [300, 300], breathingUnits: 0 });
    const roomy = fitScaleForRow({ ...base, widths: [300, 300], breathingUnits: 10 });
    expect(roomy).toBeLessThan(tight);
    expect(roomy).toBeCloseTo(400 / (600 + 20 + 80), 10);
  });

  it('sizes to the whole score when it has fewer measures than the request', () => {
    // Asking for four bars per line from a two-bar psalm must not fit a
    // phantom four — that would halve the staff for no reason.
    expect(fitScaleForRow({ ...base, perRow: 4, widths: [300, 300] }))
      .toBeCloseTo(400 / 680, 10);
  });

  it('never magnifies past the size asked for', () => {
    expect(fitScaleForRow({ ...base, widths: [1, 1], maxScale: 0.6 })).toBe(0.6);
  });

  it('stops shrinking at the floor it is given', () => {
    // Absurd widths: the arithmetic says 0.02, which is print nobody reads.
    const unbounded = fitScaleForRow({ ...base, widths: [20000, 20000] });
    expect(unbounded).toBeLessThan(0.05);
    const floored = fitScaleForRow({ ...base, widths: [20000, 20000], minScale: 0.37 });
    expect(floored).toBe(0.37);
  });

  it('will not let a floor above the ceiling magnify anything', () => {
    expect(fitScaleForRow({ ...base, widths: [20000, 20000], minScale: 5 })).toBe(0.6);
  });

  it('is a no-op without a target, a width or any measures', () => {
    expect(fitScaleForRow({ ...base, perRow: 0, widths: [300, 300] })).toBe(0.6);
    expect(fitScaleForRow({ ...base, cssWidth: 0, widths: [300, 300] })).toBe(0.6);
    expect(fitScaleForRow({ ...base, widths: [] })).toBe(0.6);
  });

  it('lands a scale the packer then accepts — the two agree by construction', () => {
    const widths = [300, 300, 300];
    const perRow = 3;
    const cssWidth = 400;
    // The default breathing room, not base's 0: sizing a row to its exact
    // minimum leaves the packer's own `>` comparison deciding on the last
    // bit of a float, which is the reason that default exists.
    const scale = fitScaleForRow({
      widths, perRow, cssWidth, maxScale: 10, overheadUnits: base.overheadUnits,
    });
    const availableW = cssWidth / scale - base.overheadUnits;
    // pad 0 is what a caller with a target passes; one row, not three.
    expect(packRows({ widths, availableW, maxPerRow: perRow, pad: 0 }))
      .toEqual([{ start: 0, end: 3 }]);
  });
});
