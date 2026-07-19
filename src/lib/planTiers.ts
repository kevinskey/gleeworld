// Canonical GleeWorld subscription tiers — the single source of truth.
//
// These IDs are what the public pricing page (GleeWorldLanding), the Stripe
// checkout functions, and gw_billing_plans/gw_tenant_plans/gw_user_plans use.
// Every surface that provisions or displays a plan MUST use these IDs so the
// value stored is consistent no matter which tool created the subscription.
//
// Seed values here MUST byte-match the Task 3 migration
// (supabase/migrations/20260704231000_tier_restructure.sql) — that migration
// is the source of truth for what actually lives in gw_billing_plans; this
// file mirrors it for the client and any Node scripts that can't hit Postgres
// (see Task 5's Stripe catalog setup script).
//
// 'personal' is scope: 'user' — it's billed to an individual (gw_user_plans),
// not a tenant, and does not belong in tenant-provisioning surfaces like the
// New Tenant dialog. Use TENANT_PLAN_TIERS there.
export type PlanTierId = 'personal' | 'director_60' | 'director_150' | 'institution';

export interface PlanTier {
  id: PlanTierId;
  scope: 'user' | 'tenant';
  label: string;
  tagline: string;
  monthlyCents: number;
  annualCents: number;
  studentCap: number | null;
  storageGb: number;
  /** Max active Academy courses; null = unlimited. Enforcement is a separate
   * workstream — the client currently only displays this. */
  courseCap: number | null;
  lookupKeyMonthly: string;
  lookupKeyAnnual: string;
  features: string[];
  quote?: boolean;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'personal',
    scope: 'user',
    label: 'Personal',
    tagline: 'For one musician.',
    monthlyCents: 899,
    annualCents: 7900,
    studentCap: 1,
    storageGb: 25,
    courseCap: 1,
    lookupKeyMonthly: 'gw_personal_monthly',
    lookupKeyAnnual: 'gw_personal_annual',
    features: [
      'Studio (practice recording) — included',
      'Your own score library',
      'Personal calendar + Tonight mode',
      '1 course (Academy)',
      'Custom domain ($25 setup + $15/yr)',
      '25 GB',
    ],
  },
  {
    id: 'director_60',
    scope: 'tenant',
    label: 'Director',
    tagline: 'For directors with up to 60 students.',
    monthlyCents: 3900,
    annualCents: 39000,
    studentCap: 60,
    storageGb: 50,
    courseCap: 10,
    lookupKeyMonthly: 'gw_director60_monthly',
    lookupKeyAnnual: 'gw_director60_annual',
    features: [
      'Up to 60 students',
      'Up to 10 Academy courses',
      'Roster, attendance, scheduling',
      'Scores + part tracks',
      'Tonight mode + stage viewer',
      'Branded login (your logo & colors)',
      'Custom domain ($25 setup + $15/yr)',
      '50 GB',
    ],
  },
  {
    id: 'director_150',
    scope: 'tenant',
    label: 'Director+',
    tagline: 'For growing programs up to 150 students.',
    monthlyCents: 6900,
    annualCents: 69000,
    studentCap: 150,
    storageGb: 150,
    courseCap: 50,
    lookupKeyMonthly: 'gw_director150_monthly',
    lookupKeyAnnual: 'gw_director150_annual',
    features: [
      'Up to 150 students',
      'Up to 50 Academy courses',
      'Everything in Director',
      'Custom domain ($25 setup + $15/yr)',
      '150 GB',
    ],
  },
  {
    id: 'institution',
    scope: 'tenant',
    label: 'Institution',
    tagline: 'Unlimited students, multi-ensemble.',
    monthlyCents: 19900,
    annualCents: 199000,
    studentCap: null,
    storageGb: 1024,
    courseCap: null,
    lookupKeyMonthly: 'gw_institution_monthly',
    lookupKeyAnnual: 'gw_institution_annual',
    features: [
      'Unlimited students',
      'Unlimited Academy courses',
      'Multi-ensemble + SSO + Canvas',
      'Broadcast texts included',
      'Box Office included',
      'Custom app icon',
      'Custom domain ($25 setup + $15/yr)',
      'Dedicated app (talk to us)',
      '1 TB pooled',
    ],
    quote: true,
  },
];

// Tenant-provisioning surfaces (e.g. CreateTenantDialog) must only ever offer
// these — 'personal' is billed to a user, not a tenant, and has no place in
// gw_tenant_plans.
export const TENANT_PLAN_TIERS: PlanTier[] = PLAN_TIERS.filter((t) => t.scope === 'tenant');

export const DEFAULT_PLAN_TIER: PlanTierId = 'director_60';

// Formats integer cents into a display price: whole dollars drop the cents
// (899 → "$8.99", 3900 → "$39"); always drops trailing ".00".
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  const isWhole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
