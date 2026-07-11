import { describe, it, expect } from 'vitest';
import { scoreAttempt } from './score';
import { generateExercise } from './generate';
import type { ExerciseIR, IRNote } from './ir';

const ir = generateExercise({ level: 2, key: 'C', seed: 7 });
const perfect = ir.notes.map(n => ({ midi: n.midi, beatPos: n.beatPos }));

// Hand-built IR for cases that need exact control over alignment/timing
// (median tie-breaks, consecutive-run detection, bar arithmetic) rather than
// whatever generateExercise's PRNG happens to produce for a given seed.
// beatsPerBar defaults to 4 (4/4) but is overridable so a drift's onset can
// be placed on a specific bar boundary without changing note count/spacing.
function makeIR(notes: Array<{ midi: number; beatPos: number }>, beatsPerBar = 4): ExerciseIR {
  const irNotes: IRNote[] = notes.map((n) => ({
    midi: n.midi, beatPos: n.beatPos, durationBeats: 1, solfege: 'do', phraseIdx: 0,
  }));
  return {
    key: 'C', mode: 'major', tonicMidi: 60,
    meter: { beats: beatsPerBar, beatType: 4 }, tempo: 80,
    notes: irNotes, phrases: 1, difficulty: 1,
  };
}

describe('scoreAttempt', () => {
  it('scores a perfect take 100 on every dimension', () => {
    const r = scoreAttempt(ir, perfect);
    expect(r.firstNoteOk).toBe(true);
    expect(r.pitch).toBe(100);
    expect(r.rhythm).toBe(100);
    expect(r.retention).toBe(100);
    expect(r.overall).toBe(100);
  });

  it('forgives octave displacement entirely', () => {
    const octaveDown = perfect.map(n => ({ ...n, midi: n.midi - 12 }));
    const r = scoreAttempt(ir, octaveDown);
    expect(r.pitch).toBe(100);
    expect(r.firstNoteOk).toBe(true);
    expect(r.overall).toBe(100);
  });

  it('fails first-note placement for a whole-line semitone offset, but keeps most pitch credit', () => {
    const flat = perfect.map(n => ({ ...n, midi: n.midi - 1 }));
    const r = scoreAttempt(ir, flat);
    expect(r.firstNoteOk).toBe(false);      // the transferable skill, judged
    expect(r.pitch).toBeGreaterThan(70);    // intervals were all correct
    expect(r.overall).toBeLessThan(90);     // but it costs the 15%
  });

  it('does not punish every later note after a single wrong one', () => {
    const oneWrong = perfect.map((n, i) => (i === 2 ? { ...n, midi: n.midi + 3 } : n));
    const r = scoreAttempt(ir, oneWrong);
    const wrongCount = r.perNote.filter(p => !p.ok).length;
    expect(wrongCount).toBe(1);
    expect(r.pitch).toBeGreaterThan(80);
  });

  it('gives ramped partial credit for a slightly-off note instead of a full miss', () => {
    // Four notes; note 2 sung 60 cents flat (a semitone down, +40c back up).
    // Pass/fail scored that 0; the credit ramp earns it 0.5 → pitch 88, not 75.
    const notes = [0, 1, 2, 3].map((beatPos, i) => ({ midi: 60 + i, beatPos }));
    const customIR = makeIR(notes);
    const sung = notes.map((n, i) =>
      i === 2 ? { midi: n.midi - 1, cents: 40, beatPos: n.beatPos } : { midi: n.midi, cents: 0, beatPos: n.beatPos });
    const r = scoreAttempt(customIR, sung);
    // ~87.5 = (1 + 1 + 0.5 + 1) / 4. The point is it clears the old pass/fail 75
    // (that note used to score a flat 0) without reaching a perfect 100.
    expect(r.pitch).toBeGreaterThan(75);
    expect(r.pitch).toBeLessThan(100);
    expect(r.perNote[2].centsOff).toBe(-60);  // real fractional cents, not a semitone multiple
  });

  it('leaves a note the mic never captured out of the pitch denominator', () => {
    // Expected at beats 0,2,4,6; the note at beat 4 is never sung. The three
    // captured notes are perfect, so pitch is 100 despite the gap (the dropped
    // note still shows as not-ok in the per-note breakdown and dents rhythm).
    const notes = [0, 2, 4, 6].map((beatPos, i) => ({ midi: 60 + i, beatPos }));
    const customIR = makeIR(notes);
    const sung = [notes[0], notes[1], notes[3]].map((n) => ({ midi: n.midi, cents: 0, beatPos: n.beatPos }));
    const r = scoreAttempt(customIR, sung);
    expect(r.pitch).toBe(100);
    expect(r.perNote[2].sungMidi).toBeNull();
    expect(r.perNote[2].ok).toBe(false);
    expect(r.rhythm).toBe(75);                // 3 of 4 on time — coverage still counts here
  });

  it('names the bar where the tonal centre drifted', () => {
    const half = Math.floor(perfect.length / 2);
    const drifting = perfect.map((n, i) => (i >= half ? { ...n, midi: n.midi - 1 } : n));
    const r = scoreAttempt(ir, drifting);
    expect(r.retention).toBeLessThan(100);
    expect(r.driftBar).not.toBeNull();
  });

  it('scores an empty take zero without throwing', () => {
    const r = scoreAttempt(ir, []);
    expect(r.overall).toBe(0);
    expect(r.firstNoteOk).toBe(false);
    expect(r.perNote.every(p => p.sungMidi === null)).toBe(true);
  });

  it('does not let a single wrong first note poison pitch credit for the rest', () => {
    const firstNoteFifthHigh = perfect.map((n, i) => (i === 0 ? { ...n, midi: n.midi + 7 } : n));
    const r = scoreAttempt(ir, firstNoteFifthHigh);
    expect(r.firstNoteOk).toBe(false);
    expect(r.pitch).toBeGreaterThan(80);
  });

  it('does not let a dropped first note poison pitch credit for the rest', () => {
    // Beats spaced 2 apart, well past ALIGNMENT_TOLERANCE_BEATS (1), so
    // dropping note 0 cannot get accidentally re-aligned to note 1.
    const notes = [0, 2, 4, 6, 8, 10].map((beatPos, i) => ({ midi: 60 + i, beatPos }));
    const customIR = makeIR(notes);
    const sungMissingFirst = notes.slice(1); // nothing sung at beat 0
    const r = scoreAttempt(customIR, sungMissingFirst);
    expect(r.pitch).toBeGreaterThan(80);
  });

  it('does not report a transient one-note slip that recovers as tonal drift', () => {
    const oneWrong = perfect.map((n, i) => (i === 2 ? { ...n, midi: n.midi + 3 } : n));
    const r = scoreAttempt(ir, oneWrong);
    expect(r.retention).toBe(100);
    expect(r.driftBar).toBeNull();
  });

  it('reports sustained drift with the correct 1-indexed bar number', () => {
    // 9 quarter notes, meter 4/4: notes 0-5 (bar 1 + first half of bar 2) sung
    // on pitch, notes 6-8 (second half of bar 2 into bar 3) sung a semitone
    // flat and staying there — a real sustained drift, not a blip.
    const notes = Array.from({ length: 9 }, (_, i) => ({ midi: 60, beatPos: i }));
    const customIR = makeIR(notes);
    const sung = notes.map((n, i) => (i >= 6 ? { ...n, midi: n.midi - 1 } : n));
    const r = scoreAttempt(customIR, sung);
    expect(r.retention).toBeLessThan(100);
    expect(r.driftBar).toBe(2);
  });

  it('returns overall 0 without throwing when the IR has no notes but the student sang something', () => {
    const emptyIR = makeIR([]);
    const sung = [{ midi: 60, beatPos: 0 }];
    expect(() => scoreAttempt(emptyIR, sung)).not.toThrow();
    const r = scoreAttempt(emptyIR, sung);
    expect(r.overall).toBe(0);
  });

  it('scores retention 0, not 100, when nothing aligns with the exercise', () => {
    const wayOff = perfect.map(n => ({ ...n, beatPos: n.beatPos + 1000 }));
    const r = scoreAttempt(ir, wayOff);
    expect(r.retention).toBe(0);
  });

  it('does not let a drifted second half hijack the baseline when the split is exactly even', () => {
    // 8 notes, 4/4: on pitch for beats 0-3, a semitone flat starting exactly
    // at the midpoint (beat 4). With a median-over-the-whole-line baseline
    // this is a dead tie that the lower-median tie-break resolves to the
    // flat offset, scoring the correctly-sung opening as the drift. Anchored
    // to the opening, the baseline stays 0 and the drift is correctly named
    // partway through, not at the very start.
    const notes = Array.from({ length: 8 }, (_, i) => ({ midi: 60, beatPos: i }));
    const customIR = makeIR(notes);
    const sung = notes.map((n, i) => (i >= 4 ? { ...n, midi: n.midi - 1 } : n));
    const r = scoreAttempt(customIR, sung);
    expect(r.retention).toBeGreaterThan(30);
    expect(r.retention).toBeLessThan(70);
    expect(r.driftBar).toBe(2);
  });

  it('anchors the baseline to the opening even when the drifted notes are an outright majority', () => {
    // On pitch for the first three notes, then a semitone flat for the
    // remaining five (3/4 meter so the drift's onset lands on a later bar).
    // The drifted notes are a clear majority (5 of 8) — the exact regression:
    // a median over the whole line would pick the flat offset as the
    // baseline and score the correctly-sung opening as the deviation.
    const notes = Array.from({ length: 8 }, (_, i) => ({ midi: 60, beatPos: i }));
    const customIR = makeIR(notes, 3);
    const sung = notes.map((n, i) => (i >= 3 ? { ...n, midi: n.midi - 1 } : n));
    const r = scoreAttempt(customIR, sung);
    expect(r.driftBar).toBeGreaterThan(1);
    expect(r.retention).toBeGreaterThan(0);
  });
});
