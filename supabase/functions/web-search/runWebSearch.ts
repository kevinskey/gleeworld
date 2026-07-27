export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutput {
  answer?: string;
  results: WebResult[];
}

export async function runWebSearch(opts: {
  query: string;
  braveKey: string;
  deepseekKey: string;
}): Promise<WebSearchOutput> {
  const q = opts.query.trim();
  if (!q) return { results: [] };

  const braveRes = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&safesearch=strict`,
    { headers: { 'X-Subscription-Token': opts.braveKey, 'Accept': 'application/json' } },
  );
  if (!braveRes.ok) throw new Error('Search is unavailable right now. Please try again.');
  const braveBody = await braveRes.json();
  const results: WebResult[] = (braveBody.web?.results ?? []).slice(0, 5).map((r: any) => ({
    title: String(r.title ?? ''),
    url: String(r.url ?? ''),
    snippet: String(r.description ?? ''),
  }));

  // Synthesize a 2-3 sentence answer from the top snippets. Never fabricate:
  // if DeepSeek is unhappy, we just return results without an answer.
  let answer: string | undefined;
  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.deepseekKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
