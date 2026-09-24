import { describe, it, expect } from 'vitest';
import {
  humanizeSlot,
  escapeHtml,
  renderVersesHtml,
  buildReadingsResponse,
  type ReadingInput,
} from './formatResponse';

// Pins the usccb-readings response contract deployed iOS clients depend on:
// { date, sourceUrl, liturgicalTitle, readings: [{heading, citation, summary, html}] }.
// Phase 1 plan (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 4,
// Step 1: this must hold identically whether the data comes from a scrape or
// (as of this change) our own prayer_day / prayer_reading_text RPCs.
describe('usccb-readings response contract', () => {
  it('maps the five common slots to their display headings', () => {
    expect(humanizeSlot('first_reading')).toBe('First Reading');
    expect(humanizeSlot('responsorial_psalm')).toBe('Responsorial Psalm');
    expect(humanizeSlot('second_reading')).toBe('Second Reading');
    expect(humanizeSlot('gospel_acclamation')).toBe('Gospel Acclamation');
    expect(humanizeSlot('gospel')).toBe('Gospel');
  });

  it('falls back to title-casing an unrecognised slot rather than throwing', () => {
    expect(humanizeSlot('third_reading')).toBe('Third Reading');
    expect(humanizeSlot('some_new_slot')).toBe('Some New Slot');
  });

  it('escapes all five HTML metacharacters', () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quotes"`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;',
    );
  });

  it('renders verses as escaped p/sup markup with no chapter marker for a single chapter', () => {
    const html = renderVersesHtml(
      [
        { chapter: 23, verse: 1, text: 'The LORD is my shepherd.' },
        { chapter: 23, verse: 2, text: 'He makes <me> lie down.' },
      ],
      'World English Bible. Public domain.',
    );
    expect(html).toBe(
      '<p><sup>1</sup> The LORD is my shepherd.</p>' +
        '<p><sup>2</sup> He makes &lt;me&gt; lie down.</p>' +
        '<p><em>World English Bible. Public domain.</em></p>',
    );
  });

  it('inserts a chapter marker only at a chapter boundary', () => {
    const html = renderVersesHtml(
      [
        { chapter: 7, verse: 59, text: 'They stoned Stephen.' },
        { chapter: 7, verse: 60, text: 'He fell asleep.' },
        { chapter: 8, verse: 1, text: 'Saul approved.' },
      ],
      null,
    );
    expect(html).toBe(
      '<p><sup>59</sup> They stoned Stephen.</p>' +
        '<p><sup>60</sup> He fell asleep.</p>' +
        '<p><strong>Chapter 8</strong></p>' +
        '<p><sup>1</sup> Saul approved.</p>',
    );
  });

  it('renders an empty string, not a bare attribution, when there are no verses', () => {
    expect(renderVersesHtml([], 'Some attribution')).toBe('');
  });

  it('builds the exact contract shape for a normal day', () => {
    const readings: ReadingInput[] = [
      {
        slot: 'first_reading',
        citation: 'Isaiah 2:1-5',
        schemaLabel: '',
        verses: [{ chapter: 2, verse: 1, text: 'In the latter days...' }],
        attribution: 'WEB. Public domain.',
      },
      {
        slot: 'gospel',
        citation: 'Matthew 24:37-44',
        schemaLabel: '',
        verses: [],
        attribution: null,
      },
    ];
    const resp = buildReadingsResponse('2026-08-04', 'https://ebible.org/', 'Some Feast', readings);

    expect(resp).toEqual({
      date: '2026-08-04',
      sourceUrl: 'https://ebible.org/',
      liturgicalTitle: 'Some Feast',
      readings: [
        {
          heading: 'First Reading',
          citation: 'Isaiah 2:1-5',
          summary: null,
          html: '<p><sup>1</sup> In the latter days...</p><p><em>WEB. Public domain.</em></p>',
        },
        {
          heading: 'Gospel',
          citation: 'Matthew 24:37-44',
          summary: null,
          html: '',
        },
      ],
    });
    // summary is never fabricated — Task 4 is explicit that there is no
    // equivalent of Universalis's scraped <h4> title line in our own data.
    for (const r of resp.readings) expect(r.summary).toBeNull();
  });

  it('appends a parenthetical schema label for Christmas/Pentecost-Vigil style formularies', () => {
    const resp = buildReadingsResponse('2026-12-25', 'https://ebible.org/', 'The Nativity of the Lord', [
      { slot: 'gospel', citation: 'John 1:1-18', schemaLabel: 'day', verses: [], attribution: null },
    ]);
    expect(resp.readings[0].heading).toBe('Gospel (Day)');
  });

  it('returns an empty readings array for a date with no events, never null or undefined', () => {
    const resp = buildReadingsResponse('1900-01-01', 'https://ebible.org/', null, []);
    expect(resp).toEqual({
      date: '1900-01-01',
      sourceUrl: 'https://ebible.org/',
      liturgicalTitle: null,
      readings: [],
    });
  });
});
