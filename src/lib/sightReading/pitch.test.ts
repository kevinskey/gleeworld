import { describe, it, expect } from 'vitest';
import { hzToMidi, midiToHz, centsOff, nearestMidi } from './pitch';

describe('pitch primitives', () => {
  it('maps A4 = 440Hz to MIDI 69', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToHz(69)).toBeCloseTo(440, 6);
  });
  it('round-trips across the vocal range', () => {
    for (const m of [48, 55, 60, 67, 72, 79]) {
      expect(hzToMidi(midiToHz(m))).toBeCloseTo(m, 6);
    }
  });
  it('reports cents deviation with sign', () => {
    // one semitone up = +100 cents
    expect(centsOff(midiToHz(70), 69)).toBeCloseTo(100, 3);
    expect(centsOff(midiToHz(68), 69)).toBeCloseTo(-100, 3);
    expect(centsOff(440, 69)).toBeCloseTo(0, 6);
  });
  it('rounds to the nearest MIDI note', () => {
    expect(nearestMidi(440)).toBe(69);
    expect(nearestMidi(midiToHz(69.4))).toBe(69);
    expect(nearestMidi(midiToHz(69.6))).toBe(70);
  });
  it('returns NaN for non-positive frequencies rather than -Infinity', () => {
    expect(Number.isNaN(hzToMidi(0))).toBe(true);
    expect(Number.isNaN(hzToMidi(-5))).toBe(true);
  });
});
