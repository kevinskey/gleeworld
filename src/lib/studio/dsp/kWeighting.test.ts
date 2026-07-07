import { describe, it, expect } from 'vitest';
import { kWeightingCoefficients, biquadProcess } from './kWeighting';

// Published BS.1770-4 48kHz coefficient table (verbatim test law — ±0.5% per
// coefficient). See docs/research/2026-07-06-web-audio-mastering-brief.md
// §Loudness and .superpowers/sdd/task-2-brief.md.
function expectWithinHalfPercent(actual: number, expected: number) {
  const tolerance = Math.max(Math.abs(expected) * 0.005, 1e-9);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('kWeightingCoefficients(48000)', () => {
  const { shelf, highpass } = kWeightingCoefficients(48000);

  it('matches the published shelf coefficients', () => {
    expectWithinHalfPercent(shelf.b0, 1.53512485958697);
    expectWithinHalfPercent(shelf.b1, -2.69169618940638);
    expectWithinHalfPercent(shelf.b2, 1.19839281085285);
    expectWithinHalfPercent(shelf.a1, -1.69065929318241);
    expectWithinHalfPercent(shelf.a2, 0.73248077421585);
  });

  it('matches the published high-pass coefficients', () => {
    expectWithinHalfPercent(highpass.b0, 1);
    expectWithinHalfPercent(highpass.b1, -2);
    expectWithinHalfPercent(highpass.b2, 1);
    expectWithinHalfPercent(highpass.a1, -1.99004745483398);
    expectWithinHalfPercent(highpass.a2, 0.99007225036621);
  });
});

describe('biquadProcess', () => {
  it('passes DC through a unity (identity) filter unchanged', () => {
    const identity = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
    const samples = new Float32Array([1, 2, 3, 4]);
    const out = biquadProcess(identity, samples);
    expect(Array.from(out)).toEqual([1, 2, 3, 4]);
  });

  it('does not mutate the input array', () => {
    const identity = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
    const samples = new Float32Array([1, 2, 3, 4]);
    biquadProcess(identity, samples);
    expect(Array.from(samples)).toEqual([1, 2, 3, 4]);
  });

  it('carries state across successive calls when a state array is supplied', () => {
    const { highpass } = kWeightingCoefficients(48000);
    const whole = biquadProcess(highpass, new Float32Array([1, 0, 0, 0, 0, 0, 0, 0]));

    const state: [number, number, number, number] = [0, 0, 0, 0];
    const part1 = biquadProcess(highpass, new Float32Array([1, 0, 0, 0]), state);
    const part2 = biquadProcess(highpass, new Float32Array([0, 0, 0, 0]), state);
    const stitched = [...Array.from(part1), ...Array.from(part2)];

    for (let i = 0; i < whole.length; i++) {
      expect(stitched[i]).toBeCloseTo(whole[i], 6);
    }
  });
});
