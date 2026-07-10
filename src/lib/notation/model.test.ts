import { describe, it, expect } from 'vitest';
import { emptyScore, noteOf, restOf, elementTicks } from './model';

describe('EditorScore model', () => {
  it('an empty score is 4/4 C major treble with no elements', () => {
    const s = emptyScore();
    expect(s.timeSig).toEqual({ beats: 4, beatType: 4 });
    expect(s.keyFifths).toBe(0);
    expect(s.mode).toBe('major');
    expect(s.clef).toBe('treble');
    expect(s.elements).toEqual([]);
  });
  it('noteOf carries pitch, duration, and defaults tie to none', () => {
    const n = noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter');
    expect(n).toEqual({ kind: 'note', pitch: { step: 'C', octave: 4, alter: 0 }, base: 'quarter', dots: 0, tie: 'none' });
  });
  it('restOf carries duration', () => {
    expect(restOf('half', 1)).toEqual({ kind: 'rest', base: 'half', dots: 1 });
  });
  it('elementTicks uses the dotted value for notes and rests alike', () => {
    expect(elementTicks(noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter', 1))).toBe(720);
    expect(elementTicks(restOf('quarter'))).toBe(480);
  });
});
