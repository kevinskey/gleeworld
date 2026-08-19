import { describe, it, expect } from 'vitest';
import { parseCitation } from './citation';

describe('parseCitation', () => {
  it('parses a simple within-chapter range', () => {
    const c = parseCitation('Isaiah 2:1-5');
    expect(c.usfmCode).toBe('ISA');
    expect(c.ranges).toEqual([
      { startChapter: 2, startVerse: 1, endChapter: 2, endVerse: 5 },
    ]);
  });

  it('parses comma segments as separate ranges in the same chapter', () => {
    const c = parseCitation('Psalm 122:1-2, 3-4, 6-7');
    expect(c.ranges).toEqual([
      { startChapter: 122, startVerse: 1, endChapter: 122, endVerse: 2 },
      { startChapter: 122, startVerse: 3, endChapter: 122, endVerse: 4 },
      { startChapter: 122, startVerse: 6, endChapter: 122, endVerse: 7 },
    ]);
  });

  // An em-dash means the range crosses a chapter boundary. A hyphen never does.
  it('distinguishes an em-dash cross-chapter range from a hyphen range', () => {
    const c = parseCitation('Acts 7:51—8:1a');
    expect(c.ranges).toEqual([
      { startChapter: 7, startVerse: 51, endChapter: 8, endVerse: 1 },
    ]);
  });

  it('parses semicolon jumps to a new chapter', () => {
    const c = parseCitation('Ezekiel 9:1-7; 10:18-22');
    expect(c.ranges).toEqual([
      { startChapter: 9, startVerse: 1, endChapter: 9, endVerse: 7 },
      { startChapter: 10, startVerse: 18, endChapter: 10, endVerse: 22 },
    ]);
  });

  // WEBCE has no half-verse granularity, so 9a resolves to all of verse 9.
  it('drops letter suffixes and keeps the whole verse', () => {
    expect(parseCitation('Isaiah 58:1-9a').ranges).toEqual([
      { startChapter: 58, startVerse: 1, endChapter: 58, endVerse: 9 },
    ]);
    expect(parseCitation('Psalm 23: 1-3a, 3b-4').ranges).toEqual([
      { startChapter: 23, startVerse: 1, endChapter: 23, endVerse: 3 },
      { startChapter: 23, startVerse: 3, endChapter: 23, endVerse: 4 },
    ]);
  });

  it('accepts a space after the colon', () => {
    expect(parseCitation('Psalm 33: 4-5').ranges[0].startVerse).toBe(4);
  });

  it('treats " and " as a segment separator', () => {
    const c = parseCitation('Psalm 1:1-2, 3, 4 and 6');
    expect(c.ranges.map((r) => [r.startVerse, r.endVerse])).toEqual([
      [1, 2], [3, 3], [4, 4], [6, 6],
    ]);
  });

  // Jude/Philemon/2-3 John cite verses with no chapter at all.
  it('reads bare numbers as verses for single-chapter books', () => {
    const c = parseCitation('Philemon 7-20');
    expect(c.usfmCode).toBe('PHM');
    expect(c.ranges).toEqual([
      { startChapter: 1, startVerse: 7, endChapter: 1, endVerse: 20 },
    ]);
  });

  // Esther's Greek additions are lettered, not numbered.
  it('preserves a letter chapter label instead of failing', () => {
    const c = parseCitation('Esther C:12, 14-16');
    expect(c.usfmCode).toBe('EST');
    expect(c.ranges[0].chapterLabel).toBe('C');
    expect(c.ranges[0].startChapter).toBeNull();
  });

  // Upstream typo, verbatim from the corpus: "3b4" should be "3b-4".
  it('degrades one malformed segment without losing the rest', () => {
    const c = parseCitation('Psalm 23: 1-3a, 3b4, 5, 6');
    expect(c.unparsed).toEqual(['3b4']);
    expect(c.ranges.map((r) => [r.startVerse, r.endVerse])).toEqual([
      [1, 3], [5, 5], [6, 6],
    ]);
  });

  it('takes the first alternative of a pipe-separated citation', () => {
    const c = parseCitation('Genesis 1:1-2:2|Genesis 1:1,26-31a');
    expect(c.ranges[0]).toEqual({
      startChapter: 1, startVerse: 1, endChapter: 2, endVerse: 2,
    });
  });

  it('returns a null book and no ranges for unresolvable input', () => {
    const c = parseCitation('From the Common of the Blessed Virgin Mary');
    expect(c.usfmCode).toBeNull();
    expect(c.ranges).toEqual([]);
  });
});
