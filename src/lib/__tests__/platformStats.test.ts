import { describe, it, expect } from 'vitest';
import { formatPlatformStats } from '../platformStats';

describe('formatPlatformStats', () => {
  it('keeps number and string entries and prettifies snake_case labels', () => {
    expect(formatPlatformStats({ total_tenants: 12, active_tenants: 9, newest: 'eastside' })).toEqual([
      { label: 'total tenants', value: '12' },
      { label: 'active tenants', value: '9' },
      { label: 'newest', value: 'eastside' },
    ]);
  });

  it('hoists scalar values from one level of nesting with combined labels', () => {
    expect(formatPlatformStats({ nested: { a: 1, b: 'text' } })).toEqual([
      { label: 'nested a', value: '1' },
      { label: 'nested b', value: 'text' },
    ]);
  });

  it('drops object, array, boolean, null values, and deeper nesting', () => {
    expect(formatPlatformStats({
      nested: { a: 1, deep: { b: 2 }, arr: [1], flag: true, missing: null },
      ok: 3,
    })).toEqual([
      { label: 'nested a', value: '1' },
      { label: 'ok', value: '3' },
    ]);
  });

  it('formats _cents keys as currency and strips the suffix', () => {
    expect(formatPlatformStats({
      top_level_cents: 150000,
      revenue: { mrr_cents: 150000, arr_cents: 1800000, active_subs: 30 },
    })).toEqual([
      { label: 'top level', value: '$1,500' },
      { label: 'revenue mrr', value: '$1,500' },
      { label: 'revenue arr', value: '$18,000' },
      { label: 'revenue active subs', value: '30' },
    ]);
  });

  it('handles the real nested stats response shape', () => {
    const realStats = {
      customers: { total: 42, active: 35, trial: 5, suspended: 2, new_this_month: 8 },
      revenue: { mrr_cents: 150000, arr_cents: 1800000, active_subs: 30, trialing_subs: 5 },
      modules: { total: 12, with_price: 8 },
    };
    const result = formatPlatformStats(realStats);
    // Should flatten and format all nested scalars
    expect(result).toContainEqual({ label: 'customers total', value: '42' });
    expect(result).toContainEqual({ label: 'customers active', value: '35' });
    expect(result).toContainEqual({ label: 'revenue mrr', value: '$1,500' });
    expect(result).toContainEqual({ label: 'revenue arr', value: '$18,000' });
    expect(result).toContainEqual({ label: 'revenue active subs', value: '30' });
    expect(result).toContainEqual({ label: 'modules total', value: '12' });
    expect(result.length).toBe(11);
  });

  it('returns [] for undefined or non-object input', () => {
    expect(formatPlatformStats(undefined)).toEqual([]);
    expect(formatPlatformStats('x')).toEqual([]);
  });
});
