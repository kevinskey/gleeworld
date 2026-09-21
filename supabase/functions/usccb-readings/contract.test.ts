// Pins the CURRENT usccb-readings response contract before Phase 1 Task 4
// rewrites its internals to source from the local WEBCE-backed RPCs instead
// of scraping universalis.com. Deployed iOS clients call this function and
// depend on this exact shape — see docs/superpowers/plans/2026-08-04-prayer-phase1.md.
//
// If this test does not pass against the pre-rewrite implementation, the
// contract is not what the plan assumes it is; stop and re-read the function
// before touching it.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { runUsccbReadings, isUsccbReadingsError } from './runReadings';

// A minimal but structurally faithful stand-in for a Universalis mass.htm
// page: title anchor, a reading with a citation + body, a citation-only
// Responsorial Psalm (Universalis strips its body), a Gospel with a title
// line, then the page-chrome tail that must be truncated away.
function fixtureHtml(yyyymmdd: string): string {
  return `
<html><head><title>Readings at Mass</title></head><body>
<a class="feast" href="/${yyyymmdd}/mass.htm">Nineteenth Sunday in Ordinary Time<br></a>
<hr class="shortrule"/>
<table class="each">
<tr><th>First reading</th><th>1 Kings 19:9a, 11-13a</th></tr>
</table>
<h4>The Lord passed by</h4>
<div class="p">Elijah came to the mountain of God, and there he entered a cave.</div>
<div class="v">"Go forth and stand upon the mount before the LORD."</div>
<hr class="shortrule"/>
<table class="each">
<tr><th>Responsorial Psalm</th></tr>
<tr><th>Psalm 85:9-14</th></tr>
</table>
<hr class="shortrule"/>
<table class="each">
<tr><th>Gospel</th><th>Matthew 14:22-36</th></tr>
</table>
<h4>Jesus walks on the water</h4>
<div class="p">Immediately Jesus made the disciples get into the boat.</div>
<hr class="shortrule"/>
<h2>Christian Art</h2>
<p class="rubric">You can also view this page in Greek/English.</p>
<div class="bottomstuff">copyright and navigation chrome</div>
</body></html>`;
}

function stubUpstream(html: string, finalUrl: string, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      url: finalUrl,
      text: async () => html,
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('usccb-readings contract', () => {
  it('returns the pinned shape: date, sourceUrl, liturgicalTitle, readings[]', async () => {
    const yyyymmdd = '20260806';
    stubUpstream(fixtureHtml(yyyymmdd), `https://universalis.com/${yyyymmdd}/mass.htm`);

    const result = await runUsccbReadings('2026-08-06');
    expect(isUsccbReadingsError(result)).toBe(false);
    if (isUsccbReadingsError(result)) return;

    expect(result).toMatchObject({
      date: '2026-08-06',
      sourceUrl: `https://universalis.com/${yyyymmdd}/mass.htm`,
      liturgicalTitle: 'Nineteenth Sunday in Ordinary Time',
    });
    expect(Array.isArray(result.readings)).toBe(true);
    expect(result.readings).toHaveLength(3);

    for (const block of result.readings) {
      expect(typeof block.heading).toBe('string');
      expect(block.citation === null || typeof block.citation === 'string').toBe(true);
      expect(block.summary === null || typeof block.summary === 'string').toBe(true);
      expect(typeof block.html).toBe('string');
    }
  });

  it('carries a citation-only Responsorial Psalm through with empty body', async () => {
    const yyyymmdd = '20260806';
    stubUpstream(fixtureHtml(yyyymmdd), `https://universalis.com/${yyyymmdd}/mass.htm`);

    const result = await runUsccbReadings('2026-08-06');
    if (isUsccbReadingsError(result)) throw new Error('unexpected error result');

    const psalm = result.readings.find((r) => /responsorial psalm/i.test(r.heading));
    expect(psalm).toBeDefined();
    expect(psalm?.citation).toBe('Psalm 85:9-14');
    expect(psalm?.html).toBe('');
  });

  it('truncates page chrome (Christian Art, rubric, bottomstuff) out of the Gospel body', async () => {
    const yyyymmdd = '20260806';
    stubUpstream(fixtureHtml(yyyymmdd), `https://universalis.com/${yyyymmdd}/mass.htm`);

    const result = await runUsccbReadings('2026-08-06');
    if (isUsccbReadingsError(result)) throw new Error('unexpected error result');

    const gospel = result.readings.find((r) => /gospel/i.test(r.heading));
    expect(gospel?.html).toContain('Immediately Jesus made the disciples get into the boat.');
    expect(gospel?.html).not.toMatch(/Christian Art|rubric|bottomstuff|copyright/i);
  });

  it('reports an out-of-range date instead of parsing the "Other dates" redirect target as empty', async () => {
    const yyyymmdd = '19000101';
    // fetch() follows the redirect, so the final URL lands on the
    // "other dates" page rather than the requested date's page.
    stubUpstream('<html>Other dates</html>', 'https://universalis.com/n-otherdates.htm');

    const result = await runUsccbReadings('1900-01-01');
    if (isUsccbReadingsError(result)) throw new Error('unexpected error result');

    expect(result.outOfRange).toBe(true);
    expect(result.readings).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('surfaces a non-200 upstream response as an error with status 502', async () => {
    stubUpstream('', 'https://universalis.com/20260806/mass.htm', false, 500);

    const result = await runUsccbReadings('2026-08-06');
    expect(isUsccbReadingsError(result)).toBe(true);
    if (!isUsccbReadingsError(result)) throw new Error('expected an error result');
    expect(result.status).toBe(502);
  });
});
