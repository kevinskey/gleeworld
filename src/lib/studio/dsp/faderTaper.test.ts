import { describe, it, expect } from 'vitest';
import {
  dbToLinear, linearToDb, faderPosToDb, dbToFaderPos, FADER_BREAKPOINTS,
} from './faderTaper';

describe('FADER_BREAKPOINTS', () => {
  it('matches the research convention exactly', () => {
    expect(FADER_BREAKPOINTS).toEqual([
      [0, -72], [0.05, -60], [0.25, -30], [0.5, -10], [0.75, 0], [1, 6],
    ]);
  });
});

describe('faderPosToDb', () => {
  it('is unity at 3/4 travel', () => {
    expect(faderPosToDb(0.75)).toBeCloseTo(0, 5);
  });
  it('reaches +6dB at full travel', () => {
    expect(faderPosToDb(1)).toBeCloseTo(6, 5);
  });
  it('is -10dB at half travel', () => {
    expect(faderPosToDb(0.5)).toBeCloseTo(-10, 5);
  });
  it('is -Infinity at zero (off)', () => {
    expect(faderPosToDb(0)).toBe(-Infinity);
  });
  it('interpolates through interior breakpoints', () => {
    expect(faderPosToDb(0.05)).toBeCloseTo(-60, 5);
    expect(faderPosToDb(0.25)).toBeCloseTo(-30, 5);
  });
});

describe('dbToFaderPos / faderPosToDb round-trip', () => {
  it.each([0.1, 0.3, 0.6, 0.9])('round-trips pos=%s', (p) => {
    const db = faderPosToDb(p);
    expect(dbToFaderPos(db)).toBeCloseTo(p, 5);
  });
});

describe('dbToFaderPos edge cases', () => {
  // B1 follow-up: dbToFaderPos(-72) used to land on position 0, which
  // faderPosToDb round-trips to -Infinity (its own hard special case for
  // "fader fully off") — a finite -72dB silently became -Infinity. Pos 0
  // is now reserved exclusively for an actual -Infinity input; -72 (and
  // anything at/below the table's floor) floors to the next breakpoint.
  it('dbToFaderPos(-72) lands on 0.05, not 0 — 0 is reserved for -Infinity', () => {
    expect(dbToFaderPos(-72)).toBe(0.05);
  });
  it('dbToFaderPos(-Infinity) is still exactly 0', () => {
    expect(dbToFaderPos(-Infinity)).toBe(0);
  });
});

describe('dbToLinear', () => {
  it('maps -Infinity to 0', () => {
    expect(dbToLinear(-Infinity)).toBe(0);
  });
  it('maps 0dB to unity gain', () => {
    expect(dbToLinear(0)).toBe(1);
  });
});

describe('linearToDb', () => {
  it('maps 0.5 linear to about -6.0206 dB', () => {
    expect(linearToDb(0.5)).toBeCloseTo(-6.0206, 3);
  });
});
