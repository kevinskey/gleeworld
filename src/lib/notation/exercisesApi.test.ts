import { describe, it, expect } from 'vitest';
import { scoreToRow } from './exercisesApi';
import { emptyScore, noteOf } from './model';

describe('scoreToRow', () => {
  it('serializes MusicXML and derives IR params for a single-line score', () => {
    const s = { ...emptyScore(), title: 'My drill', elements: [noteOf({ step:'C', octave:4, alter:0 }, 'quarter')] };
    const row = scoreToRow(s);
    expect(row.title).toBe('My drill');
    expect(row.musicxml).toContain('<score-partwise');
    expect((row.params as any).ir).not.toBeNull();
    expect((row.params as any).key).toBe(0);          // keyFifths
    expect((row.params as any).timeSig).toEqual({ beats: 4, beatType: 4 });
  });
  it('sets ir to null for a score with no notes', () => {
    const row = scoreToRow(emptyScore());
    expect((row.params as any).ir).toBeNull();
  });
});
