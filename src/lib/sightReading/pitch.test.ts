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

import { detectPitch } from './pitch';

function sine(hz: number, sampleRate: number, n: number, harmonics = 1): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin((2 * Math.PI * hz * h * i) / sampleRate) / h;
    buf[i] = v / harmonics;
  }
  return buf;
}

describe('detectPitch', () => {
  const SR = 44100;
  it('finds a 440Hz sine within 5 cents', () => {
    const { hz, clarity } = detectPitch(sine(440, SR, 4096), SR);
    expect(Math.abs(hzToMidi(hz) - 69) * 100).toBeLessThan(5);
    expect(clarity).toBeGreaterThan(0.9);
  });
  it('does not octave-halve a harmonic-rich vowel', () => {
    // A sung vowel has strong harmonics; naive autocorrelation reports 220Hz.
    const { hz } = detectPitch(sine(440, SR, 4096, 6), SR);
    expect(Math.abs(hzToMidi(hz) - 69) * 100).toBeLessThan(15);
  });
  it('tracks across the vocal range', () => {
    for (const target of [98, 220, 330, 523]) {
      const { hz } = detectPitch(sine(target, SR, 4096), SR);
      expect(Math.abs(hz - target) / target).toBeLessThan(0.01);
    }
  });
  it('reports no pitch for silence', () => {
    expect(detectPitch(new Float32Array(4096), SR)).toEqual({ hz: 0, clarity: 0 });
  });
  it('reports no pitch for white noise', () => {
    const noise = new Float32Array(4096).map(() => Math.random() * 2 - 1);
    expect(detectPitch(noise, SR).clarity).toBeLessThan(0.8);
  });
});
