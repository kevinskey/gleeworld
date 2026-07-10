import { describe, expect, it } from 'vitest';
import { countSyllables } from '../syllables';

describe('countSyllables', () => {
  it('counts a simple line', () => {
    expect(countSyllables('hello world')).toBe(3);
  });
  it('returns 0 for empty input', () => {
    expect(countSyllables('')).toBe(0);
  });
  it('handles silent e', () => {
    expect(countSyllables('love came home')).toBe(3);
  });
  it('ignores punctuation', () => {
    expect(countSyllables("don't stop believin'")).toBe(
      countSyllables('dont stop believin')
    );
  });
});
