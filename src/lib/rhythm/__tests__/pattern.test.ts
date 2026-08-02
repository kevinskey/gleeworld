import { describe, it, expect } from 'vitest';
import { RHYTHM_LEVELS, pulsesPerMeasure, isCompound, valuePulses } from '../pattern';

describe('pattern model', () => {
  it('computes pulses per measure', () => {
    expect(pulsesPerMeasure({ beats: 4, beatType: 4 })).toBe(4);
    expect(pulsesPerMeasure({ beats: 3, beatType: 4 })).toBe(3);
    expect(pulsesPerMeasure({ beats: 6, beatType: 8 })).toBe(2);
    expect(pulsesPerMeasure({ beats: 5, beatType: 8 })).toBe(5);
    expect(pulsesPerMeasure({ beats: 7, beatType: 8 })).toBe(7);
  });
  it('flags compound meter', () => {
    expect(isCompound({ beats: 6, beatType: 8 })).toBe(true);
    expect(isCompound({ beats: 4, beatType: 4 })).toBe(false);
    expect(isCompound({ beats: 5, beatType: 8 })).toBe(false);
  });
  it('maps note values to pulses per meter', () => {
    const simple = { beats: 4, beatType: 4 };
    expect(valuePulses('q', simple)).toBe(1);
    expect(valuePulses('e', simple)).toBe(0.5);
    expect(valuePulses('h', simple)).toBe(2);
    expect(valuePulses('q.', simple)).toBe(1.5);
    const compound = { beats: 6, beatType: 8 };
    expect(valuePulses('q.', compound)).toBe(1);
    expect(valuePulses('e', compound)).toBeCloseTo(1 / 3);
    const fiveEight = { beats: 5, beatType: 8 };
    expect(valuePulses('e', fiveEight)).toBe(1);
    expect(valuePulses('q', fiveEight)).toBe(2);
  });
  it('has 8 levels, each with legal cells (event durations sum to cell pulses)', () => {
    expect(RHYTHM_LEVELS).toHaveLength(8);
    for (const lvl of RHYTHM_LEVELS) {
      expect(lvl.meters.length).toBeGreaterThan(0);
      expect(lvl.cells.length).toBeGreaterThan(0);
      for (const meter of lvl.meters) {
        for (const cell of lvl.cells) {
          const sum = cell.events.reduce((s, e) => s + valuePulses(e.value, meter), 0);
          expect(sum).toBeCloseTo(cell.pulses, 6);
        }
      }
    }
  });
  it('level 5 is compound 6/8 (spec: compound is NOT last)', () => {
    expect(RHYTHM_LEVELS[4].meters.some((m) => m.beats === 6 && m.beatType === 8)).toBe(true);
  });
});
