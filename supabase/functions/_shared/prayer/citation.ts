/**
 * Parses a lectionary citation string ("Isaiah 2:1-5", "Acts 7:51—8:1a", …)
 * into book + verse ranges that can be selected from gw_bible_verses.
 *
 * Profiled against the real 1,165-citation corpus imported in Phase 0 — see
 * docs/superpowers/plans/2026-08-04-prayer-phase1.md for the trap catalogue
 * (em-dash cross-chapter ranges, single-chapter books, Esther's lettered
 * chapters, upstream typos, half-verse letter suffixes).
 *
 * DELIBERATE DUPLICATE of src/lib/prayer/citation.ts. `scripts/deploy-functions.sh`
 * only ships `supabase/functions/`, so a Deno edge function cannot import
 * across that boundary into `src/`; this is the Deno-safe copy. The two are
 * kept byte-identical and enforced by
 * `supabase/functions/_shared/prayer/__tests__/parity.test.ts` — edit
 * `src/lib/prayer/citation.ts` first, then copy the change here.
 */

import { resolveBook } from './books.ts';

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

// Hyphen, en dash, em dash — all three appear in the corpus as range separators.
const DASH = '[-–—]';

// WEBCE has no half-verse granularity: "9a"/"3b" resolve to the whole verse.
// Only lowercase a-d are letter suffixes; an uppercase letter (Esther's "C:12")
// is a chapter label, not a suffix, and is left untouched by this regex.
function stripLetterSuffix(segment: string): string {
  return segment.replace(/(\d+)[a-d]\b/g, '$1');
}

/**
 * Splits "Isaiah 2:1-5" into { bookName: "Isaiah", rest: "2:1-5" }.
 * Numbered books ("1 Corinthians") keep their leading digit as part of the
 * name; the split point is the first word after that which contains a digit.
 */
function splitBookAndRest(input: string): { bookName: string; rest: string } {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);
  let start = 0;
  if (/^[123]$/.test(words[0])) start = 1;

  let splitIdx = -1;
  for (let i = start; i < words.length; i += 1) {
    if (/\d/.test(words[i])) {
      splitIdx = i;
      break;
    }
  }

  if (splitIdx === -1) return { bookName: trimmed, rest: '' };
  return {
    bookName: words.slice(0, splitIdx).join(' '),
    rest: words.slice(splitIdx).join(' '),
  };
}

interface ChapterState {
  chapter: number | null;
  chapterLabel: string | undefined;
}

const CROSS_CHAPTER_RE = new RegExp(`^(\\d+):\\s*(\\d+)\\s*${DASH}\\s*(\\d+):\\s*(\\d+)$`);
const NUMERIC_CHAPTER_RE = new RegExp(`^(\\d+):\\s*(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);
const LETTER_CHAPTER_RE = new RegExp(`^([A-Z]):\\s*(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);
const BARE_VERSE_RE = new RegExp(`^(\\d+)(?:\\s*${DASH}\\s*(\\d+))?$`);

function parseSegment(
  raw: string,
  state: ChapterState,
): { range: VerseRange | null; original: string } {
  const original = raw.trim();
  if (!original) return { range: null, original };
  const seg = stripLetterSuffix(original);

  let m = CROSS_CHAPTER_RE.exec(seg);
  if (m) {
    state.chapter = Number(m[3]);
    state.chapterLabel = undefined;
    return {
      range: {
        startChapter: Number(m[1]),
        startVerse: Number(m[2]),
        endChapter: Number(m[3]),
        endVerse: Number(m[4]),
      },
      original,
    };
  }

  m = NUMERIC_CHAPTER_RE.exec(seg);
  if (m) {
    const chapter = Number(m[1]);
    state.chapter = chapter;
    state.chapterLabel = undefined;
    const startVerse = Number(m[2]);
    return {
      range: {
        startChapter: chapter,
        startVerse,
        endChapter: chapter,
        endVerse: m[3] !== undefined ? Number(m[3]) : startVerse,
      },
      original,
    };
  }

  m = LETTER_CHAPTER_RE.exec(seg);
  if (m) {
    const chapterLabel = m[1];
    state.chapter = null;
    state.chapterLabel = chapterLabel;
    const startVerse = Number(m[2]);
    return {
      range: {
        startChapter: null,
        endChapter: null,
        chapterLabel,
        startVerse,
        endVerse: m[3] !== undefined ? Number(m[3]) : startVerse,
      },
      original,
    };
  }

  m = BARE_VERSE_RE.exec(seg);
  if (m && (state.chapter !== null || state.chapterLabel !== undefined)) {
    const startVerse = Number(m[1]);
    return {
      range: {
        startChapter: state.chapter,
        endChapter: state.chapter,
        chapterLabel: state.chapterLabel,
        startVerse,
        endVerse: m[2] !== undefined ? Number(m[2]) : startVerse,
      },
      original,
    };
  }

  return { range: null, original };
}

export function parseCitation(input: string): ParsedCitation {
  const firstAlternative = input.split('|')[0];
  const { bookName, rest } = splitBookAndRest(firstAlternative);
  const book = resolveBook(bookName);
  if (!book) return { usfmCode: null, ranges: [], unparsed: [] };

  const ranges: VerseRange[] = [];
  const unparsed: string[] = [];

  // A semicolon starts a fresh chapter group — nothing carries across it.
  for (const block of rest.split(';')) {
    const state: ChapterState = {
      chapter: book.singleChapter ? 1 : null,
      chapterLabel: undefined,
    };

    const pieces = block.split(',').flatMap((piece) => piece.split(/\band\b/));
    for (const piece of pieces) {
      if (!piece.trim()) continue;
      const { range, original } = parseSegment(piece, state);
      if (range) ranges.push(range);
      else unparsed.push(original);
    }
  }

  return { usfmCode: book.usfmCode, ranges, unparsed };
}
