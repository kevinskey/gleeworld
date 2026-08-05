import { describe, it, expect } from 'vitest';
import { parseReference } from './reference';

describe('parseReference', () => {
  // The bug this exists to fix: typing "Psalm 23" into the search box returned
  // nothing, because full-text search looks for the WORDS "psalm" and "23"
  // inside verse text. A reference is not content.
  it('parses a book and chapter', () => {
    expect(parseReference('Psalm 23')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: null });
  });

  it('parses a book, chapter and verse', () => {
    expect(parseReference('John 3:16')).toEqual({ usfmCode: 'JHN', chapter: 3, verse: 16 });
  });

  it('accepts the abbreviations the book resolver knows', () => {
    expect(parseReference('Ps 23')?.usfmCode).toBe('PSA');
    expect(parseReference('Jn 1')?.usfmCode).toBe('JHN');
  });

  it('parses numbered books', () => {
    expect(parseReference('1 Corinthians 13')).toEqual({ usfmCode: '1CO', chapter: 13, verse: null });
    expect(parseReference('2 Timothy 1:7')).toEqual({ usfmCode: '2TI', chapter: 1, verse: 7 });
  });

  it('parses multi-word book names', () => {
    expect(parseReference('Song of Solomon 2')?.usfmCode).toBe('SNG');
  });

  it('defaults a bare book name to chapter 1', () => {
    expect(parseReference('Revelation')).toEqual({ usfmCode: 'REV', chapter: 1, verse: null });
  });

  it('is case and whitespace insensitive', () => {
    expect(parseReference('  psalm   23  ')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: null });
  });

  it('accepts a verse range and takes the start', () => {
    expect(parseReference('Psalm 23:1-6')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: 1 });
  });

  // Content searches must NOT be hijacked into references.
  it('returns null for ordinary word searches', () => {
    expect(parseReference('shepherd')).toBeNull();
    expect(parseReference('living water')).toBeNull();
    expect(parseReference('love your enemies')).toBeNull();
    expect(parseReference('')).toBeNull();
  });

  it('returns null when the book name is unknown', () => {
    expect(parseReference('Nonsense 3')).toBeNull();
  });
});
