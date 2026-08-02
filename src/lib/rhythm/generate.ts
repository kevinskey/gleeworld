import { RHYTHM_LEVELS, pulsesPerMeasure, valuePulses } from './pattern';
import type { RhythmPattern, RhythmEvent, RhythmCell, Meter } from './pattern';

// Deterministic PRNG so tests can assert exact output.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A remainder is fillable if some multiset of cell sizes sums to it exactly.
// Guards against e.g. a 1.5-pulse dotted cell stranding a 0.5-pulse gap that
// no cell can tile.
function canFill(remaining: number, sizes: number[], memo = new Map<number, boolean>()): boolean {
  if (Math.abs(remaining) < 1e-6) return true;
  if (remaining < -1e-6) return false;
  const key = Math.round(remaining * 1e6);
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const ok = sizes.some((s) => s <= remaining + 1e-6 && canFill(remaining - s, sizes, memo));
  memo.set(key, ok);
  return ok;
}

export function generatePattern(levelId: number, seed: number, meterIndex = 0): RhythmPattern {
  const lvl = RHYTHM_LEVELS.find((l) => l.id === levelId);
  if (!lvl) throw new Error(`unknown rhythm level ${levelId}`);
  const meter: Meter = lvl.meters[meterIndex % lvl.meters.length];
  const ppm = pulsesPerMeasure(meter);
  const rand = mulberry32(seed * 8 + levelId);
  const sizes = lvl.cells.map((c) => c.pulses);
  const events: RhythmEvent[] = [];
  let cursor = 0;
  for (let m = 0; m < lvl.measures; m++) {
    let remaining = ppm;
    while (remaining > 1e-6) {
      const fits: RhythmCell[] = lvl.cells.filter((c) => c.pulses <= remaining + 1e-6
        && canFill(remaining - c.pulses, sizes)
        && !(events.length === 0 && c.events[0].rest)); // never open the pattern on a rest
      const cell = fits[Math.floor(rand() * fits.length)];
      for (const ce of cell.events) {
        const dur = valuePulses(ce.value, meter);
        events.push({ startPulse: cursor, durPulses: dur, value: ce.value, rest: !!ce.rest });
        cursor += dur;
      }
      remaining -= cell.pulses;
    }
  }
  return { meter, pulsesPerMeasure: ppm, measures: lvl.measures, events, totalPulses: ppm * lvl.measures };
}
