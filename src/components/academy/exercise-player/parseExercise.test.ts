import { describe, it, expect } from 'vitest';
import { parseExercise } from './parseExercise';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [{ midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
  phrases: 1, difficulty: 1,
};

describe('parseExercise', () => {
  it('parses a melody with ir', () => {
    const p = parseExercise('melody', { ir, instructions: 'Sing it.' });
    expect(p).toMatchObject({ kind: 'notated', mode: 'pitch', deepLink: true });
  });
  it('parses rhythm as click mode without deep link', () => {
    const p = parseExercise('rhythm', { ir });
    expect(p).toMatchObject({ kind: 'notated', mode: 'click', deepLink: false });
  });
  it('parses segments without top-level ir and gates the deep link off', () => {
    const p = parseExercise('melody', { segments: [ir, ir] });
    expect(p?.kind).toBe('notated');
    if (p?.kind === 'notated') {
      expect(p.segments).toHaveLength(2);
      expect(p.deepLink).toBe(false);
    }
  });
  it('parses ear_training items', () => {
    const p = parseExercise('ear_training', { prompt: 'Which interval?', items: [{ ir, choices: ['M2', 'M3'], answer: 1 }] });
    expect(p?.kind).toBe('ear_training');
  });
  it('parses assignment', () => {
    const p = parseExercise('assignment', { instructions: ['Do x'], deliverables: ['Video'], rubric: [{ criterion: 'Pitch Accuracy', percent: 30 }] });
    expect(p?.kind).toBe('assignment');
  });
  it('parses ensemble parts and dictation', () => {
    expect(parseExercise('ensemble', { parts: [{ label: 'Voice 1', ir }] })?.kind).toBe('ensemble');
    expect(parseExercise('dictation', { prompt: 'Notate it', ir, playLimit: 3 })?.kind).toBe('dictation');
  });
  it('returns null for unknown types and malformed data', () => {
    expect(parseExercise('mystery', { ir })).toBeNull();
    expect(parseExercise('melody', {})).toBeNull();
    expect(parseExercise('melody', { ir: { key: 'C' } })).toBeNull();
    expect(parseExercise('ear_training', { prompt: 'x', items: [{ ir, choices: ['a'], answer: 5 }] })).toBeNull();
    expect(parseExercise('ear_training', { prompt: 'x', items: [{ ir, choices: ['a', 'b'], answer: 0.5 }] })).toBeNull();
  });
});
