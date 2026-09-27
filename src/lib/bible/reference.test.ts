import { describe, it, expect } from 'vitest';
import { parseReference } from './reference';

const seg = (chapter: number, verseStart: number | null = null, verseEnd: number | null = null) =>
  ({ chapter, verseStart, verseEnd });

describe('parseReference', () => {
  // The bug this exists to fix: typing "Psalm 23" into the search box returned
  // nothing, because full-text search looks for the WORDS "psalm" and "23"
  // inside verse text. A reference is not content.
  it('parses a book and chapter', () => {
    expect(parseReference('Psalm 23')).toEqual({
      usfmCode: 'PSA', chapter: 23, verse: null, verseEnd: null,
      segments: [seg(23)],
    });
  });

  it('parses a book, chapter and verse', () => {
    expect(parseReference('John 3:16')).toEqual({
      usfmCode: 'JHN', chapter: 3, verse: 16, verseEnd: null,
      segments: [seg(3, 16, 16)],
    });
  });

  it('accepts the abbreviations the book resolver knows', () => {
    expect(parseReference('Ps 23')?.usfmCode).toBe('PSA');
    expect(parseReference('Jn 1')?.usfmCode).toBe('JHN');
  });

  it('parses numbered books', () => {
    expect(parseReference('1 Corinthians 13')?.usfmCode).toBe('1CO');
    expect(parseReference('1 Corinthians 13')?.chapter).toBe(13);
    expect(parseReference('2 Timothy 1:7')).toMatchObject({ usfmCode: '2TI', chapter: 1, verse: 7 });
  });

  it('parses multi-word book names', () => {
    expect(parseReference('Song of Solomon 2')?.usfmCode).toBe('SNG');
  });

  it('defaults a bare book name to chapter 1', () => {
    expect(parseReference('Revelation')).toMatchObject({ usfmCode: 'REV', chapter: 1, verse: null });
  });

  it('is case and whitespace insensitive', () => {
    expect(parseReference('  psalm   23  ')).toMatchObject({ usfmCode: 'PSA', chapter: 23, verse: null });
  });

  it('captures a same-chapter verse range', () => {
    expect(parseReference('Psalm 23:1-6')).toEqual({
      usfmCode: 'PSA', chapter: 23, verse: 1, verseEnd: 6,
      segments: [seg(23, 1, 6)],
    });
    expect(parseReference('Ezekiel 34:1-11')).toMatchObject({ usfmCode: 'EZK', chapter: 34, verse: 1, verseEnd: 11 });
  });

  // "8" in "John 7:53-8:11" is a chapter — the range crosses a chapter
  // break, so it becomes two segments: 7:53 to the end of the chapter,
  // then 8:1-11.
  it('splits a cross-chapter range into segments', () => {
    expect(parseReference('John 7:53-8:11')).toEqual({
      usfmCode: 'JHN', chapter: 7, verse: 53, verseEnd: null,
      segments: [seg(7, 53, null), seg(8, 1, 11)],
    });
  });

  it('ignores a backwards range', () => {
    expect(parseReference('Psalm 23:6-1')).toMatchObject({ chapter: 23, verse: 6, verseEnd: null });
  });

  // ── Lectionary citations, verbatim from gw_prayer_readings ──
  // These are what the assistant is handed when asked to read the day's
  // readings; every shape below appeared in one September 2026 week.

  it('parses comma-separated psalm verse groups, keeping the gaps', () => {
    expect(parseReference('Psalm 25:4-5, 6-7, 8-9')?.segments).toEqual([seg(25, 4, 9)]);
    expect(parseReference('Psalm 90:3-4, 5-6, 12-13, 14 and 17')?.segments).toEqual([
      seg(90, 3, 6), seg(90, 12, 14), seg(90, 17, 17),
    ]);
  });

  it('drops half-verse letters', () => {
    expect(parseReference('Luke 9:43b-45')?.segments).toEqual([seg(9, 43, 45)]);
    expect(parseReference('Psalm 144:1b and 2abc, 3-4')?.segments).toEqual([seg(144, 1, 4)]);
  });

  it('parses an em-dash cross-chapter lectionary range', () => {
    expect(parseReference('Ecclesiastes 11:9—12:8')?.segments).toEqual([
      seg(11, 9, null), seg(12, 1, 8),
    ]);
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
