import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWebSearch } from '../runWebSearch';

beforeEach(() => {
  const braveOk = {
    ok: true,
    json: async () => ({
      web: {
        results: [
          { title: 'Result 1', url: 'https://example.com/1', description: 'First snippet' },
          { title: 'Result 2', url: 'https://example.com/2', description: 'Second snippet' },
        ],
      },
    }),
  };
  const deepseekOk = {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'A synthesized answer.' } }],
    }),
  };
  const firecrawlOk = {
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { title: 'FC 1', url: 'https://fc.example/1', description: 'FC first snippet' },
        { title: 'FC 2', url: 'https://fc.example/2', description: 'FC second snippet' },
      ],
    }),
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('brave')) return braveOk;
    if (String(url).includes('firecrawl')) return firecrawlOk;
    if (String(url).includes('deepseek')) return deepseekOk;
    throw new Error(`unexpected fetch: ${url}`);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('runWebSearch', () => {
  it('returns Brave results + DeepSeek answer', async () => {
    const out = await runWebSearch({ query: 'gospel choir history', braveKey: 'b', deepseekKey: 'd' });
    expect(out.results.length).toBe(2);
    expect(out.results[0].title).toBe('Result 1');
    expect(out.answer).toBe('A synthesized answer.');
  });

  it('returns results without an answer when DeepSeek fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('brave')) return { ok: true, json: async () => ({ web: { results: [{ title: 't', url: 'https://x', description: 's' }] } }) };
      return { ok: false, status: 500, json: async () => ({}) };
    }));
    const out = await runWebSearch({ query: 'x', braveKey: 'b', deepseekKey: 'd' });
    expect(out.results.length).toBe(1);
    expect(out.answer).toBeUndefined();
  });

  it('throws with a friendly message when Brave fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })));
    await expect(runWebSearch({ query: 'x', braveKey: 'b', deepseekKey: 'd' }))
      .rejects.toThrow('Search is unavailable');
  });

  it('uses the provided deepseekModel in the fetch body', async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (String(url).includes('brave')) return { ok: true, json: async () => ({ web: { results: [] } }) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) };
    });
    vi.stubGlobal('fetch', fetchSpy);
    await runWebSearch({ query: 'x', braveKey: 'b', deepseekKey: 'd', deepseekModel: 'deepseek-v4-flash' });
    // Second fetch call is the DeepSeek POST
    const deepseekCall = fetchSpy.mock.calls.find((c: unknown[]) => String(c[0]).includes('deepseek'));
    expect(deepseekCall).toBeDefined();
    const body = JSON.parse((deepseekCall as [string, { body: string }])[1].body);
    expect(body.model).toBe('deepseek-v4-flash');
  });

  it('searches with Firecrawl when its key is present', async () => {
    const out = await runWebSearch({ query: 'thea bowman', firecrawlKey: 'f', deepseekKey: 'd' });
    expect(out.results).toHaveLength(2);
    expect(out.results[0]).toEqual({
      title: 'FC 1', url: 'https://fc.example/1', snippet: 'FC first snippet',
    });
    expect(out.answer).toBe('A synthesized answer.');
  });

  it('prefers Firecrawl over Brave when both are configured', async () => {
    const out = await runWebSearch({ query: 'x', braveKey: 'b', firecrawlKey: 'f', deepseekKey: 'd' });
    expect(out.results[0].url).toBe('https://fc.example/1');
  });

  it('still returns results when there is no summarizer key', async () => {
    // Requiring DeepSeek to answer at all is what made an unset key look like
    // a total outage. Results without a summary are still useful.
    const out = await runWebSearch({ query: 'x', firecrawlKey: 'f' });
    expect(out.results).toHaveLength(2);
    expect(out.answer).toBeUndefined();
  });

  it('reports a clear error when no provider is configured', async () => {
    await expect(runWebSearch({ query: 'x', deepseekKey: 'd' }))
      .rejects.toThrow(/not configured/i);
  });
});
