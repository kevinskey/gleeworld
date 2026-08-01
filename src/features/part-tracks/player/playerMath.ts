// Pure math for the practice player. Everything time-related works in
// BUFFER seconds (the rendered audio at 100%); real time = buffer / rate.
import type { PartTrackManifest } from '../types';

export const FEATURED = 1.0;
export const OTHER_VOICES = 0.15;
export const PIANO_UNDER = 0.45;

export function pitchCompSemitones(rate: number): number {
  return -12 * Math.log2(rate) || 0; // || 0 folds -0 to +0 at rate 1
}

export function measureBounds(
  manifest: PartTrackManifest,
  startMeasure: number,
  endMeasure: number,
): { startSec: number; endSec: number } {
  const measures = manifest.measures;
  const start = measures.find((m) => m.number === startMeasure) ?? measures[0];
  const afterEnd = measures.find((m) => m.number === endMeasure + 1);
  return {
    startSec: start.seconds,
    endSec: afterEnd ? afterEnd.seconds : manifest.duration_ms / 1000,
  };
}

export function countInDelays(
  manifest: PartTrackManifest,
  measureNumber: number,
  rate: number,
): number[] {
  const bpm = manifest.tempo_map[0]?.bpm ?? 100;
  let count = 4;
  for (const b of manifest.beats) {
    if (b.measure <= measureNumber) count = b.count;
  }
  const spacing = (60 / bpm) / rate;
  return Array.from({ length: count }, (_, i) => i * spacing);
}

export function featuredGains(
  roles: string[],
  featuredRole: string | null,
): Record<string, number> {
  const gains: Record<string, number> = {};
  for (const role of roles) {
    if (featuredRole === null) {
      gains[role] = 1;
    } else if (role === featuredRole) {
      gains[role] = FEATURED;
    } else if (role === 'piano') {
      gains[role] = PIANO_UNDER;
    } else {
      gains[role] = OTHER_VOICES;
    }
  }
  return gains;
}
