// Pins the usccb-readings response contract BEFORE any rewrite to source
// from prayer_day_full() instead of scraping Universalis (Phase 1 plan,
// Task 4 Step 1: docs/superpowers/plans/2026-08-04-prayer-phase1.md).
//
// Deployed iOS clients call this function and depend on this exact shape:
//   { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }
// A future rewrite must keep parseUniversalisReadings's caller-facing
// contract identical even though the source of readings.html text changes
// from a scrape to WEBCE verse text. This test only exercises the pure
// parser in parse.ts — no network, no Deno serve.

import { describe, it, expect } from 'vitest';
import { parseUniversalisReadings, type ReadingBlock } from './parse';

const YYYYMMDD = '20260704';

// Mirrors the real mass.htm structure documented in parse.ts's own comment:
// a title anchor, then one <hr class="shortrule"/>-delimited <table
// class="each"> block per reading, then page chrome (the <h2> "Christian
// Art" blurb, a rubric cross-link, and nav) that must not leak into the
// last reading's body.
const FIXTURE_HTML = `
<html><head><title>Readings at Mass</title></head><body>
<a class="optmem" href="/${YYYYMMDD}/mass.htm">Saturday of week 13 in Ordinary Time<br>Weekday</a>

<hr class="shortrule"/>
<table class="each">
<tr><th>First reading</th><th>Amos 9:11-15</th></tr>
</table>
<h4>I will restore the fortunes of my people Israel</h4>
<div class="p">Thus says the Lord: &ldquo;On that day I will raise up&nbsp;&mdash; the fallen booth of David.&rdquo;</div>
<div class="v">I will plant them upon their own ground.</div>

<hr class="shortrule"/>
<table class="each">
<tr><th>Responsorial Psalm</th></tr>
<tr><th>Psalm 84:9-10, 11-12, 13-14</th></tr>
</table>

<hr class="shortrule"/>
<table class="each">
<tr><th>Gospel Acclamation</th><th>Cf. Matthew 11:25</th></tr>
</table>
<div class="p">Alleluia. Blessed are you, Father, for revealing the mysteries of the Kingdom.</div>

<hr class="shortrule"/>
<table class="each">
<tr><th>Gospel</th><th>Matthew 9:14-17</th></tr>
</table>
<h4>They will fast when the bridegroom is taken away</h4>
<div class="p">The disciples of John approached Jesus and said, &ldquo;Why do we and the Pharisees fast much, but your disciples do not fast?&rdquo;</div>
<div class="pi">Jesus said to them, &ldquo;Can the wedding guests mourn as long as the bridegroom is with them?&rdquo;</div>
<script>trackPageview();</script>

<hr class="shortrule"/>
<p class="rubric">You can also view this page in Greek, or in Latin.</p>
<h2>Christian Art</h2>
<div class="p">Some unrelated blurb about a painting that must never appear in a reading body.</div>
</body></html>
`;

describe('usccb-readings response contract (pre-rewrite baseline)', () => {
  const { liturgicalTitle, readings } = parseUniversalisReadings(FIXTURE_HTML, YYYYMMDD);

  it('extracts the liturgical title from the self-referencing anchor', () => {
    expect(liturgicalTitle).toBe('Saturday of week 13 in Ordinary Time');
  });

  it('returns exactly the four documented reading blocks, in document order', () => {
    expect(readings).toHaveLength(4);
    expect(readings.map((r) => r.heading)).toEqual([
      'First reading',
      'Responsorial Psalm',
      'Gospel Acclamation',
      'Gospel',
    ]);
  });

  it('every reading block carries exactly the four contract keys', () => {
    for (const r of readings) {
      expect(Object.keys(r).sort()).toEqual(['citation', 'heading', 'html', 'summary']);
    }
  });

  it('decodes HTML entities in citation/summary but leaves body entities for the browser to render', () => {
    const first = readings[0] as ReadingBlock;
    expect(first.citation).toBe('Amos 9:11-15');
    expect(first.summary).toBe('I will restore the fortunes of my people Israel');
    // Body text is HTML injected into the modal, not plain text, so entities
    // are intentionally left encoded here (only citation/summary/title are
    // decoded to plain text).
    expect(first.html).toContain('&ldquo;On that day I will raise up&nbsp;&mdash; the fallen booth of David.&rdquo;');
  });

  it('turns div.p/div.v into p/blockquote and drops <script> entirely', () => {
    const first = readings[0] as ReadingBlock;
    expect(first.html).toContain('<p>');
    expect(first.html).toContain('<blockquote>I will plant them upon their own ground.</blockquote>');

    const gospel = readings[3] as ReadingBlock;
    expect(gospel.html).not.toContain('<script');
    expect(gospel.html).not.toContain('trackPageview');
  });

  it('keeps a citation-only Responsorial Psalm block with an empty body, not null', () => {
    const psalm = readings[1] as ReadingBlock;
    expect(psalm.citation).toBe('Psalm 84:9-10, 11-12, 13-14');
    expect(psalm.summary).toBeNull();
    expect(psalm.html).toBe('');
  });

  it('never lets page chrome (the Christian Art blurb, rubric nav) leak into the last reading', () => {
    const gospel = readings[3] as ReadingBlock;
    expect(gospel.html).not.toMatch(/Christian Art/i);
    expect(gospel.html).not.toMatch(/view this page in Greek/i);
    expect(gospel.html).not.toMatch(/unrelated blurb/i);
  });
});
