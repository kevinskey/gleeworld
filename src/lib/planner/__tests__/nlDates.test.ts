import { describe, expect, it } from 'vitest';
import { parseSchedule, parseTime } from '../nlDates';

// Saturday, July 11, 2026
const NOW = new Date(2026, 6, 11, 10, 0, 0);

describe('parseTime', () => {
  it('parses common time shapes', () => {
    expect(parseTime('7 pm')).toBe('19:00');
    expect(parseTime('7:30pm')).toBe('19:30');
    expect(parseTime('19:00')).toBe('19:00');
    expect(parseTime('12 am')).toBe('00:00');
    expect(parseTime('12pm')).toBe('12:00');
  });
  it('rejects bare ambiguous numbers', () => {
    expect(parseTime('7')).toBeNull();
  });
});

describe('parseSchedule — single dates', () => {
  it('today / tomorrow / yesterday', () => {
    expect(parseSchedule('today', NOW).date).toBe('2026-07-11');
    expect(parseSchedule('Tomorrow', NOW).date).toBe('2026-07-12');
    expect(parseSchedule('yesterday', NOW).date).toBe('2026-07-10');
  });

  it('tonight implies an evening time', () => {
    const p = parseSchedule('tonight', NOW);
    expect(p.date).toBe('2026-07-11');
    expect(p.time).toBe('19:00');
  });

  it('weekday names mean the upcoming occurrence', () => {
    expect(parseSchedule('friday', NOW).date).toBe('2026-07-17');
    expect(parseSchedule('next friday', NOW).date).toBe('2026-07-17');
    // typed on a Saturday, "saturday" = next week's
    expect(parseSchedule('saturday', NOW).date).toBe('2026-07-18');
  });

  it('relative offsets', () => {
    expect(parseSchedule('in 3 days', NOW).date).toBe('2026-07-14');
    expect(parseSchedule('in 2 weeks', NOW).date).toBe('2026-07-25');
    expect(parseSchedule('next week', NOW).date).toBe('2026-07-18');
  });

  it('month-day forms roll forward past dates to next year', () => {
    expect(parseSchedule('October 17', NOW).date).toBe('2026-10-17');
    expect(parseSchedule('oct 17, 2027', NOW).date).toBe('2027-10-17');
    expect(parseSchedule('March 1', NOW).date).toBe('2027-03-01');
  });

  it('ISO and slash dates', () => {
    expect(parseSchedule('2026-10-17', NOW).date).toBe('2026-10-17');
    expect(parseSchedule('10/17', NOW).date).toBe('2026-10-17');
    expect(parseSchedule('10/17/27', NOW).date).toBe('2027-10-17');
  });

  it('extracts "at <time>"', () => {
    const p = parseSchedule('October 17 at 7 PM', NOW);
    expect(p.date).toBe('2026-10-17');
    expect(p.time).toBe('19:00');
  });
});

describe('parseSchedule — recurrences', () => {
  it('every monday', () => {
    const p = parseSchedule('every monday', NOW);
    expect(p.recurrence).toEqual({ freq: 'weekly', byweekday: [1] });
    expect(p.date).toBe('2026-07-13');
  });

  it('every weekday', () => {
    const p = parseSchedule('every weekday', NOW);
    expect(p.recurrence?.byweekday).toEqual([1, 2, 3, 4, 5]);
  });

  it('daily / monthly', () => {
    expect(parseSchedule('every day', NOW).recurrence).toEqual({ freq: 'daily' });
    expect(parseSchedule('monthly', NOW).recurrence).toEqual({ freq: 'monthly' });
  });
});

describe('parseSchedule — misses are explicit', () => {
  it('returns matched:false for unrecognized text', () => {
    const p = parseSchedule('two days before the concert', NOW);
    expect(p.matched).toBe(false);
    expect(p.date).toBeNull();
  });
});
