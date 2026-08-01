import { describe, expect, it } from 'vitest';
import { countInDelays, featuredGains, measureBounds, pitchCompSemitones } from '../player/playerMath';
import type { PartTrackManifest } from '../types';

const manifest: PartTrackManifest = {
  duration_ms: 20000,
  tempo_map: [{ measure: 1, bpm: 96 }],
  measures: Array.from({ length: 8 }, (_, i) => ({ number: i + 1, seconds: i * 2.5 })),
  rehearsal_marks: [],
  beats: [{ measure: 1, count: 4 }],
};

describe('playerMath', () => {
  it('pitch compensation: 0 at 100%, +ve when slowed', () => {
    expect(pitchCompSemitones(1)).toBe(0);
    expect(pitchCompSemitones(0.5)).toBeCloseTo(12);
    expect(pitchCompSemitones(0.8)).toBeCloseTo(3.863, 2);
  });
  it('measureBounds maps measures to buffer seconds', () => {
    expect(measureBounds(manifest, 2, 3)).toEqual({ startSec: 2.5, endSec: 7.5 });
    expect(measureBounds(manifest, 8, 8)).toEqual({ startSec: 17.5, endSec: 20 });
  });
  it('countInDelays: 4 clicks spaced by beat, stretched by rate', () => {
    const d = countInDelays(manifest, 1, 1);
    expect(d).toHaveLength(4);
    expect(d[1] - d[0]).toBeCloseTo(60 / 96);
    const slow = countInDelays(manifest, 1, 0.5);
    expect(slow[1] - slow[0]).toBeCloseTo((60 / 96) / 0.5);
  });
  it('featuredGains applies the mix preset', () => {
    const g = featuredGains(['soprano', 'alto', 'piano'], 'soprano');
    expect(g).toEqual({ soprano: 1, alto: 0.15, piano: 0.45 });
    expect(featuredGains(['soprano', 'piano'], null)).toEqual({ soprano: 1, piano: 1 });
  });
});
