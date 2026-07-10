import { describe, it, expect } from 'vitest';
import { irToEditorScore } from './fromIR';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ir = (notes: ExerciseIR['notes'], over: Partial<ExerciseIR> = {}): ExerciseIR => ({
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 120,
  notes, phrases: 1, difficulty: 1, ...over,
});

describe('irToEditorScore', () => {
  it('spells notes and derives quarter durations in C major', () => {
    const s = irToEditorScore(ir([
      { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
      { midi: 62, beatPos: 1, durationBeats: 1, solfege: 're', phraseIdx: 0 },
    ]));
    expect(s.keyFifths).toBe(0);
    expect(s.elements).toHaveLength(2);
    expect(s.elements[0]).toMatchObject({ kind: 'note', base: 'quarter', pitch: { step: 'C', octave: 4, alter: 0 } });
    expect(s.elements[1]).toMatchObject({ kind: 'note', base: 'quarter', pitch: { step: 'D', octave: 4, alter: 0 } });
  });

  it('spells black keys as flats in a flat key', () => {
    const s = irToEditorScore(ir(
      [{ midi: 63, beatPos: 0, durationBeats: 2, solfege: 'me', phraseIdx: 0 }],
      { key: 'Eb' },
    ));
    expect(s.keyFifths).toBe(-3);
    expect(s.elements[0]).toMatchObject({ kind: 'note', base: 'half', pitch: { step: 'E', octave: 4, alter: -1 } }); // Eb4
  });

  it('uses the relative-major key signature for a minor exercise', () => {
    // A minor → 0 sharps/flats (relative major C), not A major's 3 sharps.
    const aMinor = irToEditorScore(ir(
      [{ midi: 69, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
      { key: 'A', mode: 'minor', tonicMidi: 69 },
    ));
    expect(aMinor.keyFifths).toBe(0);
    expect(aMinor.mode).toBe('minor');
    // D minor → 1 flat (relative major F).
    const dMinor = irToEditorScore(ir(
      [{ midi: 62, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
      { key: 'D', mode: 'minor', tonicMidi: 62 },
    ));
    expect(dMinor.keyFifths).toBe(-1);
  });

  it('inserts a rest for a gap between notes', () => {
    const s = irToEditorScore(ir([
      { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
      { midi: 60, beatPos: 2, durationBeats: 1, solfege: 'do', phraseIdx: 0 }, // one-beat gap at beat 1
    ]));
    expect(s.elements.map((e) => e.kind)).toEqual(['note', 'rest', 'note']);
    expect(s.elements[1]).toMatchObject({ kind: 'rest', base: 'quarter' });
  });
});
