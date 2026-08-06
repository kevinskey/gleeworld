import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

/**
 * Finding a score by the words someone would actually say.
 *
 * The library stores "Children, Go Where I Send Thee". A user asking for
 * "children go where i send thee by kevin johnson" got told the piece did not
 * exist — the comma broke the single contiguous ILIKE, and the composer half
 * matched nothing because most of the library has no composer recorded.
 *
 * The stub here applies the filters for real rather than returning fixed
 * rows, because the whole bug lived in which filters were built.
 */

interface Row { id: string; title: string; composer?: string }

function musicDb(rows: Row[]) {
  let ors: string[] = [];
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = self;
  builder.limit = self;
  builder.or = (expr: string) => { ors.push(expr); return builder; };
  builder.then = (resolve: (v: unknown) => void) => {
    // Each `or` is one token: "title.ilike.%tok%,composer.ilike.%tok%".
    // PostgREST ANDs repeated or-params, so every token must match somewhere.
    const data = rows.filter((r) => ors.every((expr) => {
      const token = expr.match(/title\.ilike\.%(.*?)%/)?.[1] ?? '';
      const hay = `${r.title} ${r.composer ?? ''}`.toLowerCase();
      return hay.includes(token.toLowerCase());
    }));
    resolve({ data, error: null });
  };
  return { from: () => { ors = []; return builder; } } as never;
}

const LIBRARY: Row[] = [
  { id: 's1', title: 'Children, Go Where I Send Thee' },
  { id: 's2', title: 'Children, Go Where I Send Thee SATB' },
  { id: 's3', title: 'Lift Every Voice and Sing', composer: 'J. Rosamond Johnson' },
  { id: 's4', title: 'Ave Verum Corpus', composer: 'Mozart' },
];

const search = async (query: string) => JSON.parse(
  (await executeServerTool('search_music', { query }, { supabase: musicDb(LIBRARY) })).replyJson,
);

describe('search_music', () => {
  // The exact report: the score was in the library and she said it wasn't.
  it('finds a title whose stored form has punctuation the user omitted', async () => {
    const out = await search('children go where i send thee');
    expect(out.scores.map((s: Row) => s.id)).toContain('s1');
  });

  it('finds it when the user names the composer too', async () => {
    const out = await search('children go where i send thee by kevin johnson');
    expect(out.scores.length).toBeGreaterThan(0);
    expect(out.scores.map((s: Row) => s.id)).toContain('s1');
  });

  // Dropping tokens to get a hit is a looser answer than was asked for; the
  // model needs to know so it can name what it actually found.
  it('says when it had to relax the search', async () => {
    const out = await search('children go where i send thee by kevin johnson');
    expect(out.matchedOn).toBeTruthy();
  });

  it('does not claim a relaxed match when everything matched', async () => {
    const out = await search('ave verum corpus mozart');
    expect(out.scores[0].id).toBe('s4');
    expect(out.matchedOn).toBeUndefined();
  });

  it('matches on composer alone', async () => {
    const out = await search('Mozart');
    expect(out.scores[0].id).toBe('s4');
  });

  it('still narrows: every word has to appear somewhere', async () => {
    const out = await search('children satb');
    expect(out.scores.map((s: Row) => s.id)).toEqual(['s2']);
  });

  it('returns nothing for a piece that really is absent', async () => {
    const out = await search('Rachmaninoff Vespers');
    expect(out.scores).toEqual([]);
  });

  it('survives an empty or punctuation-only query', async () => {
    expect((await search('   ')).scores).toEqual([]);
    expect((await search('???')).scores).toEqual([]);
  });

  // A stray % or _ in a query would otherwise become a wildcard.
  it('does not let the user inject ILIKE wildcards', async () => {
    const out = await search('%%%');
    expect(out.scores).toEqual([]);
  });
});
