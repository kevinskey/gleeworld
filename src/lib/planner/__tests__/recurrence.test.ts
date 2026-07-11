import { describe, expect, it } from 'vitest';
import { describeRecurrence, nextOccurrence, normalizeRecurrence } from '../recurrence';

describe('nextOccurrence', () => {
  it('daily and interval', () => {
    expect(nextOccurrence({ freq: 'daily' }, '2026-07-11', 0)).toBe('2026-07-12');
    expect(nextOccurrence({ freq: 'daily', interval: 3 }, '2026-07-11', 0)).toBe('2026-07-14');
  });

  it('weekly without byweekday', () => {
    expect(nextOccurrence({ freq: 'weekly' }, '2026-07-11', 0)).toBe('2026-07-18');
  });

  it('weekly with byweekday scans to the next allowed day', () => {
    // 2026-07-11 is a Saturday; next Mon/Wed is Monday the 13th
    expect(nextOccurrence({ freq: 'weekly', byweekday: [1, 3] }, '2026-07-11', 0)).toBe('2026-07-13');
    expect(nextOccurrence({ freq: 'weekly', byweekday: [1, 3] }, '2026-07-13', 1)).toBe('2026-07-15');
  });

  it('monthly and yearly', () => {
    expect(nextOccurrence({ freq: 'monthly' }, '2026-01-31', 0)).toBe('2026-02-28');
    expect(nextOccurrence({ freq: 'yearly' }, '2026-07-11', 0)).toBe('2027-07-11');
  });

  it('respects until', () => {
    expect(nextOccurrence({ freq: 'daily', until: '2026-07-12' }, '2026-07-12', 1)).toBeNull();
    expect(nextOccurrence({ freq: 'daily', until: '2026-07-13' }, '2026-07-12', 1)).toBe('2026-07-13');
  });

  it('respects count (occurrenceIndex is 0-based)', () => {
    expect(nextOccurrence({ freq: 'daily', count: 2 }, '2026-07-11', 0)).toBe('2026-07-12');
    expect(nextOccurrence({ freq: 'daily', count: 2 }, '2026-07-12', 1)).toBeNull();
  });
});

describe('normalizeRecurrence', () => {
  it('clamps interval and dedupes weekdays', () => {
    const r = normalizeRecurrence({ freq: 'weekly', interval: 0, byweekday: [5, 1, 5, 9] });
    expect(r.interval).toBe(1);
    expect(r.byweekday).toEqual([1, 5]);
  });
});

describe('describeRecurrence', () => {
  it('reads naturally', () => {
    expect(describeRecurrence({ freq: 'daily' })).toBe('Every day');
    expect(describeRecurrence({ freq: 'weekly', byweekday: [1, 2, 3, 4, 5] })).toBe('Every weekday');
    expect(describeRecurrence({ freq: 'weekly', byweekday: [1] })).toBe('Every week on Monday');
    expect(describeRecurrence({ freq: 'monthly', interval: 2 })).toBe('Every 2 months');
  });
});
