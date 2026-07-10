import { describe, it, expect } from 'vitest';
import { scoreAttempt } from './score';
import { generateExercise } from './generate';

const ir = generateExercise({ level: 2, key: 'C', seed: 7 });
const perfect = ir.notes.map(n => ({ midi: n.midi, beatPos: n.beatPos }));

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
});
