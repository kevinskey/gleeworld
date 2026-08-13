import { describe, it, expect } from 'vitest';
import { parseCitation as parseCitationDeno } from './citation.ts';
import { resolveBook as resolveBookDeno } from './books.ts';
import { parseCitation as parseCitationSrc } from '../../../../src/lib/prayer/citation';
import { resolveBook as resolveBookSrc } from '../../../../src/lib/prayer/books';

// supabase/functions/_shared/prayer/{books,citation}.ts are hand-maintained
// duplicates of src/lib/prayer/{books,citation}.ts — Deno's edge runtime
// requires explicit .ts extensions on relative imports, which the Vite-built
// frontend copy doesn't use, so the two can't share one file today. This
// test is the guard against them silently drifting apart: if you change one
// copy and not the other, this fails.
const CORPUS = [
  'Isaiah 2:1-5',
  'Psalm 122:1-2, 3-4, 4-5, 6-7, 8-9',
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
  'Sirach 1:5',
];

describe('_shared/prayer duplicate stays in sync with src/lib/prayer', () => {
  it('resolveBook agrees on every book name in the corpus', () => {
    const names = ['Isaiah', 'Psalm', 'Philemon', 'Esther', '1 Corinthians', '2 John', 'Sirach', 'Book of Mormon', ''];
    for (const name of names) {
      expect(resolveBookDeno(name), name).toEqual(resolveBookSrc(name));
    }
  });

  it('parseCitation agrees on every citation in the corpus', () => {
    for (const citation of CORPUS) {
      expect(parseCitationDeno(citation), citation).toEqual(parseCitationSrc(citation));
    }
  });
});
