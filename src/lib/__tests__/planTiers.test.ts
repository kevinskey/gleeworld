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

describe('seed values match the Task 3 migration table', () => {
  it('personal', () => {
    const t = PLAN_TIERS.find((p) => p.id === 'personal')!;
    expect(t.scope).toBe('user');
    expect(t.label).toBe('Personal');
    expect(t.tagline).toBe('For one musician in their private studio. Max 15 students.');
    expect(t.monthlyCents).toBe(1500);
    expect(t.annualCents).toBe(13500);
    expect(t.studentCap).toBe(15);
    expect(t.storageGb).toBe(25);
    expect(t.courseCap).toBe(1);
    expect(t.lookupKeyMonthly).toBe('gw_personal_monthly');
    expect(t.lookupKeyAnnual).toBe('gw_personal_annual');
    expect(t.features).toEqual([
      'Up to 15 students',
      '1 Academy course',
      'Your own score library',
      'Personal calendar + Tonight mode',
      'Custom domain ($25 setup + $15/yr)',
      '25 GB',
      'Add-ons included: Studio, Studio Hours, Concert Planner, Finances',
    ]);
    expect(t.quote).toBeFalsy();
  });

  it('director_60', () => {
    const t = PLAN_TIERS.find((p) => p.id === 'director_60')!;
    expect(t.scope).toBe('tenant');
    expect(t.label).toBe('Director');
    expect(t.tagline).toBe('For directors with up to 60 students.');
    expect(t.monthlyCents).toBe(5000);
    expect(t.annualCents).toBe(50000);
    expect(t.studentCap).toBe(60);
    expect(t.storageGb).toBe(50);
    expect(t.courseCap).toBe(10);
    expect(t.lookupKeyMonthly).toBe('gw_director60_monthly');
    expect(t.lookupKeyAnnual).toBe('gw_director60_annual');
    expect(t.features).toEqual([
      'Up to 60 students',
      'Up to 10 Academy courses',
      'Roster, attendance, scheduling',
      'Scores + part tracks',
      'Tonight mode + stage viewer',
      'Branded login (your logo & colors)',
      'Custom domain ($25 setup + $15/yr)',
      '50 GB',
      'Everything in Personal + Tour Manager, PR Hub',
    ]);
  });

  it('director_150', () => {
    const t = PLAN_TIERS.find((p) => p.id === 'director_150')!;
    expect(t.scope).toBe('tenant');
    expect(t.label).toBe('Director+');
    expect(t.tagline).toBe('For growing programs up to 150 students.');
    expect(t.monthlyCents).toBe(6500);
    expect(t.annualCents).toBe(65000);
    expect(t.studentCap).toBe(150);
    expect(t.storageGb).toBe(150);
    expect(t.courseCap).toBe(50);
    expect(t.lookupKeyMonthly).toBe('gw_director150_monthly');
    expect(t.lookupKeyAnnual).toBe('gw_director150_annual');
    expect(t.features).toEqual([
      'Up to 150 students',
      'Up to 50 Academy courses',
      'Custom domain ($25 setup + $15/yr)',
      '150 GB',
      'Everything in Director + Box Office, Liturgy Planner',
    ]);
  });

  it('institution', () => {
    const t = PLAN_TIERS.find((p) => p.id === 'institution')!;
    expect(t.scope).toBe('tenant');
    expect(t.label).toBe('Institution');
    expect(t.tagline).toBe('Unlimited students, multi-ensemble.');
    expect(t.monthlyCents).toBe(25000);
    expect(t.annualCents).toBe(250000);
    expect(t.studentCap).toBeNull();
    expect(t.storageGb).toBe(1024);
    expect(t.courseCap).toBeNull();
    expect(t.lookupKeyMonthly).toBe('gw_institution_monthly');
    expect(t.lookupKeyAnnual).toBe('gw_institution_annual');
    expect(t.features).toEqual([
      'Unlimited students',
      'Unlimited Academy courses',
      'Multi-ensemble + SSO + Canvas',
      'Broadcast texts included',
      'Custom app icon',
      'Custom domain ($25 setup + $15/yr)',
      'Dedicated app (talk to us)',
      '1 TB pooled',
      'All add-ons included',
    ]);
    expect(t.quote).toBe(true);
  });
});

describe('PlanTierId type', () => {
  it('accepts all four ids', () => {
    const ids: PlanTierId[] = ['personal', 'director_60', 'director_150', 'institution'];
    expect(ids).toHaveLength(4);
  });
});
