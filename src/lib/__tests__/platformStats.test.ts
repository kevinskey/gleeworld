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

  it('drops object, array, boolean, and null values', () => {
    expect(formatPlatformStats({ nested: { a: 1 }, list: [1], flag: true, missing: null, ok: 3 })).toEqual([
      { label: 'ok', value: '3' },
    ]);
  });

  it('returns [] for undefined or non-object input', () => {
    expect(formatPlatformStats(undefined)).toEqual([]);
    expect(formatPlatformStats('x')).toEqual([]);
  });
});
