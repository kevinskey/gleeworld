// scripts/ssat/engine.test.mjs
import { describe, it, expect } from 'vitest';
import {
  mulberry32, hashSeed, makeMelody, makeRhythm, irFromDegrees, assertValidExercise, concatIrs,
} from './engine.mjs';

const beatsOf = (ir) => ir.notes.reduce((s, n) => Math.max(s, n.beatPos + n.durationBeats), 0);

// --- scale-degree-aware rule-2 checker (mirrors the engine's ladder model) ---
// A "step" is adjacency in scale-degree (ladder-index) space, NOT a semitone
// threshold: harmonic minor's le→ti augmented 2nd spans 3 semitones but is a
// step. Rule 2: leaps only from the allowed set, never twice in a row, always
// recovered by a step in the opposite direction.
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
};
function ladderOf(tonicMidi, scaleSemis, range) {
  const ladder = [];
  for (let m = range[0]; m <= range[1]; m++) {
    if (scaleSemis.includes((((m - tonicMidi) % 12) + 12) % 12)) ladder.push(m);
  }
  return ladder;
}
function rule2Violations(ir, { leaps, range, scale }) {
  const scaleSemis = SCALES[scale ?? (ir.mode === 'minor' ? 'natural' : 'major')];
  const ladder = ladderOf(ir.tonicMidi, scaleSemis, range);
  const violations = [];
  let lastWasLeap = false, lastDir = 0;
  for (let i = 1; i < ir.notes.length; i++) {
    const a = ladder.indexOf(ir.notes[i - 1].midi);
    const b = ladder.indexOf(ir.notes[i].midi);
    if (a < 0 || b < 0) continue; // chromatic passing tone — not part of the diatonic walk
    const diff = b - a;
    const isStep = Math.abs(diff) === 1;
    const isRepeat = diff === 0;
    const isLeap = !isStep && !isRepeat;
    const semis = Math.abs(ir.notes[i].midi - ir.notes[i - 1].midi);
    if (isLeap && !leaps.includes(semis)) violations.push(`i=${i}: leap of ${semis} semitones not in allowed set`);
    if (isLeap && lastWasLeap) violations.push(`i=${i}: two leaps in a row`);
    if (lastWasLeap && !isLeap) {
      if (isRepeat) violations.push(`i=${i}: leap recovered by repeat, not a contrary step`);
      else if (Math.sign(diff) === lastDir) violations.push(`i=${i}: recovery step continues in the leap's direction`);
    }
    lastWasLeap = isLeap;
    if (diff !== 0) lastDir = Math.sign(diff);
  }
  return violations;
}

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
  it('every leap is recovered by a step in the opposite direction (rule 2, many seeds)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const m = makeMelody({ ...spec, seed });
      expect(rule2Violations(m, spec)).toEqual([]);
    }
  });
  it('endOnTonic approaches do from re or ti (rule 4, many seeds)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const m = makeMelody({ ...spec, seed });
      const [penult, last] = m.notes.slice(-2);
      expect(last.solfege).toBe('do');
      expect(['re', 'ti']).toContain(penult.solfege);
      expect(Math.abs(last.midi - penult.midi)).toBeLessThanOrEqual(2); // approach by step
    }
  });
});

describe('makeMelody harmonic minor', () => {
  // leaps includes 3, which collides with harmonic minor's le→ti augmented-2nd
  // STEP (3 semitones, adjacent scale degrees). The engine must classify that
  // move as a step everywhere — candidate selection AND lastWasLeap tracking —
  // or it spuriously forces leap-recovery after a plain step.
  const spec = { key: 'A', mode: 'minor', scale: 'harmonic', meter: { beats: 4, beatType: 4 },
    tempo: 90, bars: 6, seed: 0, range: [57, 74], leaps: [3, 4, 8], rhythmPalette: [[1], [2], [1, 1]] };
  it('validates and obeys rule 2 across many seeds, including the le→ti step', () => {
    let sawAug2Step = false;
    for (let seed = 0; seed < 100; seed++) {
      const m = makeMelody({ ...spec, seed });
      expect(() => assertValidExercise(m)).not.toThrow();
      expect(rule2Violations(m, spec)).toEqual([]);
      expect(m.notes[m.notes.length - 1].solfege).toBe('do');
      for (let i = 1; i < m.notes.length; i++) {
        const pair = [m.notes[i - 1].solfege, m.notes[i].solfege];
        if (pair.includes('le') && pair.includes('ti')) sawAug2Step = true;
      }
    }
    expect(sawAug2Step).toBe(true); // the augmented-2nd step is actually exercised
  });
  it('treats le→ti as a step in lastWasLeap tracking (no spurious leap-recovery)', () => {
    // If the walk classified the 3-semitone le→ti STEP as a leap when updating
    // lastWasLeap, every ascending le→ti would be force-recovered by a contrary
    // (downward) step, making an ascending le→ti→do line impossible. That line
    // is idiomatic harmonic-minor motion and must be reachable. endOnTonic:false
    // isolates the raw walk (the cadence rewrite could otherwise mask this by
    // writing its own step runs into the tail).
    let sawContinueUp = false;
    for (let seed = 0; seed < 100; seed++) {
      const m = makeMelody({ ...spec, seed, endOnTonic: false });
      for (let i = 2; i < m.notes.length; i++) {
        const [a, b, c] = [m.notes[i - 2], m.notes[i - 1], m.notes[i]];
        if (a.solfege === 'le' && b.solfege === 'ti' && b.midi > a.midi && c.midi >= b.midi) sawContinueUp = true;
      }
    }
    expect(sawContinueUp).toBe(true);
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
