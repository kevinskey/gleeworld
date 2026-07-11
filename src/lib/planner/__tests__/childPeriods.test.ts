import { describe, expect, it } from 'vitest';
import { childPeriods } from '../dateKeys';

const NOW = new Date(2026, 6, 11); // Sat Jul 11 2026 (W28, Q3)

describe('childPeriods', () => {
  it('a week yields its seven days, flagging today', () => {
    const days = childPeriods('2026-W28', 'weekly', NOW);
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ key: '2026-07-06', type: 'daily', label: 'Mon 6' });
    expect(days[5]).toMatchObject({ key: '2026-07-11', isCurrent: true });
  });

  it('a month yields its ISO weeks including partial edges', () => {
    const weeks = childPeriods('2026-07', 'monthly', NOW);
    expect(weeks.map((w) => w.label)).toEqual(['W27', 'W28', 'W29', 'W30', 'W31']);
    expect(weeks.find((w) => w.key === '2026-W28')?.isCurrent).toBe(true);
  });

  it('a quarter yields three months, a year four quarters', () => {
    expect(childPeriods('2026-Q3', 'quarterly', NOW).map((m) => m.label)).toEqual(['Jul', 'Aug', 'Sep']);
    const quarters = childPeriods('2026', 'yearly', NOW);
    expect(quarters.map((q) => q.key)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
    expect(quarters[2].isCurrent).toBe(true);
  });

  it('a day has no children', () => {
    expect(childPeriods('2026-07-11', 'daily', NOW)).toEqual([]);
  });
});
