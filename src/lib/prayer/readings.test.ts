import { describe, it, expect } from 'vitest';
import { normalizeReadingsDay } from './readings';

// Shape confirmed against all 365 days of the 2026 dataset: flat, all-string
// values, exactly four possible slots, no gospel_acclamation.
const sunday = {
  date: '2026-03-01',
  monthDay: '3/1',
  season: 'Lent',
  readings: {
    firstReading: 'Genesis 12:1-4a',
    psalm: 'Psalm 33:4-5, 18-19, 20, 22.',
    secondReading: '2 Timothy 1:8b-10',
    gospel: 'Matthew 17:1-9',
  },
  usccbLink: 'https://bible.usccb.org/bible/readings/030126.cfm',
};

const weekday = {
  date: '2026-07-07',
  monthDay: '7/7',
  season: 'Ordinary Time',
  readings: {
    firstReading: 'Hosea 8:4-7, 11-13',
    psalm: 'Psalm 115:3-4, 5-6, 7ab-8, 9-10',
    gospel: 'Matthew 9:32-38',
  },
};

describe('normalizeReadingsDay', () => {
  it('maps upstream camelCase slots to canonical liturgical slot names', () => {
    const day = normalizeReadingsDay(sunday);
    expect(day.dayDate).toBe('2026-03-01');
    expect(day.readings.map((r) => r.slot)).toEqual([
      'first_reading',
      'responsorial_psalm',
      'second_reading',
      'gospel',
    ]);
    expect(day.readings.map((r) => r.citation)).toEqual([
      'Genesis 12:1-4a',
      'Psalm 33:4-5, 18-19, 20, 22.',
      '2 Timothy 1:8b-10',
      'Matthew 17:1-9',
    ]);
  });

  it('orders slots liturgically even when secondReading is absent', () => {
    const day = normalizeReadingsDay(weekday);
    expect(day.readings.map((r) => r.slot)).toEqual([
      'first_reading',
      'responsorial_psalm',
      'gospel',
    ]);
    // sortOrder must be contiguous from 0 so the UI can render in order.
    expect(day.readings.map((r) => r.sortOrder)).toEqual([0, 1, 2]);
  });

  it('tags every reading with its source for attribution', () => {
    const day = normalizeReadingsDay(weekday);
    expect(new Set(day.readings.map((r) => r.source))).toEqual(
      new Set(['catholic-readings-api']),
    );
  });

  it('drops blank and missing citations', () => {
    const day = normalizeReadingsDay({
      date: '2026-04-05',
      season: 'Holy Week',
      readings: { firstReading: '   ', psalm: 'Psalm 22', gospel: 'Mark 15' },
    });
    expect(day.readings.map((r) => r.slot)).toEqual(['responsorial_psalm', 'gospel']);
  });

  it('ignores unknown upstream keys rather than importing them as slots', () => {
    const day = normalizeReadingsDay({
      date: '2026-01-01',
      season: 'Christmas',
      readings: { gospel: 'Luke 2:16-21', somethingNew: 'Isaiah 1:1' },
    });
    expect(day.readings.map((r) => r.slot)).toEqual(['gospel']);
  });

  it('returns no readings when the payload has none', () => {
    expect(normalizeReadingsDay({ date: '2026-01-02', season: 'Christmas' }).readings).toEqual([]);
  });
});
