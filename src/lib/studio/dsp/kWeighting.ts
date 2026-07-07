// EBU R128 / BS.1770 K-weighting filter — coefficient derivation + biquad
// processing. Pure math only (no Web Audio / DOM); this is the reference
// implementation consumed by the loudness meter (B1 Task 2) and later
// inlined (with a KEEP IN SYNC comment) into the gw-loudness AudioWorklet
// (B1 Task 4).
//
// K-weighting is two cascaded biquads:
//   1. A high-shelf ("head effect" of the human head/ear) boosting highs.
//   2. A high-pass (RLB weighting curve) attenuating low frequencies.
//
// Both stages are ported from libebur128 (MIT) using the fixed f0/G/Q
// constants published in BS.1770-4 Annex — see docs/research/2026-07-06-
// web-audio-mastering-brief.md §Loudness and .superpowers/sdd/task-2-
// brief.md. libebur128's derivation pre-warps the corner frequency via
// K=tan(pi*f0/rate) rather than the textbook RBJ cookbook alpha=sin(w0)/
// 2Q bilinear transform; at 48kHz it reproduces the BS.1770-4 published
// coefficient table (verbatim test law) to full numerical precision. The
// standard RBJ cookbook forms are also exported below (as `rbjBiquad`)
// for the mastering chain's own HPF/air-shelf, which are NOT part of
// K-weighting and have no published reference table to match.
//
// KEEP IN SYNC WITH public/worklets/gw-loudness.js — that file inlines
// standalone-JS copies of ebur128HighShelf/ebur128Highpass (AudioWorklets
// can't import TS/bundle app modules) to K-filter the post-limiter tap in
// real time. This module (validated against the published BS.1770-4
// 48kHz table) is the reference implementation; mirror any change to the
// derivation here into gw-loudness.js, and vice versa.

/** Direct-form biquad coefficients, normalized so a0 = 1 (a0 is implicit). */
export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const SHELF_F0 = 1681.974450955533;
const SHELF_GAIN_DB = 3.999843853973347;
const SHELF_Q = 0.7071752369554196;

const HP_F0 = 38.13547087602444;
const HP_Q = 0.5003270373238773;

/** libebur128's pre-warped high-shelf design (MIT-licensed port), the
 * exact derivation that reproduces the BS.1770-4 published coefficient
 * table at 48kHz. This is NOT the textbook RBJ cookbook alpha=sin(w0)/2Q
 * form — libebur128 pre-warps the shelf corner via `K = tan(pi*f0/rate)`
 * and splits the gain into a "high" term `Vh = 10^(G/20)` and a "bottom"
 * term `Vb = Vh^0.4996667741545416` (empirically-fit exponent from the
 * reference implementation, ~= 1/2 — the shelf's mid-frequency gain
 * asymptote). Normalized so a0 = 1. */
function ebur128HighShelf(f0: number, gainDb: number, q: number, rate: number): Biquad {
  const K = Math.tan((Math.PI * f0) / rate);
  const Vh = Math.pow(10, gainDb / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);

  const a0 = 1 + K / q + K * K;

  return {
    b0: (Vh + (Vb * K) / q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / q + K * K) / a0,
  };
}

/** libebur128's pre-warped high-pass design (MIT-licensed port) — the RLB
 * weighting curve's high-pass stage, matched to the BS.1770-4 published
 * table at 48kHz via the same `K = tan(pi*f0/rate)` pre-warp as the
 * shelf stage above (b = [1,-2,1] is fixed; only the denominator
 * pre-warps with frequency). Normalized so a0 = 1. */
function ebur128Highpass(f0: number, q: number, rate: number): Biquad {
  const K = Math.tan((Math.PI * f0) / rate);
  const a0 = 1 + K / q + K * K;

  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / q + K * K) / a0,
  };
}

/** Standard RBJ Audio EQ Cookbook high-shelf, bilinear-transformed for
 * `rate` Hz, using the "Q" alpha convention (alpha=sin(w0)/2Q) rather
 * than libebur128's pre-warped form above. Used for the mastering
 * chain's air-shelf (B1 Task 8 rendered-reference fixtures), NOT for
 * K-weighting — K-weighting must use ebur128HighShelf/ebur128Highpass to
 * match the published table. A = 10^(gainDb/40) per the cookbook's shelf
 * convention (not /20 — shelf gain is expressed as a "half" exponent so
 * that A^2 is the linear power gain). Normalized so a0 = 1. */
function rbjHighShelf(f0: number, gainDb: number, q: number, rate: number): Biquad {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / rate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);
  const sqrtA = Math.sqrt(A);

  const b0 = A * (A + 1 + (A - 1) * cosW0 + 2 * sqrtA * alpha);
  const b1 = -2 * A * (A - 1 + (A + 1) * cosW0);
  const b2 = A * (A + 1 + (A - 1) * cosW0 - 2 * sqrtA * alpha);
  const a0 = A + 1 - (A - 1) * cosW0 + 2 * sqrtA * alpha;
  const a1 = 2 * (A - 1 - (A + 1) * cosW0);
  const a2 = A + 1 - (A - 1) * cosW0 - 2 * sqrtA * alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/** Standard RBJ Audio EQ Cookbook high-pass, bilinear-transformed for
 * `rate` Hz. Used for the mastering chain's HPF stage (not K-weighting —
 * see rbjHighShelf comment above). Normalized so a0 = 1. */
function rbjHighpass(f0: number, q: number, rate: number): Biquad {
  const w0 = (2 * Math.PI * f0) / rate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  const b0 = (1 + cosW0) / 2;
  const b1 = -(1 + cosW0);
  const b2 = (1 + cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/** Generic RBJ cookbook biquad derivation for an arbitrary type/f0/gain/Q,
 * used by the B1 Task 8 rendered-reference fixtures for the HPF/air-shelf
 * stages of the mastering chain (not part of K-weighting itself). Only
 * the shapes needed by the mastering chain are implemented. */
export function rbjBiquad(
  type: 'highpass' | 'highshelf',
  f0: number,
  gainDb: number,
  q: number,
  rate: number,
): Biquad {
  return type === 'highshelf' ? rbjHighShelf(f0, gainDb, q, rate) : rbjHighpass(f0, q, rate);
}

/** K-weighting coefficients for a given sample rate: cascade of a
 * high-shelf stage (head effect) followed by a high-pass stage (RLB
 * curve). At 48000 Hz these match the BS.1770-4 published table. */
export function kWeightingCoefficients(sampleRate: number): { shelf: Biquad; highpass: Biquad } {
  return {
    shelf: ebur128HighShelf(SHELF_F0, SHELF_GAIN_DB, SHELF_Q, sampleRate),
    highpass: ebur128Highpass(HP_F0, HP_Q, sampleRate),
  };
}

/** Direct-form-1 biquad processing. Returns a new Float32Array (input is
 * never mutated). `state` is an optional mutable [x1,x2,y1,y2] tuple —
 * pass the same array across successive calls to stream a continuous
 * signal in chunks (e.g. per-hop K-filtering in the loudness worklet). */
export function biquadProcess(
  coeffs: Biquad,
  samples: Float32Array,
  state?: [number, number, number, number],
): Float32Array {
  const { b0, b1, b2, a1, a2 } = coeffs;
  const s = state ?? [0, 0, 0, 0];
  let [x1, x2, y1, y2] = s;

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  if (state) {
    state[0] = x1;
    state[1] = x2;
    state[2] = y1;
    state[3] = y2;
  }

  return out;
}
