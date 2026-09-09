// Pins the usccb-readings edge function's response contract, per
// docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4, Step 1.
//
// Deployed iOS clients call this function by name and read this exact
// shape off the response: { date, sourceUrl, liturgicalTitle, readings:
// [{ heading, citation, summary, html }] }, plus { error, outOfRange } for
// a date with nothing to show. These assertions describe that SHAPE —
// field names and types — not any particular data source. They were first
// written and run green against the pre-rewrite implementation (fetch +
// scrape universalis.com); the rewrite that follows (RPC-based, no
// outbound fetch) only ever changes the "arrange" section of each test
// (what's mocked) — the "assert" section is untouched, which is exactly
// what proves the contract survived the rewrite.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handler } from './index.ts';

function req(date: unknown) {
  return new Request('http://local/usccb-readings', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

const SAMPLE_HTML = `
<hr class="shortrule"/>
<table class="each"><tr><th>First reading</th><th>Isaiah 2:1-5</th></tr></table>
<h4>The mountain of the LORD's house</h4>
<div class="p">In days to come the mountain of the LORD&#39;s house shall be established.</div>
<hr class="shortrule"/>
<table class="each"><tr><th>Responsorial Psalm</th><th>Psalm 122</th></tr></table>
<hr class="shortrule"/>
<table class="each"><tr><th>Gospel</th><th>Matthew 24:37-44</th></tr></table>
<div class="p">Stay awake!</div>
<h2>Christian Art</h2>
`;

function mockUpstream(url: string, html: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, url, text: async () => html })),
  );
}

describe('usccb-readings response contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a non-POST method the same way regardless of source', async () => {
    const res = await handler(new Request('http://local/usccb-readings', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('rejects invalid JSON and a malformed date the same way regardless of source', async () => {
    const badJson = await handler(
      new Request('http://local/usccb-readings', { method: 'POST', body: '{not json' }),
    );
    expect(badJson.status).toBe(400);

    const badDate = await handler(req('not-a-date'));
    expect(badDate.status).toBe(400);
  });

  it('returns the exact shape for a date with readings', async () => {
    mockUpstream('https://universalis.com/20260704/mass.htm', SAMPLE_HTML);

    const res = await handler(req('2026-07-04'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Top-level shape: exactly these four keys on a healthy response.
    expect(Object.keys(body).sort()).toEqual(['date', 'liturgicalTitle', 'readings', 'sourceUrl'].sort());
    expect(body.date).toBe('2026-07-04');
    expect(typeof body.sourceUrl).toBe('string');
    expect(body.liturgicalTitle === null || typeof body.liturgicalTitle === 'string').toBe(true);
    expect(Array.isArray(body.readings)).toBe(true);
    expect(body.readings.length).toBeGreaterThan(0);

    for (const r of body.readings) {
      expect(Object.keys(r).sort()).toEqual(['citation', 'heading', 'html', 'summary'].sort());
      expect(typeof r.heading).toBe('string');
      expect(r.citation === null || typeof r.citation === 'string').toBe(true);
      expect(r.summary === null || typeof r.summary === 'string').toBe(true);
      expect(typeof r.html).toBe('string');
    }
  });

  it('reports an unavailable date with the exact out-of-range shape', async () => {
    // Whatever the underlying reason (Universalis' publish window before the
    // rewrite, our imported citation window after it), an unavailable date
    // must report through this exact shape so ReadingsModal's handling
    // (error + outOfRange, styled as information rather than a failure)
    // keeps working unmodified.
    mockUpstream('https://universalis.com/n-otherdates.htm', '<html></html>');

    const res = await handler(req('2030-01-01'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(
      ['date', 'error', 'liturgicalTitle', 'outOfRange', 'readings', 'sourceUrl'].sort(),
    );
    expect(body.date).toBe('2030-01-01');
    expect(typeof body.sourceUrl).toBe('string');
    expect(body.liturgicalTitle).toBeNull();
    expect(body.readings).toEqual([]);
    expect(typeof body.error).toBe('string');
    expect(body.outOfRange).toBe(true);
  });
});
