import { describe, expect, it } from 'vitest';
import { keyRange, keyTitle, keyToDate, parentPeriod, periodKey, shiftKey, typeOfKey } from '../dateKeys';

describe('periodKey', () => {
  const d = new Date(2026, 9, 17); // Sat Oct 17 2026
  it('formats all period types', () => {
    expect(periodKey(d, 'daily')).toBe('2026-10-17');
    expect(periodKey(d, 'weekly')).toBe('2026-W42');
    expect(periodKey(d, 'monthly')).toBe('2026-10');
    expect(periodKey(d, 'quarterly')).toBe('2026-Q4');
    expect(periodKey(d, 'yearly')).toBe('2026');
  });

  it('uses ISO week-year at year boundaries', () => {
    // Jan 1 2027 is a Friday, part of ISO week 53 of 2026
    expect(periodKey(new Date(2027, 0, 1), 'weekly')).toBe('2026-W53');
  });
});

describe('typeOfKey / keyToDate', () => {
  it('detects each key shape', () => {
    expect(typeOfKey('2026-10-17')).toBe('daily');
    expect(typeOfKey('2026-W42')).toBe('weekly');
    expect(typeOfKey('2026-10')).toBe('monthly');
    expect(typeOfKey('2026-Q4')).toBe('quarterly');
    expect(typeOfKey('2026')).toBe('yearly');
    expect(typeOfKey('garbage')).toBeNull();
  });

  it('roundtrips: keyToDate(periodKey(d)) starts the period containing d', () => {
    const d = new Date(2026, 9, 17);
    expect(periodKey(keyToDate('2026-W42', 'weekly')!, 'weekly')).toBe('2026-W42');
    expect(keyToDate(periodKey(d, 'daily'), 'daily')!.getDate()).toBe(17);
    expect(keyToDate('2026-Q4', 'quarterly')!.getMonth()).toBe(9);
  });

  it('rejects malformed keys', () => {
    expect(keyToDate('2026-13', 'monthly')).toBeNull();
    expect(keyToDate('2026-W99', 'weekly')).toBeNull();
  });
});

describe('shiftKey', () => {
  it('moves by delta periods', () => {
    expect(shiftKey('2026-10-17', 'daily', 1)).toBe('2026-10-18');
    expect(shiftKey('2026-10-17', 'daily', -17)).toBe('2026-09-30');
    expect(shiftKey('2026-W42', 'weekly', 1)).toBe('2026-W43');
    expect(shiftKey('2026-12', 'monthly', 1)).toBe('2027-01');
    expect(shiftKey('2026-Q4', 'quarterly', 1)).toBe('2027-Q1');
    expect(shiftKey('2026', 'yearly', -1)).toBe('2025');
  });
});

describe('keyRange', () => {
  it('covers the whole period inclusively', () => {
    const week = keyRange('2026-W42', 'weekly')!;
    expect(week.start.getDay()).toBe(1); // Monday
    expect(week.end.getDay()).toBe(0); // Sunday
    const month = keyRange('2026-02', 'monthly')!;
    expect(month.end.getDate()).toBe(28);
  });
});

describe('keyTitle / parentPeriod', () => {
  it('produces readable titles', () => {
    expect(keyTitle('2026-10-17', 'daily')).toBe('Saturday, October 17, 2026');
    expect(keyTitle('2026-W42', 'weekly')).toBe('Week 42, 2026');
    expect(keyTitle('2026-Q4', 'quarterly')).toBe('Q4 2026');
  });

  it('zooms out through the chain', () => {
    expect(parentPeriod('2026-10-17', 'daily')).toEqual({ key: '2026-W42', type: 'weekly' });
    expect(parentPeriod('2026-W42', 'weekly')).toEqual({ key: '2026-10', type: 'monthly' });
    expect(parentPeriod('2026', 'yearly')).toBeNull();
  });
});
