export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutput {
  answer?: string;
  results: WebResult[];
}

/**
 * Search the web for the assistant.
 *
 * Two providers. Brave came first; Firecrawl was added because the Brave key
 * was never filled in, so `web_search` answered "Search is not configured" for
 * every question a member asked. Firecrawl is already configured here for the
 * lectionary backfill, so the assistant can use the same key.
 *
 * Whichever key is present is used, Firecrawl first. The synthesized answer is
 * a separate step and a separate key: without DeepSeek the results still come
 * back, just without the summary, which is far better than refusing to search.
 */
export async function runWebSearch(opts: {
  query: string;
  braveKey?: string;
  firecrawlKey?: string;
  deepseekKey?: string;
  deepseekModel?: string;
}): Promise<WebSearchOutput> {
  const q = opts.query.trim();
  if (!q) return { results: [] };

  const results: WebResult[] = opts.firecrawlKey
    ? await searchFirecrawl(q, opts.firecrawlKey)
    : opts.braveKey
      ? await searchBrave(q, opts.braveKey)
      : (() => { throw new Error('Search is not configured.'); })();

  if (!opts.deepseekKey) return { results };

  // Synthesize a 2-3 sentence answer from the top snippets. Never fabricate:
  // if DeepSeek is unhappy, we just return results without an answer.
  const model = opts.deepseekModel ?? 'deepseek-v4-pro';
  let answer: string | undefined;
  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.deepseekKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Answer briefly (2-3 sentences) based only on the given search snippets. If they do not answer the question, say so plainly. Never invent facts or URLs.' },
          { role: 'user', content: `Question: ${q}\n\nSnippets:\n${results.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`).join('\n')}` },
        ],
      }),
    });
    if (dsRes.ok) {
      const body = await dsRes.json();
      const text = body.choices?.[0]?.message?.content?.trim();
      if (text) answer = text;
    }
  } catch {
    /* leave answer undefined */
  }

  return { answer, results };
}

async function searchBrave(q: string, key: string): Promise<WebResult[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&safesearch=strict`,
    { headers: { 'X-Subscription-Token': key, 'Accept': 'application/json' } },
  );
  if (!res.ok) throw new Error('Search is unavailable right now. Please try again.');
  const body = await res.json();
  return (body.web?.results ?? []).slice(0, 5).map((r: any) => ({
    title: String(r.title ?? ''),
    url: String(r.url ?? ''),
    snippet: String(r.description ?? ''),
  }));
}

/**
 * Snippets only — no `scrapeOptions`.
 *
 * Firecrawl will fetch each result's full page, which reads better but bills a
 * credit per result: one question would cost five, and the plan is a thousand a
 * month shared with the lectionary backfill. Descriptions are enough to ground
 * a two-sentence answer, and this is meant to be the fast path.
 */
async function searchFirecrawl(q: string, key: string): Promise<WebResult[]> {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, limit: 5 }),
  });
  if (!res.ok) throw new Error('Search is unavailable right now. Please try again.');
  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.slice(0, 5).map((r: any) => ({
    title: String(r.title ?? ''),
    url: String(r.url ?? ''),
    snippet: String(r.description ?? ''),
  }));
}
