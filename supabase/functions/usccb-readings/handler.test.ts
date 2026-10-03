import { describe, it, expect } from 'vitest';
import { buildReadingsResponse, type PrayerDayFull } from './handler';

const SOURCE_URL = 'https://gleeworld.org/prayer?date=2026-03-01';

function dayWith(events: PrayerDayFull['events']): PrayerDayFull {
  return {
    date: '2026-03-01',
    rite: 'roman_catholic',
    translation: 'WEBCE',
    attribution: 'World English Bible (Catholic Edition). Public domain. Source: eBible.org.',
    events,
  };
}

describe('buildReadingsResponse', () => {
  it('maps the highest-ranked event and humanizes known slots', () => {
    const day = dayWith([
      {
        event_key: 'TestFeria',
        name: 'Test Feria',
        rank_grade: 3,
        readings: [
          {
            slot: 'first_reading',
            citation: 'Isaiah 2:1-2',
            schema_label: '',
            source: 'catholic-readings-api',
            verses: [
              { chapter: 2, verse: 1, text: 'This is what Isaiah saw.' },
              { chapter: 2, verse: 2, text: 'It shall happen in the latter days.' },
            ],
          },
          {
            slot: 'gospel',
            citation: 'Matthew 24:37-44',
            schema_label: '',
            source: 'catholic-readings-api',
            verses: [],
          },
        ],
      },
    ]);

    const resp = buildReadingsResponse(day, SOURCE_URL);

    expect(resp.date).toBe('2026-03-01');
    expect(resp.sourceUrl).toBe(SOURCE_URL);
    expect(resp.liturgicalTitle).toBe('Test Feria');
    expect(resp.attribution).toBe(day.attribution);
    expect(resp.readings).toHaveLength(2);
    expect(resp.readings[0]).toEqual({
      heading: 'First Reading',
      citation: 'Isaiah 2:1-2',
      summary: null,
      html: '<p><sup>1</sup> This is what Isaiah saw.</p><p><sup>2</sup> It shall happen in the latter days.</p>',
    });
  });

  it('renders the Responsorial Psalm body instead of leaving it citation-only', () => {
    // This is the user-visible win the old Universalis scrape could not
    // deliver: it stripped the psalm body, so directors pasted verses by hand.
    const day = dayWith([
      {
        event_key: 'TestSunday',
        name: 'Test Sunday',
        rank_grade: 6,
        readings: [
          {
            slot: 'responsorial_psalm',
            citation: 'Psalm 23:1-2',
            schema_label: '',
            source: 'catholic-readings-api',
            verses: [
              { chapter: 23, verse: 1, text: 'The LORD is my shepherd.' },
              { chapter: 23, verse: 2, text: 'He makes me lie down in green pastures.' },
            ],
          },
        ],
      },
    ]);

    const resp = buildReadingsResponse(day, SOURCE_URL);
    expect(resp.readings[0].heading).toBe('Responsorial Psalm');
    expect(resp.readings[0].html).toContain('The LORD is my shepherd.');
  });

  it('humanizes an unlisted slot (rare vigil schemas) rather than dropping it', () => {
    const day = dayWith([
      {
        event_key: 'EasterVigil',
        name: 'Easter Vigil',
        rank_grade: 7,
        readings: [
          {
            slot: 'third_reading',
            citation: 'Exodus 14:15-15:1',
            schema_label: 'schema_one',
            source: 'catholic-readings-api',
            verses: [],
          },
        ],
      },
    ]);

    expect(buildReadingsResponse(day, SOURCE_URL).readings[0].heading).toBe('Third Reading');
  });

  it('gives an unresolved reading an empty html body, not an error', () => {
    const day = dayWith([
      {
        event_key: 'SatMemBVM1',
        name: 'Saturday Memorial of the BVM',
        rank_grade: 1,
        readings: [
          {
            slot: 'note',
            citation: 'From the Common of the Blessed Virgin Mary',
            schema_label: '',
            source: 'catholic-readings-api',
            verses: [],
          },
        ],
      },
    ]);

    const resp = buildReadingsResponse(day, SOURCE_URL);
    expect(resp.readings[0].html).toBe('');
    expect(resp.readings[0].citation).toBe('From the Common of the Blessed Virgin Mary');
  });

  it('HTML-escapes verse text', () => {
    const day = dayWith([
      {
        event_key: 'T',
        name: 'T',
        rank_grade: 1,
        readings: [
          {
            slot: 'gospel',
            citation: 'Test 1:1',
            schema_label: '',
            source: 'catholic-readings-api',
            verses: [{ chapter: 1, verse: 1, text: `He said, "Love <one another>" & rejoice.` }],
          },
        ],
      },
    ]);

    const html = buildReadingsResponse(day, SOURCE_URL).readings[0].html;
    expect(html).toBe('<p><sup>1</sup> He said, &quot;Love &lt;one another&gt;&quot; &amp; rejoice.</p>');
  });

  it('returns null title and empty readings for a date with no events', () => {
    const resp = buildReadingsResponse(dayWith([]), SOURCE_URL);
    expect(resp.liturgicalTitle).toBeNull();
    expect(resp.readings).toEqual([]);
  });
});
