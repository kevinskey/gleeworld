// Rendered-reference DSP fixtures — B1 Task 8. Runs the two signal
// fixtures (fixtures.ts: sineSweep, drumTransient) through the PURE
// (non-Web-Audio) equivalent of the mastering chain's deterministic
// stages and locks the measured integrated LUFS + peak sample down as
// committed reference constants.
//
// This is the B2 NATIVE-PARITY GATE: when the iOS native audio engine
// ships its own mastering chain, its rendered output for these same two
// fixtures must reproduce these reference constants within ±1 LU /
// ±0.02 (see comment on each constant below). This test itself only
// asserts the WEB implementation's pure-math chain reproduces them
// within the tighter ±0.5 LU / ±0.01 tolerance specified in the B1 plan
// — i.e. it's a regression lock on this module, not (yet) the
// cross-platform check, which is B2's job once native code exists.
//
// CHAIN UNDER TEST: rbjBiquad highpass (DEFAULT_MASTERING.hpf_hz, Q
// 0.707) -> rbjBiquad highshelf (8000 Hz air-shelf, DEFAULT_MASTERING.
// air_gain_db) -> limiterCore (ceiling dbToLinear(DEFAULT_MASTERING.
// limiter.ceiling_db) = -1dB, release DEFAULT_MASTERING.limiter.
// release_ms = 200ms @ 44100, lookahead 4ms).
//
// COMPRESSOR INTENTIONALLY OMITTED: the mastering chain's compressor
// stage (masterChain.ts) is a native Web Audio `DynamicsCompressorNode`
// — its knee/attack/release curve is a browser-vendor-specific
// implementation detail with no published, reproducible pure-math
// formula (unlike the HPF/shelf, which are textbook RBJ biquads, or the
// limiter, which is this repo's own look-ahead algorithm). A "pure
// chain" reference that included it would only be reproducible by
// copy-pasting one browser engine's private DSP, defeating the point of
// a cross-platform (web vs iOS-native) parity gate. This reference
// therefore covers exactly the stages that ARE deterministic pure math
// — HPF, air-shelf, and limiter — which is also the same subset B2's
// native chain must reproduce bit-for-bit-equivalent behavior for.
import { describe, it, expect } from 'vitest';
import { rbjBiquad, biquadProcess, kWeightingCoefficients } from '../kWeighting';
import { meanSquare, blockLoudness, integratedLoudness } from '../loudness';
import { createLimiterState, processLimiterBlock } from '../limiterCore';
import { dbToLinear } from '../faderTaper';
import { DEFAULT_MASTERING } from '../../session';
import { sineSweep, drumTransient } from './fixtures';

const RATE = 44100;
const AIR_SHELF_HZ = 8000;
const HPF_Q = 0.707;
const AIR_SHELF_Q = 0.707;
const LOOKAHEAD_MS = 4;
const HOP_SECONDS = 0.1; // matches masterChain.ts's gw-loudness hop size

/** Runs `input` through the PURE-math equivalent of the mastering
 * chain's deterministic stages (HPF -> air-shelf -> limiter; compressor
 * omitted, see file header), then measures integrated (gated) LUFS via
 * K-weighting + BS.1770-style gating, and the post-limiter peak sample. */
function renderReference(input: Float32Array, rate: number): { integratedLufs: number; maxAbsSample: number } {
  const hpf = rbjBiquad('highpass', DEFAULT_MASTERING.hpf_hz, 0, HPF_Q, rate);
  const airShelf = rbjBiquad('highshelf', AIR_SHELF_HZ, DEFAULT_MASTERING.air_gain_db, AIR_SHELF_Q, rate);

  const afterHpf = biquadProcess(hpf, input);
  const afterShelf = biquadProcess(airShelf, afterHpf);

  const lookaheadSamples = Math.round((LOOKAHEAD_MS / 1000) * rate);
  const limiterState = createLimiterState(lookaheadSamples);
  const ceilingLinear = dbToLinear(DEFAULT_MASTERING.limiter.ceiling_db);
  const releaseCoeff = Math.exp(-1 / ((DEFAULT_MASTERING.limiter.release_ms / 1000) * rate));

  const limited = new Float32Array(afterShelf.length);
  processLimiterBlock(limiterState, afterShelf, null, limited, null, ceilingLinear, releaseCoeff);

  let maxAbsSample = 0;
  for (let i = 0; i < limited.length; i++) {
    const a = Math.abs(limited[i]);
    if (a > maxAbsSample) maxAbsSample = a;
  }

  // Integrated LUFS: K-weight the limited (post-chain) signal, then feed
  // 100ms-hop block powers/loudnesses through the gated integration math
  // — mirrors exactly how masterChain.ts assembles Integrated from the
  // gw-loudness worklet's hop stream (100ms hops, Gi=1 mono channel).
  const { shelf: kShelf, highpass: kHp } = kWeightingCoefficients(rate);
  const kFiltered = biquadProcess(kHp, biquadProcess(kShelf, limited));

  const hopSamples = Math.round(HOP_SECONDS * rate);
  const blockLoudnesses: number[] = [];
  const blockPowers: number[] = [];
  for (let i = 0; i + hopSamples <= kFiltered.length; i += hopSamples) {
    const block = kFiltered.subarray(i, i + hopSamples);
    const ms = meanSquare(block);
    blockLoudnesses.push(blockLoudness([ms]));
    blockPowers.push(ms);
  }

  const integratedLufs = integratedLoudness(blockLoudnesses, blockPowers);
  return { integratedLufs, maxAbsSample };
}

// Tolerances per the B1 plan (Task 8): this test (web implementation
// checking itself) asserts ±0.5 LU / ±0.01; the comment on each constant
// below states the LOOSER ±1 LU / ±0.02 tolerance B2's native chain must
// meet against these same constants.
const WEB_LUFS_TOLERANCE = 0.5;
const WEB_PEAK_TOLERANCE = 0.01;

describe('rendered-reference DSP fixtures (B2 native-parity gate)', () => {
  it('sineSweep(2s, 44100) through HPF -> air-shelf -> limiter matches the committed reference', () => {
    const signal = sineSweep(2, RATE);
    const { integratedLufs, maxAbsSample } = renderReference(signal, RATE);

    // B2 native chain must match these within ±1 LU / ±0.02 — parity gate
    const SWEEP_REFERENCE_LUFS = -7.575;
    const SWEEP_REFERENCE_MAX_ABS = 0.5608;

    expect(Math.abs(integratedLufs - SWEEP_REFERENCE_LUFS)).toBeLessThanOrEqual(WEB_LUFS_TOLERANCE);
    expect(Math.abs(maxAbsSample - SWEEP_REFERENCE_MAX_ABS)).toBeLessThanOrEqual(WEB_PEAK_TOLERANCE);
  });

  it('drumTransient(44100) through HPF -> air-shelf -> limiter matches the committed reference', () => {
    const signal = drumTransient(RATE);
    const { integratedLufs, maxAbsSample } = renderReference(signal, RATE);

    // B2 native chain must match these within ±1 LU / ±0.02 — parity gate
    const DRUM_REFERENCE_LUFS = -32.588;
    const DRUM_REFERENCE_MAX_ABS = 0.1635;

    expect(Math.abs(integratedLufs - DRUM_REFERENCE_LUFS)).toBeLessThanOrEqual(WEB_LUFS_TOLERANCE);
    expect(Math.abs(maxAbsSample - DRUM_REFERENCE_MAX_ABS)).toBeLessThanOrEqual(WEB_PEAK_TOLERANCE);
  });
});
