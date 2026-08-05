import { resolveBook } from '@/lib/prayer/books';

/**
 * Parses a scripture REFERENCE typed into the search box — "Psalm 23",
 * "John 3:16", "1 Cor 13".
 *
 * This exists because full-text search alone silently fails the most natural
 * query in a Bible app. `websearch_to_tsquery('Psalm 23')` becomes
 * `'psalm' & '23'`, which looks for those words inside verse TEXT and matches
 * nothing — a reference is not content. Search now tries this first and falls
 * back to text search.
 *
 * Returns null for anything that isn't clearly a reference, so ordinary word
 * searches ("shepherd", "living water") are never hijacked.
 */

export interface ParsedReference {
  usfmCode: string;
  chapter: number;
  /** Start verse when one is given; null for a whole chapter. */
  verse: number | null;
}

// Book name, then an optional chapter, then an optional :verse (and range).
// The book part is greedy over letters/spaces so "Song of Solomon 2" works,
// and allows a leading digit for "1 Corinthians".
const REF = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s'.]*?)\s*(?:(\d+)\s*(?::\s*(\d+))?(?:\s*[-–—]\s*\d+(?::\d+)?)?)?\s*$/;

export function parseReference(input: string): ParsedReference | null {
  const q = (input ?? '').trim();
  if (!q) return null;

  const m = REF.exec(q);
  if (!m) return null;

  const [, rawName, rawChapter, rawVerse] = m;
  const name = rawName.replace(/[.\s]+$/, '').trim();
  if (!name) return null;

  const book = resolveBook(name);
  if (!book) return null;

  // A bare book name is a reference too — open it at the beginning.
  const chapter = rawChapter ? Number(rawChapter) : 1;
  if (!Number.isFinite(chapter) || chapter < 1) return null;

  return {
    usfmCode: book.usfmCode,
    chapter,
    verse: rawVerse ? Number(rawVerse) : null,
  };
}
