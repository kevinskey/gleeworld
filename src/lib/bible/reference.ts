import { resolveBook } from '@/lib/prayer/books';

/**
 * Parses a scripture REFERENCE typed into the search box — "Psalm 23",
 * "John 3:16", "1 Cor 13" — or handed over verbatim from the lectionary.
 *
 * This exists because full-text search alone silently fails the most natural
 * query in a Bible app. `websearch_to_tsquery('Psalm 23')` becomes
 * `'psalm' & '23'`, which looks for those words inside verse TEXT and matches
 * nothing — a reference is not content. Search now tries this first and falls
 * back to text search.
 *
 * Lectionary citations are the hard cases, and they are exactly what the
 * assistant is given when asked to read the day's readings: the citations in
 * gw_prayer_readings arrive as "Psalm 25:4-5, 6-7, 8-9" (verse groups),
 * "Luke 9:43b-45" (verse letters), "Psalm 144:1b and 2abc, 3-4" ("and"),
 * "Ecclesiastes 11:9—12:8" (em-dash, cross-chapter). Rejecting those meant
 * the assistant could announce the readings but never read one.
 *
 * Returns null for anything that isn't clearly a reference, so ordinary word
 * searches ("shepherd", "living water") are never hijacked.
 */

export interface RefSegment {
  chapter: number;
  /** Start verse; null means the whole chapter. */
  verseStart: number | null;
  /** End verse, inclusive; null with verseStart set means "to the end of
   *  the chapter" (the head of a cross-chapter range). */
  verseEnd: number | null;
}

export interface ParsedReference {
  usfmCode: string;
  chapter: number;
  /** Start verse when one is given; null for a whole chapter. */
  verse: number | null;
  /** End verse of a same-chapter range ("Ezekiel 34:1-11"); null when the
   *  reference is a single verse or a whole chapter. */
  verseEnd: number | null;
  /** Every verse group in reading order. A plain reference is one segment;
   *  "Psalm 25:4-5, 6-7" is two; "John 7:53-8:11" spans two chapters. */
  segments: RefSegment[];
}

// Book name, then an optional chapter, then an optional :verse (and range).
// The book part is greedy over letters/spaces so "Song of Solomon 2" works,
// and allows a leading digit for "1 Corinthians".
const HEAD = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s'.]*?)\s*(?:(\d+))?\s*$/;

// One verse group after the colon: "5", "4-5", or "53-8:11" (the range end
// lands in another chapter).
const GROUP = /^(\d+)(?:-(?:(\d+):)?(\d+))?$/;

/** Verse letters ("43b", "17bc") mark half-verses the printed lectionary
 *  distinguishes; the verse table does not, so they only need to vanish.
 *  Letters must touch the digits — "1 Corinthians" keeps its name. */
function stripVerseLetters(s: string): string {
  return s.replace(/(\d+)[a-z]{1,3}(?![a-z])/gi, '$1');
}

function parseGroups(tail: string, firstChapter: number): RefSegment[] | null {
  const cleaned = stripVerseLetters(tail)
    .replace(/[–—]/g, '-')
    .replace(/\s+and\s+/gi, ',')
    .replace(/\s+/g, '');
  if (!cleaned) return null;

  const segments: RefSegment[] = [];
  let chapter = firstChapter;
  for (const piece of cleaned.split(',')) {
    if (!piece) continue;
    const m = GROUP.exec(piece);
    if (!m) return null;
    const start = Number(m[1]);
    if (m[2]) {
      // Cross-chapter: read to the end of this chapter, then from the top
      // of the next one.
      segments.push({ chapter, verseStart: start, verseEnd: null });
      chapter = Number(m[2]);
      segments.push({ chapter, verseStart: 1, verseEnd: Number(m[3]) });
    } else {
      const end = m[3] ? Number(m[3]) : start;
      // "34:11-1" is nonsense; keep the start verse.
      segments.push({ chapter, verseStart: start, verseEnd: Math.max(end, start) });
    }
  }
  return segments.length ? segments : null;
}

/** Merge groups that touch ("3-4, 5-6" reads as 3-6) so a psalm is one
 *  fetch, while genuinely skipped verses stay skipped. */
function mergeSegments(segments: RefSegment[]): RefSegment[] {
  const out: RefSegment[] = [];
  for (const s of segments) {
    const prev = out[out.length - 1];
    if (
      prev && prev.chapter === s.chapter &&
      prev.verseStart != null && prev.verseEnd != null &&
      s.verseStart != null && s.verseStart <= prev.verseEnd + 1
    ) {
      prev.verseEnd = Math.max(prev.verseEnd, s.verseEnd ?? s.verseStart);
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function parseReference(input: string): ParsedReference | null {
  const q = (input ?? '').trim();
  if (!q) return null;

  const colon = q.indexOf(':');
  const head = colon === -1 ? q : q.slice(0, colon);
  const tail = colon === -1 ? '' : q.slice(colon + 1);

  const m = HEAD.exec(stripVerseLetters(head).replace(/[–—]/g, '-'));
  if (!m) return null;

  const [, rawName, rawChapter] = m;
  const name = rawName.replace(/[.\s]+$/, '').trim();
  if (!name) return null;

  const book = resolveBook(name);
  if (!book) return null;

  // A bare book name is a reference too — open it at the beginning.
  const chapter = rawChapter ? Number(rawChapter) : 1;
  if (!Number.isFinite(chapter) || chapter < 1) return null;

  let segments: RefSegment[];
  if (tail) {
    if (!rawChapter) return null;
    const groups = parseGroups(tail, chapter);
    if (!groups) return null;
    segments = mergeSegments(groups);
  } else {
    segments = [{ chapter, verseStart: null, verseEnd: null }];
  }

  const first = segments[0];
  return {
    usfmCode: book.usfmCode,
    chapter: first.chapter,
    verse: first.verseStart,
    verseEnd:
      first.verseEnd != null && first.verseEnd !== first.verseStart
        ? first.verseEnd
        : null,
    segments,
  };
}
