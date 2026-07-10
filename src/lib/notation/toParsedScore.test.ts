import { describe, it, expect } from 'vitest';
import { editorScoreToParsed } from './toParsedScore';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const D4 = { step: 'D' as const, octave: 4, alter: 0 };

describe('editorScoreToParsed', () => {
  it('projects notes with second-based timing and correct frequencies at tempo 120', () => {
    const s = { ...emptyScore(), tempo: 120, elements: [noteOf(C4, 'quarter'), noteOf(D4, 'quarter')] };
    const p = editorScoreToParsed(s);
    const notes = p.measures.flatMap((m) => m.notes);
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.startTime)).toEqual([0, 0.5]);   // one beat = 0.5s at 120bpm
    expect(notes.map((n) => n.duration)).toEqual([0.5, 0.5]);
    expect(notes[0].frequency).toBeCloseTo(261.63, 1);         // C4
    expect(notes[1].frequency).toBeCloseTo(293.66, 1);         // D4
    expect(p.tempo).toBe(120);
    expect(p.timeSignature).toEqual({ beats: 4, beatType: 4 });
  });

  it('merges a tied pair into ONE sustained note (the reason for the faithful path)', () => {
    const s = {
      ...emptyScore(), tempo: 120,
      elements: [{ ...noteOf(C4, 'half'), tie: 'start' as const }, { ...noteOf(C4, 'half'), tie: 'stop' as const }],
    };
    const notes = editorScoreToParsed(s).measures.flatMap((m) => m.notes);
    expect(notes).toHaveLength(1);                 // not two re-attacks
    expect(notes[0].startTime).toBe(0);
    expect(notes[0].duration).toBe(2);            // two half notes = 4 beats = 2s at 120bpm
  });

  it('a rest delays the following note without emitting a tone', () => {
    const s = { ...emptyScore(), tempo: 120, elements: [restOf('quarter'), noteOf(C4, 'quarter')] };
    const notes = editorScoreToParsed(s).measures.flatMap((m) => m.notes);
    expect(notes).toHaveLength(1);
    expect(notes[0].startTime).toBe(0.5);         // pushed back one beat by the rest
  });

  it('an empty score yields click-only playback (no notes, still a measure)', () => {
    const p = editorScoreToParsed(emptyScore());
    expect(p.measures.flatMap((m) => m.notes)).toHaveLength(0);
    expect(p.measures.length).toBeGreaterThanOrEqual(1);
    expect(p.totalDuration).toBe(0);
  });
});
