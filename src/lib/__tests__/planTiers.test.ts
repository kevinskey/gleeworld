import { describe, it, expect } from 'vitest';
import {
  PLAN_TIERS,
  TENANT_PLAN_TIERS,
  DEFAULT_PLAN_TIER,
  formatPrice,
  type PlanTierId,
} from '../planTiers';

describe('PLAN_TIERS', () => {
  it('has all four tiers in table order', () => {
    expect(PLAN_TIERS).toHaveLength(4);
    expect(PLAN_TIERS.map((t) => t.id)).toEqual([
      'personal',
      'director_60',
      'director_150',
      'institution',
    ]);
  });
});

describe('TENANT_PLAN_TIERS', () => {
  it('excludes the user-scoped personal tier', () => {
    expect(TENANT_PLAN_TIERS).toHaveLength(3);
    expect(TENANT_PLAN_TIERS.every((t) => t.scope === 'tenant')).toBe(true);
    expect(TENANT_PLAN_TIERS.some((t) => t.id === 'personal')).toBe(false);
  });
});

describe('DEFAULT_PLAN_TIER', () => {
  it('is a tenant-scoped tier id', () => {
    expect(DEFAULT_PLAN_TIER).toBe('director_60');
    const tier = PLAN_TIERS.find((t) => t.id === DEFAULT_PLAN_TIER);
    expect(tier?.scope).toBe('tenant');
  });
});

describe('formatPrice', () => {
  it('formats cents into a display price', () => {
    expect(formatPrice(899)).toBe('$8.99');
    expect(formatPrice(3900)).toBe('$39');
    expect(formatPrice(19900)).toBe('$199');
    expect(formatPrice(39000)).toBe('$390');
  });
});

describe('lookup keys', () => {
  it('every tier has distinct, gw_-prefixed monthly/annual lookup keys', () => {
    const keys = PLAN_TIERS.flatMap((t) => [t.lookupKeyMonthly, t.lookupKeyAnnual]);
    expect(keys).toHaveLength(8);
    expect(new Set(keys).size).toBe(8);
    for (const key of keys) {
      expect(key.startsWith('gw_')).toBe(true);
    }
  });
});

describe('billing contract — values that must match gw_billing_plans', () => {
  // Source of truth for PRICES and CAPS is the newest pricing migration,
  // supabase/migrations/20260720140000_tier_price_round.sql, which supersedes
  // the original Task 3 seed and 20260720130000_tier_price_update.sql.
  //
  // Deliberately narrow: this asserts the fields that must agree with the
  // billing table, so a repricing that touches only one side fails here.
  // Marketing copy (tagline, feature bullets) is intentionally NOT asserted —
  // pinning it made this suite fail on every copy edit without protecting
  // anything, which is exactly how it drifted four migrations out of date.
  const EXPECTED = [
    { id: 'personal',     scope: 'user',   label: 'Personal',  monthlyCents: 1500,  annualCents: 13500,  studentCap: 15,   storageGb: 25 },
    { id: 'director_60',  scope: 'tenant', label: 'Director',  monthlyCents: 5000,  annualCents: 50000,  studentCap: 60,   storageGb: 50 },
    { id: 'director_150', scope: 'tenant', label: 'Director+', monthlyCents: 6500,  annualCents: 65000,  studentCap: 150,  storageGb: 150 },
    { id: 'institution',  scope: 'tenant', label: 'Institution', monthlyCents: 25000, annualCents: 250000, studentCap: null, storageGb: 1024 },
  ] as const;

  it.each(EXPECTED)('$id matches the billing migration', (expected) => {
    const t = PLAN_TIERS.find((p) => p.id === expected.id)!;
    expect(t, `tier ${expected.id} missing from PLAN_TIERS`).toBeDefined();
    expect(t.scope).toBe(expected.scope);
    expect(t.monthlyCents).toBe(expected.monthlyCents);
    expect(t.annualCents).toBe(expected.annualCents);
    expect(t.studentCap).toBe(expected.studentCap);
    expect(t.storageGb).toBe(expected.storageGb);
  });

  it('every tier carries both Stripe lookup keys', () => {
    for (const t of PLAN_TIERS) {
      expect(t.lookupKeyMonthly, `${t.id} monthly lookup key`).toBeTruthy();
      expect(t.lookupKeyAnnual, `${t.id} annual lookup key`).toBeTruthy();
    }
  });

  it('annual pricing never costs more than paying monthly for a year', () => {
    for (const t of PLAN_TIERS) {
      expect(t.annualCents, `${t.id} annual should not exceed 12x monthly`)
        .toBeLessThanOrEqual(t.monthlyCents * 12);
    }
  });
});

describe('PlanTierId type', () => {
  it('accepts all four ids', () => {
    const ids: PlanTierId[] = ['personal', 'director_60', 'director_150', 'institution'];
    expect(ids).toHaveLength(4);
  });
});
