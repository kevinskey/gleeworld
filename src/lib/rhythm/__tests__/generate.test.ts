import { describe, it, expect } from 'vitest';
import { generatePattern } from '../generate';
import { RHYTHM_LEVELS, pulsesPerMeasure, valuePulses } from '../pattern';

describe('generatePattern', () => {
  it('is deterministic under a seed', () => {
    const a = generatePattern(4, 42);
    const b = generatePattern(4, 42);
    expect(a).toEqual(b);
    const c = generatePattern(4, 43);
    expect(JSON.stringify(c)).not.toEqual(JSON.stringify(a));
  });
  it.each(RHYTHM_LEVELS.map((l) => [l.id] as const))('level %i bar math is exact and cells are legal', (id) => {
    const lvl = RHYTHM_LEVELS.find((l) => l.id === id)!;
    for (let seed = 0; seed < 25; seed++) {
      const p = generatePattern(id, seed);
      const ppm = pulsesPerMeasure(p.meter);
      expect(p.totalPulses).toBeCloseTo(ppm * lvl.measures, 6);
      // Events tile the whole span with no gaps or overlaps.
      let cursor = 0;
      for (const e of p.events) {
        expect(e.startPulse).toBeCloseTo(cursor, 6);
        expect(e.durPulses).toBeCloseTo(valuePulses(e.value, p.meter), 6);
        cursor += e.durPulses;
      }
      expect(cursor).toBeCloseTo(p.totalPulses, 6);
      // No event crosses a barline (cells are drawn to fit measures).
      for (const e of p.events) {
        const barStart = Math.floor(e.startPulse / ppm + 1e-9) * ppm;
        expect(e.startPulse + e.durPulses).toBeLessThanOrEqual(barStart + ppm + 1e-6);
      }
      expect(p.events[0].rest).toBe(false);
    }
  });
});

describe('measures override', () => {
  it('generates the requested bar count instead of the level default', () => {
    const two = generatePattern(2, 7);           // level 2 defaults to 2 bars
    const eight = generatePattern(2, 7, 0, 8);
    expect(two.measures).toBe(2);
    expect(eight.measures).toBe(8);
    expect(eight.totalPulses).toBe(eight.pulsesPerMeasure * 8);
    expect(eight.events.length).toBeGreaterThan(two.events.length);
  });
  it('every measure is filled exactly', () => {
    const p = generatePattern(4, 3, 0, 16);
    const sum = p.events.reduce((s, e) => s + e.durPulses, 0);
    expect(sum).toBeCloseTo(p.pulsesPerMeasure * 16, 6);
  });
  it('clamps nonsense bar counts to at least one measure', () => {
    expect(generatePattern(1, 1, 0, 0).measures).toBe(1);
    expect(generatePattern(1, 1, 0, -5).measures).toBe(1);
  });
});
