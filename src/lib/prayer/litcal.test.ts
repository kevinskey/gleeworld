import { describe, it, expect } from 'vitest';
import { normalizeLitCalYear } from './litcal';

const sundayEvent = {
  event_key: 'Advent1',
  name: 'First Sunday of Advent',
  color: ['purple'],
  grade: 6,
  grade_lcl: 'Sunday',
  date: '2025-11-30T00:00:00+00:00',
  liturgical_season: 'ADVENT',
  liturgical_year: 'YEAR A',
  psalter_week: 1,
  readings: {
    first_reading: 'Isaiah 2:1-5',
    responsorial_psalm: 'Psalm 122: 1-2, 3-4, 4-5, 6-7, 8-9',
    second_reading: 'Romans 13:11-14',
    gospel_acclamation: 'Cf. Psalm 85:8',
    gospel: 'Matthew 24:37-44',
  },
};

// LitCal returns a plain STRING here, not a dict — 21 events per year do.
const commonEvent = {
  event_key: 'SatMemBVM1',
  name: 'Saturday Memorial of the BVM',
  color: ['white'],
  grade: 1,
  date: '2025-12-06T00:00:00+00:00',
  liturgical_season: 'ADVENT',
  psalter_week: 1,
  readings: 'From the Common of the Blessed Virgin Mary',
};

const emptyEvent = { ...commonEvent, event_key: 'ThursdayAfterAshWednesday', readings: '' };

describe('normalizeLitCalYear', () => {
  it('maps the five common reading slots with stable sort order', () => {
    const [day] = normalizeLitCalYear({ litcal: [sundayEvent] });
    expect(day.dayDate).toBe('2025-11-30');
    expect(day.sundayCycle).toBe('A');
    expect(day.liturgicalSeason).toBe('ADVENT');
    expect(day.readings.map((r) => r.slot)).toEqual([
      'first_reading',
      'responsorial_psalm',
      'second_reading',
      'gospel_acclamation',
      'gospel',
    ]);
    expect(day.readings[0]).toEqual({
      slot: 'first_reading',
      citation: 'Isaiah 2:1-5',
      schemaLabel: '',
      sortOrder: 0,
    });
  });

  it('keeps a string-valued readings field as a single note slot', () => {
    const [day] = normalizeLitCalYear({ litcal: [commonEvent] });
    expect(day.readings).toEqual([
      {
        slot: 'note',
        citation: 'From the Common of the Blessed Virgin Mary',
        schemaLabel: '',
        sortOrder: 0,
      },
    ]);
  });

  it('produces no readings for an empty string', () => {
    const [day] = normalizeLitCalYear({ litcal: [emptyEvent] });
    expect(day.readings).toEqual([]);
  });

  it('derives the Sunday cycle letter from "YEAR A" style values', () => {
    const [a] = normalizeLitCalYear({ litcal: [{ ...sundayEvent, liturgical_year: 'YEAR C' }] });
    expect(a.sundayCycle).toBe('C');
    const [b] = normalizeLitCalYear({ litcal: [{ ...sundayEvent, liturgical_year: undefined }] });
    expect(b.sundayCycle).toBeNull();
  });

  // Christmas, Easter Vigil and Pentecost Vigil carry alternative reading sets.
  // These must survive import even though they are not in the canonical five.
  it('imports uncommon slots after the canonical ones without dropping them', () => {
    const easterVigil = {
      ...sundayEvent,
      event_key: 'EasterVigil',
      readings: {
        first_reading: 'Genesis 1:1—2:2',
        third_reading: 'Exodus 14:15—15:1',
        epistle: 'Romans 6:3-11',
        gospel: 'Matthew 28:1-10',
      },
    };
    const [day] = normalizeLitCalYear({ litcal: [easterVigil] });
    expect(day.readings.map((r) => r.slot)).toEqual([
      'first_reading',
      'gospel',
      'third_reading',
      'epistle',
    ]);
    expect(day.readings.map((r) => r.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('drops blank citations inside an otherwise populated dict', () => {
    const partial = {
      ...sundayEvent,
      readings: { first_reading: 'Isaiah 2:1-5', second_reading: '   ', gospel: 'Matthew 24:37-44' },
    };
    const [day] = normalizeLitCalYear({ litcal: [partial] });
    expect(day.readings.map((r) => r.slot)).toEqual(['first_reading', 'gospel']);
  });

  it('returns an empty array for an empty payload', () => {
    expect(normalizeLitCalYear({ litcal: [] })).toEqual([]);
  });

  // Christmas nests three complete Mass formularies under night/dawn/day, and
  // the Pentecost Vigil nests schema_one/two/three. Flattening these into
  // schemaLabel is the whole reason gw_prayer_readings has that column — an
  // earlier version dropped them silently and lost Christmas entirely.
  it('flattens nested formularies into schemaLabel instead of dropping them', () => {
    const christmas = {
      ...sundayEvent,
      event_key: 'Christmas',
      readings: {
        night: { first_reading: 'Isaiah 9:1-6', gospel: 'Luke 2:1-14' },
        dawn: { first_reading: 'Isaiah 62:11-12', gospel: 'Luke 2:15-20' },
        day: { first_reading: 'Isaiah 52:7-10', gospel_acclamation: '', gospel: 'John 1:1-18' },
      },
    };
    const [day] = normalizeLitCalYear({ litcal: [christmas] });

    expect(day.readings).toHaveLength(6);
    expect([...new Set(day.readings.map((r) => r.schemaLabel))]).toEqual(['night', 'dawn', 'day']);

    const night = day.readings.filter((r) => r.schemaLabel === 'night');
    expect(night.map((r) => r.slot)).toEqual(['first_reading', 'gospel']);
    expect(night.map((r) => r.sortOrder)).toEqual([0, 1]);

    // Blank citations are dropped inside a nested formulary too.
    expect(day.readings.filter((r) => r.schemaLabel === 'day').map((r) => r.slot)).toEqual([
      'first_reading',
      'gospel',
    ]);
  });

  // The Easter Vigil gives long|short alternatives in a single citation string.
  // Phase 0 stores them verbatim; splitting for display is a Phase 1 concern.
  it('preserves pipe-separated alternative citations verbatim', () => {
    const vigil = {
      ...sundayEvent,
      event_key: 'EasterVigil',
      readings: { first_reading: 'Genesis 1:1-2:2|Genesis 1:1,26-31a' },
    };
    const [day] = normalizeLitCalYear({ litcal: [vigil] });
    expect(day.readings[0].citation).toBe('Genesis 1:1-2:2|Genesis 1:1,26-31a');
  });

  // 28-50% of dates per year come back with every citation blank. These must
  // normalise to zero readings so the importer can report the gap rather than
  // writing empty-string rows.
  it('produces no readings when every citation in the dict is blank', () => {
    const ferial = {
      ...sundayEvent,
      event_key: 'OrdWeekday12Thursday',
      readings: { first_reading: '', responsorial_psalm: '', gospel_acclamation: '', gospel: '' },
    };
    const [day] = normalizeLitCalYear({ litcal: [ferial] });
    expect(day.readings).toEqual([]);
  });
});
