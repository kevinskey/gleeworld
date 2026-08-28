import { describe, it, expect, vi } from 'vitest';
import { fetchPrayerDayFull, type RpcClient } from './prayerDayFull';

function mockClient(handlers: Record<string, (args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }>): RpcClient {
  return {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      const handler = handlers[fn];
      if (!handler) throw new Error(`unexpected rpc call: ${fn}`);
      return handler(args);
    }),
  };
}

const oneReadingDay = {
  date: '2025-11-30',
  rite: 'roman_catholic',
  events: [
    {
      event_key: 'Advent1',
      name: 'First Sunday of Advent',
      rank_grade: 6,
      rank_label: 'Sunday',
      color: ['purple'],
      liturgical_season: 'ADVENT',
      sunday_cycle: 'A',
      psalter_week: 1,
      is_holy_day_of_obligation: false,
      readings: [
        { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
        { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
      ],
    },
  ],
};

describe('fetchPrayerDayFull', () => {
  it('resolves each reading to verse text via prayer_reading_text', async () => {
    const client = mockClient({
      prayer_day: () => ({ data: oneReadingDay, error: null }),
      prayer_reading_text: (args) => ({
        data: {
          translation: 'WEBCE',
          attribution: 'World English Bible (Catholic). Public domain.',
          verses:
            args.p_usfm === 'ISA'
              ? [{ chapter: 2, verse: 1, text: 'This is what Isaiah saw.' }]
              : [{ chapter: 24, verse: 37, text: 'As the days of Noah were.' }],
        },
        error: null,
      }),
    });

    const result = await fetchPrayerDayFull(client, '2025-11-30');

    expect(result.date).toBe('2025-11-30');
    expect(result.events).toHaveLength(1);
    const event = result.events[0];
    expect(event.name).toBe('First Sunday of Advent');
    expect(event.sundayCycle).toBe('A');
    expect(event.readings).toHaveLength(2);

    expect(event.readings[0]).toMatchObject({
      slot: 'first_reading',
      citation: 'Isaiah 2:1-5',
      usfmCode: 'ISA',
      attribution: 'World English Bible (Catholic). Public domain.',
    });
    expect(event.readings[0].verses).toEqual([{ chapter: 2, verse: 1, text: 'This is what Isaiah saw.' }]);
    expect(event.readings[1].usfmCode).toBe('MAT');
    expect(event.readings[1].verses[0].text).toBe('As the days of Noah were.');

    expect(client.rpc).toHaveBeenCalledWith('prayer_day', { p_date: '2025-11-30', p_rite: 'roman_catholic' });
    expect(client.rpc).toHaveBeenCalledWith('prayer_reading_text', {
      p_translation: 'WEBCE',
      p_usfm: 'ISA',
      p_ranges: [{ startChapter: 2, startVerse: 1, endChapter: 2, endVerse: 5 }],
    });
  });

  it('skips the verse lookup for an unresolvable citation instead of calling the RPC', async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === 'prayer_day') {
        return {
          data: {
            date: '2025-12-06',
            rite: 'roman_catholic',
            events: [
              {
                event_key: 'SatMemBVM1',
                name: 'Saturday Memorial of the BVM',
                rank_grade: 1,
                rank_label: 'Memorial',
                color: ['white'],
                liturgical_season: 'ADVENT',
                sunday_cycle: null,
                psalter_week: 1,
                is_holy_day_of_obligation: false,
                readings: [{ slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' }],
              },
            ],
          },
          error: null,
        };
      }
      throw new Error(`unexpected rpc call: ${fn}`);
    });

    const result = await fetchPrayerDayFull({ rpc }, '2025-12-06');

    expect(result.events[0].readings[0]).toMatchObject({
      usfmCode: null,
      verses: [],
      attribution: null,
    });
    // Only prayer_day was called — no attempt to resolve an unparseable citation.
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('propagates a prayer_day RPC error', async () => {
    const client = mockClient({
      prayer_day: () => ({ data: null, error: { message: 'boom' } }),
    });
    await expect(fetchPrayerDayFull(client, '2025-11-30')).rejects.toThrow(/prayer_day: boom/);
  });

  it('propagates a prayer_reading_text RPC error, naming the citation', async () => {
    const client = mockClient({
      prayer_day: () => ({ data: oneReadingDay, error: null }),
      prayer_reading_text: () => ({ data: null, error: { message: 'db down' } }),
    });
    await expect(fetchPrayerDayFull(client, '2025-11-30')).rejects.toThrow(/Isaiah 2:1-5.*db down/);
  });

  it('returns an empty event list for a date with nothing imported, without calling prayer_reading_text', async () => {
    const rpc = vi.fn(async () => ({ data: { date: '1900-01-01', rite: 'roman_catholic', events: [] }, error: null }));
    const result = await fetchPrayerDayFull({ rpc }, '1900-01-01');
    expect(result.events).toEqual([]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
