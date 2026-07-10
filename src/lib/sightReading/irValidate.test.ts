import { describe, it, expect } from 'vitest';
import { isValidIr } from './irValidate';
import type { ExerciseIR } from './ir';

const good: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [
    { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
    { midi: 62, beatPos: 1, durationBeats: 1, solfege: 're', phraseIdx: 0 },
  ],
  phrases: 1, difficulty: 1,
};

describe('isValidIr', () => {
  it('accepts a well-formed IR', () => expect(isValidIr(good)).toBe(true));
  it('rejects null / non-objects / missing fields', () => {
    expect(isValidIr(null)).toBe(false);
    expect(isValidIr('x')).toBe(false);
    expect(isValidIr({ ...good, notes: undefined })).toBe(false);
    expect(isValidIr({ ...good, meter: { beats: 4 } })).toBe(false);
  });
  it('rejects empty notes and non-positive durations', () => {
    expect(isValidIr({ ...good, notes: [] })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], durationBeats: 0 }] })).toBe(false);
  });
  it('rejects overlapping notes', () => {
    expect(isValidIr({ ...good, notes: [
      { midi: 60, beatPos: 0, durationBeats: 2, solfege: 'do', phraseIdx: 0 },
      { midi: 62, beatPos: 1, durationBeats: 1, solfege: 're', phraseIdx: 0 },
    ] })).toBe(false);
  });
  it('rejects out-of-range midi', () => {
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], midi: 20 }] })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], midi: 100 }] })).toBe(false);
  });
  it('rejects bad phrases / difficulty / solfege / phraseIdx', () => {
    expect(isValidIr({ ...good, phrases: 'abc' })).toBe(false);
    expect(isValidIr({ ...good, difficulty: NaN })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], solfege: 1 }] })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], phraseIdx: 'x' }] })).toBe(false);
  });
  it('rejects implausible meter and tonicMidi', () => {
    expect(isValidIr({ ...good, meter: { beats: -4, beatType: 4 } })).toBe(false);
    expect(isValidIr({ ...good, meter: { beats: 4, beatType: 3 } })).toBe(false);
    expect(isValidIr({ ...good, tonicMidi: -5 })).toBe(false);
  });
});
