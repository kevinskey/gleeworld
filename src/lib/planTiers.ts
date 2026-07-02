// Canonical GleeWorld subscription tiers — the single source of truth.
//
// These IDs are what the public pricing page (GleeWorldLanding) and the Stripe
// payment links use, and what gets written to gw_tenants.plan. Every surface
// that provisions or displays a tenant's plan MUST use these IDs so the value
// stored is consistent no matter which tool created the tenant. Previously the
// in-app New Tenant dialog offered starter/pro/enterprise and the raw admin
// tool offered starter/growth/enterprise — neither matched anything downstream.
export const PLAN_TIERS = [
  { id: 'ensemble',     label: 'Ensemble' },
  { id: 'studio',       label: 'Studio' },
  { id: 'conservatory', label: 'Conservatory' },
  { id: 'university',   label: 'University' },
] as const;

export type PlanTierId = (typeof PLAN_TIERS)[number]['id'];

export const PLAN_TIER_IDS = PLAN_TIERS.map((t) => t.id) as PlanTierId[];

export const DEFAULT_PLAN_TIER: PlanTierId = 'ensemble';
