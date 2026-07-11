// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readLocalTakes, rowToTake } from './takesApi';

const KEY = 'gw_sight_reading_activity';
const entry = (overall: number, level: number, key: string, ts: number) => ({
  ts, kind: 'practiced', label: `${key} · ${overall}`, meta: { overall, level, key },
});

beforeEach(() => localStorage.clear());

describe('readLocalTakes', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readLocalTakes(KEY)).toEqual([]);
  });

  it('ignores malformed blobs instead of throwing', () => {
    localStorage.setItem(KEY, 'not json');
    expect(readLocalTakes(KEY)).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    expect(readLocalTakes(KEY)).toEqual([]);
  });

  it('keeps only well-formed practiced entries and flattens meta', () => {
    localStorage.setItem(KEY, JSON.stringify([
      entry(87, 2, 'C', 1000),
      { ts: 2000, kind: 'practiced', meta: { level: 3 } }, // no overall → dropped
      { ts: 3000, kind: 'other', meta: { overall: 50 } },  // wrong kind → dropped
    ]));
    const takes = readLocalTakes(KEY);
    expect(takes).toHaveLength(1);
    expect(takes[0]).toEqual({ ts: 1000, overall: 87, level: 2, musicKey: 'C' });
  });
});

describe('rowToTake', () => {
  it('maps a server row into the shared Take shape', () => {
    const r = rowToTake({ overall: 91, level: 3, exercise_key: 'G', created_at: '2026-07-10T00:00:00.000Z' });
    expect(r).toEqual({
      overall: 91, level: 3, musicKey: 'G',
      ts: new Date('2026-07-10T00:00:00.000Z').getTime(),
    });
  });

  it('turns null columns into undefined', () => {
    const r = rowToTake({ overall: 50, level: null, exercise_key: null, created_at: '2026-07-10T00:00:00.000Z' });
    expect(r.level).toBeUndefined();
    expect(r.musicKey).toBeUndefined();
  });
});
