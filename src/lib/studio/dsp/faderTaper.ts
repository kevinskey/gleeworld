// Fader taper — dB <-> linear-gain <-> fader-position (0..1) conversions.
//
// Pure math only (no Web Audio / DOM). Consumed by the Mixer's vertical
// Fader control (B1 Task 6) and by any code that needs to translate a
// dB value to/from a normalized slider position using the same curve.
//
// Taper follows the research convention documented in the B1 plan:
// unity gain (0 dB) sits at 3/4 travel, the top quarter runs 0 -> +6 dB
// for a little headroom above unity, and -10 dB sits at the halfway
// point — matching the feel of a typical analog console fader.

/** Piecewise-linear breakpoints: [fader position 0..1, dB]. Verbatim
 * from the B1 spec/research brief — do not tweak without updating the
 * spec. */
export const FADER_BREAKPOINTS: Array<[pos: number, db: number]> = [
  [0, -72],
  [0.05, -60],
  [0.25, -30],
  [0.5, -10],
  [0.75, 0],
  [1, 6],
];

/** 10^(db/20). `-Infinity` maps to exactly 0. */
export function dbToLinear(db: number): number {
  if (db === -Infinity) return 0;
  return Math.pow(10, db / 20);
}

/** 20*log10(max(lin, 1e-6)) — floored so 0 (or negative) linear gain
 * doesn't produce -Infinity/NaN from log10(0). */
export function linearToDb(lin: number): number {
  return 20 * Math.log10(Math.max(lin, 1e-6));
}

/** Fader position (0..1) -> dB, piecewise-linear through
 * FADER_BREAKPOINTS. Position 0 is a hard special case: -Infinity
 * (fader fully off), even though the lowest breakpoint is -72 dB at
 * pos 0.05 — the segment from 0 to 0.05 interpolates down to -72 and
 * then drops to -Infinity exactly at pos 0. */
export function faderPosToDb(pos: number): number {
  const p = clamp(pos, 0, 1);
  if (p === 0) return -Infinity;

  for (let i = 0; i < FADER_BREAKPOINTS.length - 1; i++) {
    const [p0, db0] = FADER_BREAKPOINTS[i];
    const [p1, db1] = FADER_BREAKPOINTS[i + 1];
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0);
      return db0 + t * (db1 - db0);
    }
  }
  // p === 1 (or beyond, post-clamp) falls through to the last breakpoint.
  return FADER_BREAKPOINTS[FADER_BREAKPOINTS.length - 1][1];
}

/** Inverse of faderPosToDb — dB -> fader position (0..1), clamped to
 * the breakpoint table's range. -Infinity clamps to position 0 (and
 * ONLY -Infinity does — see the guard below); any other value at/below
 * the lowest breakpoint (-72dB) floors to position 0.05 instead. */
export function dbToFaderPos(db: number): number {
  if (db === -Infinity) return 0;

  const minDb = FADER_BREAKPOINTS[0][1];
  const maxDb = FADER_BREAKPOINTS[FADER_BREAKPOINTS.length - 1][1];
  const d = clamp(db, minDb, maxDb);

  // Position 0 round-trips to -Infinity in faderPosToDb (its own hard
  // special case). Without this guard, a finite -72dB would ALSO land
  // on position 0 via the interpolation below (the -72/pos-0 breakpoint
  // is the loop's first anchor), so dbToFaderPos(-72) would silently
  // round-trip through faderPosToDb back to -Infinity instead of -72 —
  // an asymmetry a mid-drag disarm or a stored preset could surface as
  // a fader jump. Reserve pos 0 exclusively for -Infinity: any finite
  // dB at the table's floor floors to the next breakpoint (0.05).
  if (d === minDb) return FADER_BREAKPOINTS[1][0];

  for (let i = 0; i < FADER_BREAKPOINTS.length - 1; i++) {
    const [p0, db0] = FADER_BREAKPOINTS[i];
    const [p1, db1] = FADER_BREAKPOINTS[i + 1];
    if (d <= db1) {
      const t = (d - db0) / (db1 - db0);
      return p0 + t * (p1 - p0);
    }
  }
  return FADER_BREAKPOINTS[FADER_BREAKPOINTS.length - 1][0];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
