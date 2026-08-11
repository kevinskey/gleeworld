import { describe, it, expect, vi, afterEach } from 'vitest';
import { lookupDOI, lookupISBN } from './sourceLookup';

afterEach(() => vi.unstubAllGlobals());

it('maps a Crossref work to DocSource fields', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: {
    title: ['A Study of Spirituals'], 'container-title': ['Journal of Musicology'],
    author: [{ family: 'Jones', given: 'Arthur' }],
    issued: { 'date-parts': [[1993]] }, volume: '11', issue: '2', page: '123-145', DOI: '10.1/abc',
  }})}));
  const r = await lookupDOI('10.1/abc');
  expect(r).toMatchObject({ type: 'journal', title: 'A Study of Spirituals',
    container: 'Journal of Musicology', year: '1993', volume: '11', pages: '123-145',
    authors: [{ family: 'Jones', given: 'Arthur' }] });
});

it('returns null on non-ok response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  expect(await lookupDOI('nope')).toBeNull();
});

it('returns null on network error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
  expect(await lookupISBN('9780393038439')).toBeNull();
});

it('maps Open Library book data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    'ISBN:9780393038439': { title: 'The Music of Black Americans',
      authors: [{ name: 'Eileen Southern' }], publish_date: '1997',
      publishers: [{ name: 'W. W. Norton' }] },
  })}));
  const r = await lookupISBN('9780393038439');
  expect(r).toMatchObject({ type: 'book', title: 'The Music of Black Americans',
    publisher: 'W. W. Norton', year: '1997',
    authors: [{ family: 'Southern', given: 'Eileen' }] });
});
