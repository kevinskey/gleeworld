import { describe, it, expect } from 'vitest';
import { kWeightingCoefficients, biquadProcess } from './kWeighting';
import { meanSquare, blockLoudness } from './loudness';

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

describe('kWeightingCoefficients(44100) — pole stability', () => {
  // B1 follow-up: the published-table test above only ever exercises
  // 48kHz. A biquad's poles are the roots of its denominator
  // (1 + a1 z^-1 + a2 z^-2); for a real-coefficient 2nd-order section
  // they're guaranteed to land strictly inside the unit circle (i.e. a
  // stable, non-blowing-up filter) iff |a2| < 1 AND |a1| < 1 + a2 — the
  // standard discrete-time stability triangle. 44.1kHz is the other
  // sample rate real sessions actually run at (see engine.ts's
  // `sampleRate` state field), so it's worth pinning independently of
  // the 48kHz table match.
  const { shelf, highpass } = kWeightingCoefficients(44100);

  function expectStablePoles(label: string, c: { a1: number; a2: number }) {
    expect(Math.abs(c.a2), `${label}: |a2| < 1`).toBeLessThan(1);
    expect(c.a1, `${label}: a1 < 1 + a2`).toBeLessThan(1 + c.a2);
    expect(c.a1, `${label}: a1 > -(1 + a2)`).toBeGreaterThan(-(1 + c.a2));
  }

  it('shelf stage poles are inside the unit circle at 44100', () => {
    expectStablePoles('shelf', shelf);
  });

  it('highpass stage poles are inside the unit circle at 44100', () => {
    expectStablePoles('highpass', highpass);
  });
});

describe('K-chain sanity LUFS at 44100', () => {
  // B1 follow-up: a coarse end-to-end sanity check — build a full-scale
  // (peak amplitude 1) 997Hz sine (997 rather than 1000 to avoid tidy
  // aliasing with the block/hop grid, the usual reason test tones use
  // 997Hz), run it through BOTH K-weighting stages (shelf then
  // highpass, matching the buildMasterChain / gw-loudness cascade
  // order), then feed the settled mean-square into blockLoudness.
  //
  // NOTE on the expected value: -0.691 is blockLoudness's own additive
  // calibration constant (LK = -0.691 + 10*log10(z)) — it's what you get
  // back for a channel-sum of EXACTLY z=1 (see loudness.test.ts's
  // `blockLoudness` suite), not what a real K-weighted full-scale sine
  // measures. The K-filter is not unity gain at 997Hz (the shelf stage's
  // low Q=0.707 spreads its boost well below its 1682Hz corner — about
  // +0.69dB at 997Hz here), so a full-scale sine's mean-square comes out
  // above the unweighted 0.5, landing loudness at the well-known
  // real-world reference value for a full-scale ~1kHz sine: approximately
  // -3.01 LUFS (mono/single-channel) — see e.g. ffmpeg's loudnorm docs
  // ("a full-scale 1kHz sine wave test signal integrates to -3.01
  // LUFS"). That is the value this test pins.
  it('a full-scale 997Hz sine measures approximately -3.01 LUFS (mono)', () => {
    const sampleRate = 44100;
    const freq = 997;
    const durationSeconds = 0.5;
    const n = Math.round(sampleRate * durationSeconds);
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);

    const { shelf, highpass } = kWeightingCoefficients(sampleRate);
    const afterShelf = biquadProcess(shelf, samples);
    const filtered = biquadProcess(highpass, afterShelf);

    // Discard the first 100ms so the biquads' own settling transient
    // (time constant well under 10ms at these corner frequencies)
    // doesn't skew the measured mean-square.
    const settled = filtered.slice(Math.round(sampleRate * 0.1));
    const z = meanSquare(settled);
    const lufs = blockLoudness([z]);

    expect(Math.abs(lufs - -3.01)).toBeLessThanOrEqual(0.1);
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
