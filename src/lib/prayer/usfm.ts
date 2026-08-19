/**
 * Minimal USFM parser, scoped to what the WEBCE release actually uses.
 *
 * Shaped by the real file set rather than the spec: WEBCE tags nearly every
 * word as `\w word|strong="H3068"\w*` (547,833 occurrences), and — the trap
 * that motivated the tests — poetry continuation lines carry real verse text:
 *
 *     \v 1 \w The|...\w* \w LORD|...\w* is my shepherd;
 *     \q2 I shall lack nothing.
 *
 * A parser that only joins non-marker lines silently truncates every Psalm.
 *
 * Measured against the full 73-book release: 35,379 verses from 35,408 `\v`
 * lines. The 29-line difference is expected and correct — those verses contain
 * only a footnote stating they are omitted by the best authorities (Sirach 1:5,
 * 1:7, 1:21, …, Luke 17:36, Acts 8:37, Romans 16:24), so they have no text in
 * this translation. Do not "fix" that gap.
 */

export interface ParsedVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface ParsedBook {
  usfmCode: string;
  name: string;
  verses: ParsedVerse[];
}

/**
 * Paragraph and poetry markers whose remaining text belongs to the verse
 * currently being built. `\d` (descriptive title / psalm superscription) is
 * deliberately absent: it is not verse text.
 */
const CONTINUATION_MARKER = /^\\(?:q[0-9]?|p|m|b|li[0-9]?|pi[0-9]?|nb|pc|qr|qc)\b\s*/;

/** Markers that end the current verse without contributing text. */
const BLOCK_MARKER = /^\\(?:d|s[0-9]?|ms[0-9]?|mt[0-9]?|mr|sr|r|sp|ip|toc[0-9]?|ide|rem|cl|cp)\b/;

function stripInline(raw: string): string {
  return (
    raw
      // Footnotes and cross-references are removed wholesale, including any
      // nested \+wh ...\+wh* inside them.
      .replace(/\\f\s[\s\S]*?\\f\*/g, '')
      .replace(/\\x\s[\s\S]*?\\x\*/g, '')
      // \w word|strong="H1234"\w*  ->  word
      // Attributes after the pipe must go; the word must stay.
      .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*?)?\\\+?w\*/g, '$1')
      // Any remaining character-level markers: \wj … \wj*, \nd … \nd*, \add …
      // Closing forms first so the opening pass cannot eat the asterisk.
      .replace(/\\\+?[a-z]+[0-9]?\*/g, '')
      .replace(/\\\+?[a-z]+[0-9]?\s?/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function parseUsfmBook(source: string): ParsedBook {
  const lines = source.split(/\r?\n/);

  let usfmCode = '';
  let name = '';
  let chapter = 0;
  const verses: ParsedVerse[] = [];
  let current: { chapter: number; verse: number; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const text = stripInline(current.parts.join(' '));
    if (text) verses.push({ chapter: current.chapter, verse: current.verse, text });
    current = null;
  };

  for (const line of lines) {
    const id = /^\\id\s+(\S+)/.exec(line);
    if (id) {
      usfmCode = id[1];
      continue;
    }

    const heading = /^\\h\s+(.+)$/.exec(line);
    if (heading) {
      name = heading[1].trim();
      continue;
    }

    const chapterMarker = /^\\c\s+(\d+)/.exec(line);
    if (chapterMarker) {
      flush();
      chapter = Number(chapterMarker[1]);
      continue;
    }

    // \v 1 text   |   \v 1-2 text (verse bridges keep the first number)
    const verseMarker = /^\\v\s+(\d+)(?:[-–]\d+)?\s*(.*)$/.exec(line);
    if (verseMarker) {
      flush();
      current = { chapter, verse: Number(verseMarker[1]), parts: [verseMarker[2] ?? ''] };
      continue;
    }

    if (BLOCK_MARKER.test(line)) {
      flush();
      continue;
    }

    // Poetry/paragraph markers: any text after the marker continues the verse.
    const continuation = CONTINUATION_MARKER.exec(line);
    if (continuation) {
      const rest = line.slice(continuation[0].length);
      if (current && rest.trim() !== '') current.parts.push(rest);
      continue;
    }

    // A bare wrapped line also continues the current verse.
    if (current && !line.startsWith('\\') && line.trim() !== '') {
      current.parts.push(line);
    }
  }

  flush();
  return { usfmCode, name, verses };
}
