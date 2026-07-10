import { describe, expect, it } from 'vitest';
import { parseChord } from '../chords';

describe('parseChord', () => {
  it('parses a major triad', () => {
    const c = parseChord('C');
    expect(c).not.toBeNull();
    expect(c!.notes.length).toBeGreaterThanOrEqual(3);
  });
  it('parses a slash chord bass', () => {
    const c = parseChord('G/B');
    expect(c!.bass).toBeTruthy();
  });
  it('rejects garbage', () => {
    expect(parseChord('notachord')).toBeNull();
  });
});
