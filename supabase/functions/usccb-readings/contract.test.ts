// Pins the CURRENT usccb-readings response contract before Phase 1 replaces
// the universalis.com scrape with a local prayer_day_full() RPC call
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4).
//
// Deployed iOS clients call this function and depend on this exact shape:
// { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation,
// summary, html }] }. If this test does not pass against the *current*
// implementation, the contract is not what the Phase 1 plan assumes it is —
// stop and re-read handler.ts before touching anything.
//
// Network-free: fetch is mocked with a small fixture shaped like a real
// universalis.com mass.htm page (same <hr class="shortrule"> / <table
// class="each"> structure handler.ts's parser expects) rather than hitting
// the real site.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRequest } from './handler';

const FIXTURE_HTML = `<html><head><title>Readings at Mass</title></head><body>
<a class="feast" href="/20260804/mass.htm">Tuesday of week 18 in Ordinary Time<br></a>
<hr class="shortrule"/>
<table class="each"><tr><th>First Reading</th><th>Jeremiah 30:1-2, 12-15, 18-22</th></tr></table>
<div class="p">Thus says the LORD, the God of Israel: Write in a book all the words I have spoken to you.</div>
<hr class="shortrule"/>
<table class="each"><tr><th>Responsorial Psalm</th><th>Psalm 102</th></tr></table>
<hr class="shortrule"/>
<table class="each"><tr><th>Gospel</th><th>Matthew 14:22-36</th></tr></table>
<h4>Only let me touch his cloak.</h4>
<div class="p">Jesus made the disciples get into the boat.</div>
<h2>Christian Art</h2>
</body></html>`;

function mockUniversalis(html: string, url: string, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 502,
      url,
      text: async () => html,
    })),
  );
}

function postRequest(date: string): Request {
  return new Request('http://localhost/usccb-readings', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usccb-readings response contract', () => {
  it('returns the exact top-level shape deployed clients depend on', async () => {
    mockUniversalis(FIXTURE_HTML, 'https://universalis.com/20260804/mass.htm');

    const res = await handleRequest(postRequest('2026-08-04'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(
      ['date', 'liturgicalTitle', 'readings', 'sourceUrl'].sort(),
    );
    expect(body.date).toBe('2026-08-04');
    expect(body.sourceUrl).toBe('https://universalis.com/20260804/mass.htm');
    expect(body.liturgicalTitle).toBe('Tuesday of week 18 in Ordinary Time');
    expect(Array.isArray(body.readings)).toBe(true);
    expect(body.readings.length).toBe(3);

    for (const reading of body.readings) {
      expect(Object.keys(reading).sort()).toEqual(
        ['citation', 'heading', 'html', 'summary'].sort(),
      );
      expect(typeof reading.heading).toBe('string');
      expect(typeof reading.html).toBe('string');
    }
  });

  it('parses heading, citation, and body correctly per reading', async () => {
    mockUniversalis(FIXTURE_HTML, 'https://universalis.com/20260804/mass.htm');

    const body = await (await handleRequest(postRequest('2026-08-04'))).json();

    expect(body.readings[0]).toEqual({
      heading: 'First Reading',
      citation: 'Jeremiah 30:1-2, 12-15, 18-22',
      summary: null,
      html: '<p>Thus says the LORD, the God of Israel: Write in a book all the words I have spoken to you.</p>',
    });

    // Responsorial Psalm on mass.htm is citation-only (no body) — the
    // contract preserves it rather than dropping it, so the frontend can
    // still auto-fill the citation.
    expect(body.readings[1]).toEqual({
      heading: 'Responsorial Psalm',
      citation: 'Psalm 102',
      summary: null,
      html: '',
    });

    expect(body.readings[2]).toEqual({
      heading: 'Gospel',
      citation: 'Matthew 14:22-36',
      summary: 'Only let me touch his cloak.',
      html: '<p>Jesus made the disciples get into the boat.</p>',
    });
  });

  it('reports an out-of-range date without treating it as a parse failure', async () => {
    // Universalis 302s an out-of-window date to /n-otherdates.htm; fetch
    // follows the redirect, so `upstream.url` lands on a different date.
    mockUniversalis('<html></html>', 'https://universalis.com/n-otherdates.htm');

    const res = await handleRequest(postRequest('1999-01-01'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.outOfRange).toBe(true);
    expect(body.readings).toEqual([]);
    expect(body.liturgicalTitle).toBeNull();
    expect(typeof body.error).toBe('string');
  });

  it('rejects a malformed date before ever calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await handleRequest(postRequest('08/04/2026'));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces an upstream error status without inventing a 200', async () => {
    mockUniversalis('', 'https://universalis.com/20260804/mass.htm', false);

    const res = await handleRequest(postRequest('2026-08-04'));
    expect(res.status).toBe(502);
  });

  it('answers CORS preflight without touching fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await handleRequest(new Request('http://localhost/usccb-readings', { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
