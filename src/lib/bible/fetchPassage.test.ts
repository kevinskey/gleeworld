import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The scripture lookup behind live voice.
 *
 * This is what the agent speaks from, so its FAILURE messages matter as much
 * as its successes: the agent is instructed never to recite from memory, so
 * every path has to hand back something honest for it to say.
 */

type Row = Record<string, unknown>;
let translations: Row[] = [];
let books: Row[] = [];
let verses: Row[] = [];

/** Minimal stand-in for the PostgREST builder — chainable, then awaited. */
function table(name: string) {
  const state: { single: boolean } = { single: false };
  const rowsFor = () =>
    name === 'gw_bible_translations' ? translations
    : name === 'gw_bible_books' ? books
    : verses;
  const builder: Record<string, unknown> = {
    then: (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: state.single ? (rowsFor()[0] ?? null) : rowsFor(), error: null }),
  };
  for (const m of ['select', 'eq', 'ilike', 'order', 'limit', 'in', 'textSearch']) {
    builder[m] = () => builder;
  }
  builder.maybeSingle = () => { state.single = true; return builder; };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (name: string) => table(name) },
}));

const { fetchPassage, searchScripture } = await import('./fetchPassage');

beforeEach(() => {
  translations = [{ id: 't1', code: 'WEBCE' }];
  books = [{ id: 'b1', name: 'Psalms' }];
  verses = [];
});

describe('fetchPassage', () => {
  it('reads a single verse without announcing its number', async () => {
    verses = [{ verse: 1, text: 'The Lord is my shepherd; I shall lack nothing.' }];
    const r = await fetchPassage('Psalm 23:1');
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Psalms 23:1 (WEBCE): The Lord is my shepherd; I shall lack nothing.');
    // "one. The Lord is my shepherd" read aloud sounds like a mistake.
    expect(r.text).not.toMatch(/:\s*1\.\s/);
  });

  it('numbers the verses when a whole chapter is read', async () => {
    verses = [{ verse: 1, text: 'First.' }, { verse: 2, text: 'Second.' }];
    const r = await fetchPassage('Psalm 23');
    expect(r.text).toBe('Psalms 23 (WEBCE): 1. First. 2. Second.');
  });

  it('says so plainly when the reference is not a reference', async () => {
    const r = await fetchPassage('the bit about the sheep');
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/doesn't look like a scripture reference/);
  });

  it('says so when the passage is not in that translation', async () => {
    verses = [];
    const r = await fetchPassage('Psalm 151');
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/isn't in WEBCE/);
  });

  // A real case, not a defensive branch: JPS1917 is the Tanakh, so every New
  // Testament book is genuinely absent from it.
  it('says so when the translation has no such book', async () => {
    books = [];
    const r = await fetchPassage('John 3:16', 'JPS1917');
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/doesn't contain that book/);
  });

  it('reports when no translations are loaded at all', async () => {
    translations = [];
    const r = await fetchPassage('Psalm 23');
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/No Bible translations are loaded/);
  });
});

describe('searchScripture', () => {
  it('lists hits with their references', async () => {
    verses = [{ book_id: 'b1', chapter: 23, verse: 2, text: 'He makes me lie down.' }];
    const r = await searchScripture('lie down');
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Psalms 23:2 — He makes me lie down.');
  });

  it('says nothing matched rather than inventing a verse', async () => {
    verses = [];
    const r = await searchScripture('handbells');
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/Nothing in WEBCE matches "handbells"/);
  });

  it('refuses an empty search', async () => {
    expect((await searchScripture('   ')).ok).toBe(false);
  });
});
