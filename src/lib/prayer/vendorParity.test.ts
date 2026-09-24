import { describe, it, expect } from 'vitest';
import { resolveBook } from './books';
import { parseCitation } from './citation';
import { resolveBook as resolveBookVendored } from '../../../supabase/functions/_shared/liturgy/books.ts';
import { parseCitation as parseCitationVendored } from '../../../supabase/functions/_shared/liturgy/citation.ts';

/**
 * supabase/functions/_shared/liturgy/{books,citation}.ts are vendored copies
 * of this directory's {books,citation}.ts: Deno Edge Functions deploy
 * per-function and cannot import across the supabase/functions/ boundary
 * into src/ (see the header comment in the vendored files), so citation
 * parsing can't literally live in "exactly one place" on disk. This test is
 * the next best thing — it fails the moment the two copies disagree, so a
 * fix applied to one and not the other is caught here instead of silently
 * reaching production.
 */

const CITATIONS = [
  'Isaiah 2:1-5',
  'Psalm 122:1-2, 3-4, 6-7',
  'Acts 7:51—8:1a',
  'Ezekiel 9:1-7; 10:18-22',
  'Isaiah 58:1-9a',
  'Psalm 23: 1-3a, 3b-4',
  'Psalm 33: 4-5',
  'Psalm 1:1-2, 3, 4 and 6',
  'Philemon 7-20',
  'Esther C:12, 14-16',
  'Psalm 23: 1-3a, 3b4, 5, 6',
  'Genesis 1:1-2:2|Genesis 1:1,26-31a',
  'From the Common of the Blessed Virgin Mary',
  '1 Corinthians 12:12-14',
  '2 John 4-9',
];

const BOOK_NAMES = [
  'Isaiah', '1 Corinthians', '2 Samuel', 'Sirach', 'Wisdom', 'Tobit',
  '1 Maccabees', '  song of songs ', 'Jude', 'Philemon', 'Obadiah',
  '2 John', '3 John', 'Genesis', 'Esther', 'Book of Mormon', '',
];

describe('vendored Deno copies stay in parity with src/lib/prayer', () => {
  it.each(BOOK_NAMES)('resolveBook(%j) matches', (name) => {
    expect(resolveBookVendored(name)).toEqual(resolveBook(name));
  });

  it.each(CITATIONS)('parseCitation(%j) matches', (citation) => {
    expect(parseCitationVendored(citation)).toEqual(parseCitation(citation));
  });
});
