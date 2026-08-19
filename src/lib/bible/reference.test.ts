import { describe, it, expect } from 'vitest';
import { parseReference } from './reference';

describe('parseReference', () => {
  // The bug this exists to fix: typing "Psalm 23" into the search box returned
  // nothing, because full-text search looks for the WORDS "psalm" and "23"
  // inside verse text. A reference is not content.
  it('parses a book and chapter', () => {
    expect(parseReference('Psalm 23')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: null, verseEnd: null });
  });

  it('parses a book, chapter and verse', () => {
    expect(parseReference('John 3:16')).toEqual({ usfmCode: 'JHN', chapter: 3, verse: 16, verseEnd: null });
  });

  it('accepts the abbreviations the book resolver knows', () => {
    expect(parseReference('Ps 23')?.usfmCode).toBe('PSA');
    expect(parseReference('Jn 1')?.usfmCode).toBe('JHN');
  });

  it('parses numbered books', () => {
    expect(parseReference('1 Corinthians 13')).toEqual({ usfmCode: '1CO', chapter: 13, verse: null, verseEnd: null });
    expect(parseReference('2 Timothy 1:7')).toEqual({ usfmCode: '2TI', chapter: 1, verse: 7, verseEnd: null });
  });

  it('parses multi-word book names', () => {
    expect(parseReference('Song of Solomon 2')?.usfmCode).toBe('SNG');
  });

  it('defaults a bare book name to chapter 1', () => {
    expect(parseReference('Revelation')).toEqual({ usfmCode: 'REV', chapter: 1, verse: null, verseEnd: null });
  });

  it('is case and whitespace insensitive', () => {
    expect(parseReference('  psalm   23  ')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: null, verseEnd: null });
  });

  it('captures a same-chapter verse range', () => {
    expect(parseReference('Psalm 23:1-6')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: 1, verseEnd: 6 });
    expect(parseReference('Ezekiel 34:1-11')).toEqual({ usfmCode: 'EZK', chapter: 34, verse: 1, verseEnd: 11 });
  });

  // "8" in "John 7:53-8:11" is a chapter — a same-chapter reader cannot
  // span it, so the range collapses to its start rather than mis-reading
  // verses 53 through 8.
  it('collapses a cross-chapter range to its start verse', () => {
    expect(parseReference('John 7:53-8:11')).toEqual({ usfmCode: 'JHN', chapter: 7, verse: 53, verseEnd: null });
  });

  it('ignores a backwards range', () => {
    expect(parseReference('Psalm 23:6-1')).toEqual({ usfmCode: 'PSA', chapter: 23, verse: 6, verseEnd: null });
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
