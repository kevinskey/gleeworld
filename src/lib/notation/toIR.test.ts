import { describe, it, expect } from 'vitest';
import { editorScoreToIR } from './toIR';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const D4 = { step: 'D' as const, octave: 4, alter: 0 };

describe('editorScoreToIR', () => {
  it('projects a single-line score to an IR the scorer understands', () => {
    const s = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(D4, 'quarter')] };
    const ir = editorScoreToIR(s)!;
    expect(ir).not.toBeNull();
    expect(ir.notes.map(n => n.midi)).toEqual([60, 62]);
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 1]);
    expect(ir.notes.map(n => n.durationBeats)).toEqual([1, 1]);
    expect(ir.tonicMidi).toBe(60);      // C major from keyFifths 0
    expect(ir.notes[0].solfege).toBe('do');
  });
  it('skips rests in the IR note list but advances beat position', () => {
    const s = { ...emptyScore(), elements: [noteOf(C4,'quarter'), restOf('quarter'), noteOf(D4,'quarter')] };
    const ir = editorScoreToIR(s)!;
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 2]);
  });
  it('returns null for a score with no notes', () => {
    expect(editorScoreToIR(emptyScore())).toBeNull();
    expect(editorScoreToIR({ ...emptyScore(), elements: [restOf('whole')] })).toBeNull();
  });
});
