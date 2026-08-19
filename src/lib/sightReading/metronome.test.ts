import { describe, it, expect } from 'vitest';
import { clickSchedule } from './metronome';

describe('clickSchedule', () => {
  it('lays out count-in then exercise clicks on the beat grid', () => {
    const clicks = clickSchedule({ bpm: 120, countInBeats: 4, exerciseBeats: 4, meterBeats: 4 });
    expect(clicks).toHaveLength(8);
    expect(clicks.map((c) => c.timeSec)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(clicks.slice(0, 4).every((c) => c.countIn)).toBe(true);
    expect(clicks.slice(4).every((c) => !c.countIn)).toBe(true);
  });

  it('accents the first count-in beat and each exercise downbeat', () => {
    const clicks = clickSchedule({ bpm: 60, countInBeats: 4, exerciseBeats: 8, meterBeats: 4 });
    const accents = clicks.map((c, i) => (c.accent ? i : -1)).filter((i) => i >= 0);
    // Count-in "1", then exercise beats 1 and 5 (downbeat of each 4/4 measure).
    expect(accents).toEqual([0, 4, 8]);
  });

  it('follows the meter for downbeats in 3/4', () => {
    const clicks = clickSchedule({ bpm: 60, countInBeats: 3, exerciseBeats: 9, meterBeats: 3 });
    const exercise = clicks.filter((c) => !c.countIn);
    const accents = exercise.map((c, i) => (c.accent ? i : -1)).filter((i) => i >= 0);
    expect(accents).toEqual([0, 3, 6]);
  });

  it('covers fractional exercise lengths by clicking through the last partial beat', () => {
    const clicks = clickSchedule({ bpm: 120, countInBeats: 4, exerciseBeats: 7.5, meterBeats: 4 });
    expect(clicks.filter((c) => !c.countIn)).toHaveLength(8);
  });

  it('returns nothing for a non-positive tempo', () => {
    expect(clickSchedule({ bpm: 0, countInBeats: 4, exerciseBeats: 4, meterBeats: 4 })).toEqual([]);
  });
});
