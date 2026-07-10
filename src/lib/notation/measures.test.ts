import { describe, it, expect } from 'vitest';
import { layoutMeasures, measureCapacity } from './measures';
import { emptyScore, noteOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };

describe('measure engine', () => {
  it('a 4/4 measure holds 1920 ticks', () => {
    expect(measureCapacity({ beats: 4, beatType: 4 })).toBe(1920);
    expect(measureCapacity({ beats: 3, beatType: 4 })).toBe(1440);
    expect(measureCapacity({ beats: 6, beatType: 8 })).toBe(1440);
  });
  it('four quarters fill exactly one 4/4 measure', () => {
    const s = { ...emptyScore(), elements: Array.from({ length: 4 }, () => noteOf(C4, 'quarter')) };
    const m = layoutMeasures(s);
    expect(m).toHaveLength(1);
    expect(m[0].ticks).toBe(1920);
    expect(m[0].overfull).toBe(false);
  });
  it('five quarters spill into a second measure', () => {
    const s = { ...emptyScore(), elements: Array.from({ length: 5 }, () => noteOf(C4, 'quarter')) };
    const m = layoutMeasures(s);
    expect(m).toHaveLength(2);
    expect(m[0].elements).toHaveLength(4);
    expect(m[1].elements).toHaveLength(1);
    expect(m[1].ticks).toBe(480);
  });
  it('an element that crosses the barline marks its measure overfull, not truncated', () => {
    // three quarters (1440) then a half (960) → 2400 > 1920, half stays whole
    const s = { ...emptyScore(), elements: [noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'half')] };
    const m = layoutMeasures(s);
    expect(m[0].elements).toHaveLength(4);
    expect(m[0].ticks).toBe(2400);
    expect(m[0].overfull).toBe(true);
  });
});
