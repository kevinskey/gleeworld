import { describe, it, expect } from 'vitest';
import { parseUsfmBook } from './usfm';

// Every fixture below is copied verbatim from the real WEBCE USFM release,
// not invented. WEBCE tags almost every word with \w word|strong="..."\w*,
// which naive marker-stripping turns into 'word|strong="H3068"'.

const PSALM_23 = String.raw`\id PSA
\h Psalms
\c 23
\d A Psalm by David.
\q1
\v 1 \w The|strong="H3068"\w* \w LORD|strong="H3068"\w* \w is|strong="H3068"\w* \w my|strong="H3068"\w* \w shepherd|strong="H7462"\w*;
\q2 \w I|strong="H3808"\w* \w shall|strong="H3068"\w* \w lack|strong="H2637"\w* \w nothing|strong="H3808"\w*.
\q1
\v 2 \w He|strong="H5921"\w* makes \w me|strong="H5921"\w* \w lie|strong="H7257"\w* \w down|strong="H7257"\w*.
`;

const GENESIS_1_1 = String.raw`\id GEN
\h Genesis
\c 1
\p
\v 1 \w In|strong="H8064"\w* \w the|strong="H1254"\w* \w beginning|strong="H7225"\w*, \w God|strong="H8064"\w*\f + \fr 1:1 \ft The Hebrew word rendered “God” is “\+wh אֱלֹהִ֑ים\+wh*” (Elohim).\f* \w created|strong="H1254"\w* \w the|strong="H1254"\w* \w heavens|strong="H8064"\w* \w and|strong="H8064"\w* \w the|strong="H1254"\w* \w earth|strong="H8064"\w*.
`;

const CROSS_REF = String.raw`\id 2KI
\h 2 Kings
\c 12
\p
\v 4 Jehoash said \w to|strong="H5971"\w* \w the|strong="H5493"\w* \w priests|strong="H3808"\w*, “\w All|strong="H5750"\w* \w the|strong="H5493"\w* money is evaluated,\x + \xo 12:4 \xt Exodus 30:12\x* \w and|strong="H5971"\w* \w all|strong="H5750"\w* \w the|strong="H5493"\w* money.
`;

const WORDS_OF_JESUS = String.raw`\id MAT
\h Matthew
\c 4
\p
\v 17 \wj \w Repent|strong="G3340"\w*, \w for|strong="G1063"\w* \w the|strong="G3588"\w* Kingdom is at hand!\wj*
`;

describe('parseUsfmBook', () => {
  it('extracts the book code and human name', () => {
    const book = parseUsfmBook(PSALM_23);
    expect(book.usfmCode).toBe('PSA');
    expect(book.name).toBe('Psalms');
  });

  it('strips \\w word markers and their strong attributes', () => {
    const { verses } = parseUsfmBook(PSALM_23);
    expect(verses[0].text).toContain('The LORD is my shepherd');
    // The attribute must not survive into the text.
    expect(verses[0].text).not.toContain('strong=');
    expect(verses[0].text).not.toContain('|');
    expect(verses[0].text).not.toContain('\\');
  });

  // The regression that motivated these tests: poetry continuation lines carry
  // real verse text. Dropping them truncates every Psalm.
  it('joins \\q poetry continuation lines into the preceding verse', () => {
    const { verses } = parseUsfmBook(PSALM_23);
    expect(verses[0]).toEqual({
      chapter: 23,
      verse: 1,
      text: 'The LORD is my shepherd; I shall lack nothing.',
    });
  });

  it('does not treat a \\d descriptive title as verse text', () => {
    const { verses } = parseUsfmBook(PSALM_23);
    expect(verses.every((v) => !v.text.includes('A Psalm by David'))).toBe(true);
    expect(verses).toHaveLength(2);
  });

  it('removes footnotes entirely, including nested markers', () => {
    const { verses } = parseUsfmBook(GENESIS_1_1);
    expect(verses[0].text).toBe(
      'In the beginning, God created the heavens and the earth.',
    );
    expect(verses[0].text).not.toContain('Elohim');
  });

  it('removes cross-references entirely', () => {
    const { verses } = parseUsfmBook(CROSS_REF);
    expect(verses[0].text).not.toContain('Exodus 30:12');
    expect(verses[0].text).toContain('money is evaluated, and all the money.');
  });

  it('keeps words-of-Jesus text while dropping the \\wj markers', () => {
    const { verses } = parseUsfmBook(WORDS_OF_JESUS);
    expect(verses[0].text).toBe('Repent, for the Kingdom is at hand!');
  });

  it('tracks chapter numbers across \\c markers', () => {
    const src = String.raw`\id JHN
\h John
\c 1
\p
\v 1 In the beginning was the Word.
\c 3
\p
\v 16 For God so loved the world.
`;
    const { verses } = parseUsfmBook(src);
    expect(verses).toEqual([
      { chapter: 1, verse: 1, text: 'In the beginning was the Word.' },
      { chapter: 3, verse: 16, text: 'For God so loved the world.' },
    ]);
  });

  // Verbatim from Sirach 1:5. 29 verses across the WEBCE corpus consist only of
  // a footnote explaining that the verse is omitted by the best authorities
  // (also Luke 17:36, Acts 8:37, Romans 16:24). Emitting no row is correct —
  // the verse genuinely has no text in this translation.
  it('emits no verse when the line contains only an omission footnote', () => {
    const src = String.raw`\id SIR
\h Sirach
\c 1
\p
\v 4 Wisdom has been created before all things.
\v 5 \f + \fr 1:5 \ft Verse 5 is omitted by the best authorities.\f*
\v 6 To whom has the root of wisdom been revealed?
`;
    const { verses } = parseUsfmBook(src);
    expect(verses.map((v) => v.verse)).toEqual([4, 6]);
  });

  it('collapses whitespace and trims trailing spaces', () => {
    const src = '\\id GEN\n\\h Genesis\n\\c 1\n\\v 1 Some   text   here.   \n';
    const { verses } = parseUsfmBook(src);
    expect(verses[0].text).toBe('Some text here.');
  });
});
