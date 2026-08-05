import { resolveBook } from './books';

export interface VerseRange {
  startChapter: number | null;
  startVerse: number;
  endChapter: number | null;
  endVerse: number;
  chapterLabel?: string;
}

export interface ParsedCitation {
  usfmCode: string | null;
  ranges: VerseRange[];
  unparsed: string[];
}

// Both a plain hyphen and an em/en dash appear in the corpus. What makes a
// range cross a chapter boundary is an explicit "chapter:verse" on both
// sides, not which dash character was used — "1:1-2:2" crosses chapters with
// a plain hyphen, and "7:51—8:1" does it with an em-dash.
const DASH = '[-–—]';
const CROSS_CHAPTER_RE = new RegExp(`^(\\d+):(\\d+)\\s*${DASH}\\s*(\\d+):(\\d+)$`);
const NUMERIC_CHAPTER_RE = new RegExp(`^(\\d+):\\s*(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);
const LETTER_CHAPTER_RE = new RegExp(`^([A-Za-z]):\\s*(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);
const BARE_VERSE_RE = new RegExp(`^(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);

// WEBCE has no half-verse granularity, so "9a"/"3b" resolve to the whole
// verse. Requires a word boundary after the letter so "3b4" (malformed —
// should have been "3b-4") is left alone and falls through to `unparsed`
// instead of being silently mangled.
const LETTER_SUFFIX_RE = /(\d+)[a-dA-D]\b/g;

function stripLetterSuffix(segment: string): string {
  return segment.replace(LETTER_SUFFIX_RE, '$1');
}

type ChapterState = { kind: 'number'; value: number } | { kind: 'label'; value: string } | null;

function parseSegment(rawSegment: string, chapter: ChapterState): VerseRange | null {
  const segment = stripLetterSuffix(rawSegment).trim();
  if (!segment) return null;

  const cross = CROSS_CHAPTER_RE.exec(segment);
  if (cross) {
    return {
      startChapter: Number(cross[1]),
      startVerse: Number(cross[2]),
      endChapter: Number(cross[3]),
      endVerse: Number(cross[4]),
    };
  }

  const numeric = NUMERIC_CHAPTER_RE.exec(segment);
  if (numeric) {
    const ch = Number(numeric[1]);
    const start = Number(numeric[2]);
    const end = numeric[3] !== undefined ? Number(numeric[3]) : start;
    return { startChapter: ch, startVerse: start, endChapter: ch, endVerse: end };
  }

  // Esther's Greek additions are lettered chapters (A-F), not numbered.
  const lettered = LETTER_CHAPTER_RE.exec(segment);
  if (lettered) {
    const label = lettered[1].toUpperCase();
    const start = Number(lettered[2]);
    const end = lettered[3] !== undefined ? Number(lettered[3]) : start;
    return { startChapter: null, startVerse: start, endChapter: null, endVerse: end, chapterLabel: label };
  }

  const bare = BARE_VERSE_RE.exec(segment);
  if (bare && chapter) {
    const start = Number(bare[1]);
    const end = bare[2] !== undefined ? Number(bare[2]) : start;
    return chapter.kind === 'number'
      ? { startChapter: chapter.value, startVerse: start, endChapter: chapter.value, endVerse: end }
      : { startChapter: null, startVerse: start, endChapter: null, endVerse: end, chapterLabel: chapter.value };
  }

  return null;
}

/**
 * Parses a lectionary citation string into resolvable verse ranges.
 *
 * A malformed segment (an upstream typo, e.g. "3b4" for "3b-4") degrades to
 * `unparsed` rather than discarding the whole citation — most citations have
 * several comma segments, and one bad one should not cost the rest.
 */
export function parseCitation(input: string): ParsedCitation {
  // Some LitCal citations carry a "|"-separated alternative reading; the
  // first alternative is the one actually proclaimed.
  const primary = input.split('|')[0].trim();

  const match = /^(.+?)\s+((?:[A-Za-z]:|\d).*)$/.exec(primary);
  if (!match) {
    return { usfmCode: null, ranges: [], unparsed: primary ? [primary] : [] };
  }

  const [, bookName, rest] = match;
  const book = resolveBook(bookName);
  if (!book) {
    return { usfmCode: null, ranges: [], unparsed: [primary] };
  }

  const ranges: VerseRange[] = [];
  const unparsed: string[] = [];
  let chapter: ChapterState = book.singleChapter ? { kind: 'number', value: 1 } : null;

  for (const rawGroup of rest.split(';')) {
    // A ";" jump requires the next segment to name its own chapter, except
    // for single-chapter books where the chapter is always 1.
    if (!book.singleChapter) chapter = null;

    for (const rawSegment of rawGroup.split(/,|\band\b/)) {
      const trimmed = rawSegment.trim();
      if (!trimmed) continue;

      const range = parseSegment(trimmed, chapter);
      if (!range) {
        unparsed.push(trimmed);
        continue;
      }
      ranges.push(range);
      if (range.chapterLabel) {
        chapter = { kind: 'label', value: range.chapterLabel };
      } else if (range.startChapter !== null) {
        chapter = { kind: 'number', value: range.startChapter };
      }
    }
  }

  return { usfmCode: book.usfmCode, ranges, unparsed };
}
