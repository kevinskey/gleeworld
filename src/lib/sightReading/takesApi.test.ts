// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readLocalTakes, rowToTake, aggregateClassProgress } from './takesApi';

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

describe('aggregateClassProgress', () => {
  const takes = [
    { user_id: 'a', overall: 90, created_at: '2026-07-10T00:00:00.000Z' },
    { user_id: 'a', overall: 70, created_at: '2026-07-09T00:00:00.000Z' },
    { user_id: 'b', overall: 80, created_at: '2026-07-11T00:00:00.000Z' },
  ];

  it('groups by student, rolls up count/best/avg/last, sorts most-recent first', () => {
    const profiles = [
      { user_id: 'a', full_name: 'Ann Smith', display_name: null, first_name: null, last_name: null, email: null },
    ];
    const r = aggregateClassProgress(takes, profiles);
    // b practiced latest → first; a has no display_name so full_name is used.
    expect(r.map((s) => s.userId)).toEqual(['b', 'a']);
    expect(r[1]).toEqual({
      userId: 'a', name: 'Ann Smith', takes: 2, best: 90, avg: 80,
      lastTs: new Date('2026-07-10T00:00:00.000Z').getTime(),
    });
  });

  it('falls back to "Student" when a take has no matching profile', () => {
    const r = aggregateClassProgress(takes, []);
    expect(r.every((s) => s.name === 'Student')).toBe(true);
  });

  it('prefers display_name, then email, over other name fields', () => {
    const r = aggregateClassProgress(
      [{ user_id: 'x', overall: 60, created_at: '2026-07-10T00:00:00.000Z' }],
      [{ user_id: 'x', full_name: 'Full Name', display_name: 'Nickname', first_name: 'F', last_name: 'L', email: 'x@y.z' }],
    );
    expect(r[0].name).toBe('Nickname');
  });
});
