import { describe, it, expect } from 'vitest';
import { irToToneEvents } from './irPlayback';
import type { ExerciseIR } from './ir';

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 120,
  notes: [
    { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
    { midi: 64, beatPos: 2, durationBeats: 2, solfege: 'mi', phraseIdx: 0 },
  ],
  phrases: 1, difficulty: 1,
};

describe('irToToneEvents', () => {
  it('schedules pitch events at beat positions (120bpm → 0.5s/beat)', () => {
    const ev = irToToneEvents(ir, 'pitch');
    expect(ev).toHaveLength(2);
    expect(ev[0].at).toBeCloseTo(0);
    expect(ev[0].dur).toBeCloseTo(1 * 0.5 * 0.92); // sounding time = 92% of nominal (articulation gap)
    expect(ev[0].hz).toBeCloseTo(261.63, 1); // C4
    expect(ev[1].at).toBeCloseTo(1.0);       // beat 2
    expect(ev[1].dur).toBeCloseTo(2 * 0.5 * 0.92);
  });
  it('compound meter: beat unit is the beatType (6/8 → eighth = tempo unit)', () => {
    const c: ExerciseIR = { ...ir, meter: { beats: 6, beatType: 8 }, tempo: 240,
      notes: [{ midi: 60, beatPos: 3, durationBeats: 3, solfege: 'do', phraseIdx: 0 }] };
    const ev = irToToneEvents(c, 'pitch');
    expect(ev[0].at).toBeCloseTo(0.75);  // 3 eighths at 240 eighth-bpm = 0.75s
    expect(ev[0].dur).toBeCloseTo(3 * 0.25 * 0.92); // sounding time = 92% of nominal (articulation gap)
  });
  it('click mode uses one fixed pitch for every note', () => {
    const ev = irToToneEvents(ir, 'click');
    expect(ev[0].hz).toBe(ev[1].hz);
  });
});
