// Incremental clap-onset detection: one frame of RMS energy in, "was that an
// onset?" out. Pure and time-agnostic so it can be unit-tested against
// synthetic rooms; mic.ts just feeds it AnalyserNode frames.
//
// This exists because the previous inline version in mic.ts seeded its noise
// floor at a hardcoded 1e-4 (~-80dBFS). Real rooms sit near 0.01, permanently
// above the resulting threshold, so it fired one onset on the very first frame
// and then never re-armed — and it could never recover, because the floor was
// only updated on frames BELOW threshold. Recorded takes showed exactly that:
// a phantom onset at mic-open, then nothing for the rest of the take.
//
// Two rules keep it out of that deadlock:
//   1. The floor is measured from the room during a warm-up window (median, so
//      a clap during warm-up can't poison it) instead of assumed.
//   2. The floor adapts on EVERY frame, but each step may move it at most
//      toward 2x its current value — loud transients can't inflate it, and
//      sustained noise can still raise it.

export const WARMUP_SEC = 0.25;
const RATIO = 6;
const ABS_MIN = 5e-3;
const FLOOR_ALPHA = 0.995;
const REFRACTORY_SEC = 0.08;
// Hard guarantee against going deaf: if the room rises so much that energy
// never falls back to the re-arm level, the slow floor adaptation alone would
// take seconds to catch up. After this long un-armed we force a re-arm and
// re-seat the floor at the level we're actually hearing.
const STUCK_SEC = 0.6;

export interface OnsetDetector {
  /** Feed one frame. `tSec` is any monotonic clock. Returns true on an onset. */
  push(tSec: number, energy: number): boolean;
  /** Current noise floor estimate — exposed for diagnostics. */
  floor(): number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 1e-4;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function createOnsetDetector(): OnsetDetector {
  let startedAt: number | null = null;
  let warmup: number[] = [];
  let floor: number | null = null;
  let armed = true;
  let lastOnsetAt = -Infinity;

  return {
    floor: () => floor ?? 0,
    push(tSec, energy) {
      if (startedAt === null) startedAt = tSec;
      if (tSec - startedAt < WARMUP_SEC) {
        warmup.push(energy);
        return false;
      }
      if (floor === null) {
        floor = Math.max(median(warmup), 1e-5);
        warmup = [];
      }

      const threshold = Math.max(floor * RATIO, ABS_MIN);
      let onset = false;
      if (armed && energy > threshold && tSec - lastOnsetAt >= REFRACTORY_SEC) {
        onset = true;
        armed = false;
        lastOnsetAt = tSec;
      } else if (!armed) {
        if (energy < Math.max(floor * 2, threshold * 0.4)) {
          armed = true;
        } else if (tSec - lastOnsetAt > STUCK_SEC) {
          armed = true;
          floor = Math.max(floor, energy / RATIO);
        }
      }

      // Always adapt, but never let a transient yank the floor upward.
      floor = FLOOR_ALPHA * floor + (1 - FLOOR_ALPHA) * Math.min(energy, floor * 2);
      return onset;
    },
  };
}
