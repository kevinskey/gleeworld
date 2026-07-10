import { describe, it, expect } from 'vitest';
import { scoreAttempt } from './score';
import { generateExercise } from './generate';
import type { ExerciseIR, IRNote } from './ir';

const ir = generateExercise({ level: 2, key: 'C', seed: 7 });
const perfect = ir.notes.map(n => ({ midi: n.midi, beatPos: n.beatPos }));

// Hand-built IR for cases that need exact control over alignment/timing
// (median tie-breaks, consecutive-run detection, bar arithmetic) rather than
// whatever generateExercise's PRNG happens to produce for a given seed.
function makeIR(notes: Array<{ midi: number; beatPos: number }>): ExerciseIR {
  const irNotes: IRNote[] = notes.map((n) => ({
    midi: n.midi, beatPos: n.beatPos, durationBeats: 1, solfege: 'do', phraseIdx: 0,
  }));
  return {
    key: 'C', mode: 'major', tonicMidi: 60,
    meter: { beats: 4, beatType: 4 }, tempo: 80,
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
});
