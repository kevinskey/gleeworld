import { describe, it, expect } from 'vitest';
import { createLimiterState, processLimiterBlock } from './limiterCore';

const SAMPLE_RATE = 48000;

function releaseCoeffFor(releaseMs: number, sampleRate = SAMPLE_RATE): number {
  return Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
}

describe('processLimiterBlock', () => {
  it('(1) step over ceiling: NO output sample ever exceeds the ceiling, including the first emitted samples', () => {
    const L = 64;
    const state = createLimiterState(L);
    const n = 500;
    const inL = new Float32Array(n).fill(1.0);
    const outL = new Float32Array(n);
    const ceiling = 0.5;
    const releaseCoeff = releaseCoeffFor(100);

    processLimiterBlock(state, inL, null, outL, null, ceiling, releaseCoeff);

    for (let i = 0; i < n; i++) {
      expect(outL[i]).toBeLessThanOrEqual(ceiling + 1e-4);
    }
    // The look-ahead must actually be doing work: by the time real
    // (non-zero, delayed) signal starts coming out, the envelope must
    // already have reacted — the first post-warm-up sample should sit
    // right at the ceiling, not above it.
    expect(outL[L]).toBeGreaterThan(0);
    expect(outL[L]).toBeLessThanOrEqual(ceiling + 1e-4);
  });

  it('(2) sub-ceiling passthrough: outputs equal inputs delayed by the lookahead', () => {
    const L = 64;
    const state = createLimiterState(L);
    const n = 300;
    const inL = new Float32Array(n).fill(0.3);
    const outL = new Float32Array(n);
    const ceiling = 0.5;
    const releaseCoeff = releaseCoeffFor(100);

    processLimiterBlock(state, inL, null, outL, null, ceiling, releaseCoeff);

    for (let i = 0; i < L; i++) {
      expect(outL[i]).toBe(0); // delay-line warm-up: nothing emitted yet
    }
    for (let i = L; i < n; i++) {
      expect(outL[i]).toBeCloseTo(inL[i - L], 6);
    }
  });

  it('(3) release: envelope rises monotonically and recovers >=99% after 5 release time constants', () => {
    const L = 64;
    const releaseMs = 50;
    const releaseCoeff = releaseCoeffFor(releaseMs);
    const tauSamples = (releaseMs / 1000) * SAMPLE_RATE;
    const state = createLimiterState(L);
    const ceiling = 0.5;

    const loudSamples = 200;
    // enough quiet tail for the window to fully clear (L) plus >5 time
    // constants of release settling.
    const quietSamples = L + Math.ceil(6 * tauSamples);

    const envHistory: number[] = [];
    const one = new Float32Array(1);
    const outOne = new Float32Array(1);

    for (let i = 0; i < loudSamples; i++) {
      one[0] = 1.0;
      processLimiterBlock(state, one, null, outOne, null, ceiling, releaseCoeff);
      envHistory.push(state.env);
    }
    for (let i = 0; i < quietSamples; i++) {
      one[0] = 0;
      processLimiterBlock(state, one, null, outOne, null, ceiling, releaseCoeff);
      envHistory.push(state.env);
    }

    const minEnv = Math.min(...envHistory);
    const minIdx = envHistory.indexOf(minEnv);

    // From the envelope's minimum onward it must never decrease again.
    for (let i = minIdx + 1; i < envHistory.length; i++) {
      expect(envHistory[i]).toBeGreaterThanOrEqual(envHistory[i - 1] - 1e-9);
    }

    const finalEnv = envHistory[envHistory.length - 1];
    const recovered = (finalEnv - minEnv) / (1 - minEnv);
    expect(recovered).toBeGreaterThanOrEqual(0.99);
  });

  it('(4) stereo link: L loud / R quiet — both channels scaled by the same gain', () => {
    const L = 64;
    const state = createLimiterState(L);
    const n = 400;
    const inL = new Float32Array(n).fill(1.0);
    const inR = new Float32Array(n).fill(0.1);
    const outL = new Float32Array(n);
    const outR = new Float32Array(n);
    const ceiling = 0.5;
    const releaseCoeff = releaseCoeffFor(100);

    processLimiterBlock(state, inL, inR, outL, outR, ceiling, releaseCoeff);

    // Steady state (input has been loud since sample 0, so by the time
    // the delay line is full and the window is saturated, gain should
    // have settled at ceiling/1.0 = 0.5 applied identically to both
    // channels).
    for (let i = n - 20; i < n; i++) {
      const gainFromL = outL[i] / inL[i - L];
      const gainFromR = outR[i] / inR[i - L];
      expect(gainFromL).toBeCloseTo(0.5, 4);
      expect(gainFromR).toBeCloseTo(gainFromL, 6);
    }
  });

  it('streaming: splitting the same signal across two sequential blocks produces identical output to processing it in one block', () => {
    const L = 96;
    const ceiling = 0.5;
    const releaseCoeff = releaseCoeffFor(80);
    const n = 1000;

    // A signal with transients so both attack and release paths, and
    // several lookahead-window's worth of history, get exercised.
    const inL = new Float32Array(n);
    const inR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const loud = (Math.floor(i / 150) % 2) === 0;
      inL[i] = loud ? 1.0 : 0.2;
      inR[i] = loud ? 0.6 : 0.15;
    }

    // Reference: single-block pass.
    const stateOneShot = createLimiterState(L);
    const outLOneShot = new Float32Array(n);
    const outROneShot = new Float32Array(n);
    processLimiterBlock(stateOneShot, inL, inR, outLOneShot, outROneShot, ceiling, releaseCoeff);

    // Split across two blocks at a boundary that does NOT align with
    // the lookahead length, to catch delay-line/deque wraparound bugs.
    const splitAt = 337;
    const stateChunked = createLimiterState(L);
    const outLChunked = new Float32Array(n);
    const outRChunked = new Float32Array(n);

    processLimiterBlock(
      stateChunked,
      inL.subarray(0, splitAt), inR.subarray(0, splitAt),
      outLChunked.subarray(0, splitAt), outRChunked.subarray(0, splitAt),
      ceiling, releaseCoeff,
    );
    processLimiterBlock(
      stateChunked,
      inL.subarray(splitAt), inR.subarray(splitAt),
      outLChunked.subarray(splitAt), outRChunked.subarray(splitAt),
      ceiling, releaseCoeff,
    );

    for (let i = 0; i < n; i++) {
      expect(outLChunked[i]).toBeCloseTo(outLOneShot[i], 9);
      expect(outRChunked[i]).toBeCloseTo(outROneShot[i], 9);
    }
  });
});
