// mixerMath.ts — pure math extracted from MixerView (Studio Mixer &
// Mastering B1 Task 6) so the PPM release ballistics and the loudness-
// servo step function are unit-testable without a live AudioContext or
// a running rAF loop. Both functions are called once per "tick" by
// MixerView's own timers — see MixerView.tsx for the impure wiring
// (rAF meter loop, 3s servo interval).

/** PPM release ballistics per the touch-DAW UX research brief
 * (docs/research/2026-07-06-touch-daw-ux-brief.md): attack is
 * instantaneous, release runs 20dB per 1.7s. Call once per animation
 * frame with the meter's CURRENTLY DISPLAYED dB and the elapsed time
 * since the last frame; the caller combines it with the fresh
 * instantaneous reading via `Math.max(newPeakDb, ppmDecay(displayedDb,
 * dt))` so attack stays instant while release follows this curve.
 * -Infinity (or any non-finite value, e.g. NaN before the first real
 * reading) passes through unchanged — there's nothing to decay from
 * silence. */
export function ppmDecay(db: number, dtSeconds: number): number {
  if (!Number.isFinite(db)) return db;
  return db - (20 * dtSeconds) / 1.7;
}

/** One loudness-servo tick (B1 plan Task 6 / spec §5): nudge the master
 * chain's pre-limiter makeup gain toward `targetLufs`. Per-tick movement
 * is clamped to ±0.5dB (so a big gap converges gradually rather than
 * slamming the gain), and the total makeup gain is clamped to ±6dB from
 * unity. Returns `currentPreGainDb` UNCHANGED (a deliberate no-op) when
 * `integratedLufs` is at or below -70 — that floor means "no reliable
 * reading yet" (silence, or too little program material has
 * accumulated since mastering was engaged), not a real loudness value
 * worth chasing.
 *
 * The recording-armed guard lives engine-side (StudioEngine.
 * setMasterPreGainDb / MasterChainHandle.setPreGainDb) — this function
 * is pure and knows nothing about transport/recording state; the caller
 * (MixerView) is free to call it every 3s and let the engine's own
 * guard no-op the AudioParam write while a take is armed. */
export function servoStep(currentPreGainDb: number, integratedLufs: number, targetLufs: number): number {
  if (integratedLufs <= -70) return currentPreGainDb;
  const rawDelta = targetLufs - integratedLufs;
  const delta = clamp(rawDelta, -0.5, 0.5);
  return clamp(currentPreGainDb + delta, -6, 6);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
