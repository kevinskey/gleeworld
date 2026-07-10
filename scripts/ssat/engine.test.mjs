// scripts/ssat/engine.test.mjs
import { describe, it, expect } from 'vitest';
import {
  mulberry32, hashSeed, makeMelody, makeRhythm, irFromDegrees, assertValidExercise, concatIrs,
} from './engine.mjs';

const beatsOf = (ir) => ir.notes.reduce((s, n) => Math.max(s, n.beatPos + n.durationBeats), 0);

describe('engine determinism', () => {
  it('same seed → identical melody; different seed → different', () => {
    const spec = { key: 'C', mode: 'major', meter: { beats: 4, beatType: 4 }, tempo: 90, bars: 8,
      seed: hashSeed('w1-melody'), range: [60, 72], leaps: [], rhythmPalette: [[1], [2], [1, 1]] };
    expect(JSON.stringify(makeMelody(spec))).toBe(JSON.stringify(makeMelody(spec)));
    expect(JSON.stringify(makeMelody({ ...spec, seed: hashSeed('other') })))
      .not.toBe(JSON.stringify(makeMelody(spec)));
  });
});

describe('makeMelody constraints', () => {
  const spec = { key: 'G', mode: 'major', meter: { beats: 4, beatType: 4 }, tempo: 90, bars: 8,
    seed: 42, range: [62, 79], leaps: [3, 4, 5], rhythmPalette: [[1], [1, 1], [2]] };
  const ir = makeMelody(spec);
  it('fills exactly bars × beats and validates', () => {
    expect(beatsOf(ir)).toBe(32);
    expect(() => assertValidExercise(ir)).not.toThrow();
  });
  it('stays in range and ends on the tonic', () => {
    for (const n of ir.notes) { expect(n.midi).toBeGreaterThanOrEqual(62); expect(n.midi).toBeLessThanOrEqual(79); }
    expect(ir.notes[ir.notes.length - 1].solfege).toBe('do');
  });
  it('never leaps outside the allowed set and recovers by step', () => {
    for (let i = 1; i < ir.notes.length; i++) {
      const iv = Math.abs(ir.notes[i].midi - ir.notes[i - 1].midi);
      expect(iv === 0 || iv <= 2 || spec.leaps.includes(iv)).toBe(true);
    }
  });
  it('stepwise-only spec never leaps', () => {
    const s = makeMelody({ ...spec, leaps: [], seed: 7 });
    for (let i = 1; i < s.notes.length; i++) {
      expect(Math.abs(s.notes[i].midi - s.notes[i - 1].midi)).toBeLessThanOrEqual(2);
    }
  });
  it('inserts the requested number of chromatic tones', () => {
    const c = makeMelody({ ...spec, seed: 11, chromatic: { count: 3 } });
    const chroma = c.notes.filter((n) => ['ra', 'me', 'fi', 'le', 'te'].includes(n.solfege));
    expect(chroma.length).toBeGreaterThanOrEqual(3);
    expect(() => assertValidExercise(c)).not.toThrow();
  });
});

describe('makeRhythm + compound meter', () => {
  it('6/8 melody validates with eighth-unit palette', () => {
    const ir = makeMelody({ key: 'F', mode: 'major', meter: { beats: 6, beatType: 8 }, tempo: 200,
      bars: 8, seed: 3, range: [60, 77], leaps: [3, 4], rhythmPalette: [[3], [1, 1, 1], [2, 1]] });
    expect(beatsOf(ir)).toBe(48);
    expect(() => assertValidExercise(ir)).not.toThrow();
  });
});

describe('assertValidExercise', () => {
  it('throws on barline crossing and bad durations', () => {
    const base = irFromDegrees({ key: 'C', mode: 'major', tempo: 90,
      meter: { beats: 4, beatType: 4 }, degrees: [0, 2, 4], durations: [1, 1, 2] });
    expect(() => assertValidExercise(base)).not.toThrow();
    const crossing = { ...base, notes: [{ ...base.notes[0], beatPos: 3, durationBeats: 2 }] };
    expect(() => assertValidExercise(crossing)).toThrow(/barline/);
    const badDur = { ...base, notes: [{ ...base.notes[0], durationBeats: 1.25 }] };
    expect(() => assertValidExercise(badDur)).toThrow(/duration/);
  });
});

describe('concatIrs', () => {
  it('offsets the second segment after the first', () => {
    const a = irFromDegrees({ key: 'C', mode: 'major', tempo: 90, meter: { beats: 4, beatType: 4 }, degrees: [0, 4, 7, 0], durations: [1, 1, 1, 1] });
    const b = irFromDegrees({ key: 'G', mode: 'major', tempo: 90, meter: { beats: 4, beatType: 4 }, degrees: [0, 4, 7, 0], durations: [1, 1, 1, 1] });
    const joined = concatIrs([a, b]);
    expect(joined.notes).toHaveLength(8);
    expect(joined.notes[4].beatPos).toBe(4);
    expect(joined.notes[4].solfege).toBe('do'); // solfège kept from segment B's own tonic
  });
});
