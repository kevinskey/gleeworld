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
  it('derives the key label from keyFifths', () => {
    const s = { ...emptyScore(), keyFifths: 1, elements: [noteOf(C4, 'quarter')] };
    const ir = editorScoreToIR(s)!;
    expect(ir.key).toBe('G');
    expect(ir.tonicMidi).toBe(67);
  });
  it('merges a tied note pair into one sustained onset', () => {
    const G4 = { step: 'G' as const, octave: 4, alter: 0 };
    const s = {
      ...emptyScore(),
      elements: [
        { ...noteOf(G4, 'half'), tie: 'start' as const },
        { ...noteOf(G4, 'half'), tie: 'stop' as const },
      ],
    };
    const ir = editorScoreToIR(s)!;
    expect(ir.notes.length).toBe(1);
    expect(ir.notes[0].durationBeats).toBe(4);
    expect(ir.notes[0].beatPos).toBe(0);
    expect(ir.notes[0].midi).toBe(67);
  });
  it('falls back to a normal note for a malformed lone tie-stop', () => {
    const s = { ...emptyScore(), elements: [{ ...noteOf(C4, 'quarter'), tie: 'stop' as const }] };
    const ir = editorScoreToIR(s);
    expect(ir).not.toBeNull();
    expect(ir!.notes.length).toBe(1);
  });
});
