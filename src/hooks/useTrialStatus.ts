// 30-day free trial status for the current tenant.
//
// Product rule (2026-07-20): every account gets 30 days from signup, then
// a hard paywall. Grandfathered exceptions (main / kevin / demo*) never
// expire — expressed by ABSENCE of a gw_tenant_plans row combined with a
// tenant.created_at before the policy launch. New signups (created >= the
// launch date) that don't yet have a plan row also fall through this hook —
// they get an auto-trial clocked from tenant.created_at, so provisioning
// doesn't have to write a plan row for the trial UX to work.
//
// The four pre-policy tenants that DO get a trial (dookie, hhmchorus,
// the-silvertones-chorus, lykehouse) have a real plan row seeded by
// 20260720120000_trial_enforcement.sql; their fixed trial_ends_at wins over
// the created_at heuristic below.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Policy launch. Tenants provisioned before this date without a plan row
// are grandfathered; anything after gets an auto-trial from created_at.
const POLICY_LAUNCH_ISO = '2026-07-20T00:00:00Z';
const TRIAL_DAYS = 30;

export type TrialState =
  | { kind: 'loading' }
  | { kind: 'grandfathered' }
  | { kind: 'paid' }
  | { kind: 'trial'; daysLeft: number; endsAt: string; planId: string }
  | { kind: 'expired'; endsAt: string; planId: string }
  | { kind: 'no_tenant' };

interface TenantRow { id: string; created_at: string }
interface PlanRow {
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export function useTrialStatus(): TrialState {
  const { user } = useAuth();
  const tenantSlug = (typeof window !== 'undefined'
    && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;

  const { data: tenant, isLoading: tenantLoading } = useQuery<TenantRow | null>({
    queryKey: ['trial-tenant', tenantSlug],
    enabled: !!tenantSlug,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenants')
        .select('id, created_at')
        .eq('slug', tenantSlug)
        .maybeSingle();
      return (data as TenantRow | null) ?? null;
    },
  });

  const { data: plan, isLoading: planLoading } = useQuery<PlanRow | null>({
    queryKey: ['trial-plan', tenant?.id],
    enabled: !!tenant?.id && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_plans')
        .select('plan_id, status, trial_ends_at, current_period_end')
        .eq('tenant_id', tenant!.id)
        .maybeSingle();
      return (data as PlanRow | null) ?? null;
    },
  });

  return useMemo<TrialState>(() => {
    if (tenantLoading || (tenant && planLoading)) return { kind: 'loading' };
    if (!tenant) return { kind: 'no_tenant' };

    // Explicit plan row wins over the created_at heuristic.
    if (plan) {
      if (plan.status === 'active') return { kind: 'paid' };
      if (plan.status === 'trial' && plan.trial_ends_at) {
        const endsMs = new Date(plan.trial_ends_at).getTime();
        const now = Date.now();
        if (endsMs <= now) {
          return { kind: 'expired', endsAt: plan.trial_ends_at, planId: plan.plan_id };
        }
        const daysLeft = Math.max(0, Math.ceil((endsMs - now) / (24 * 60 * 60 * 1000)));
        return { kind: 'trial', daysLeft, endsAt: plan.trial_ends_at, planId: plan.plan_id };
      }
      // past_due / canceled fall through to the same paywall as expired.
      return { kind: 'expired', endsAt: plan.trial_ends_at ?? plan.current_period_end ?? '', planId: plan.plan_id };
    }

    // No plan row — split on policy launch date.
    const createdMs = new Date(tenant.created_at).getTime();
    const launchMs = new Date(POLICY_LAUNCH_ISO).getTime();
    if (createdMs < launchMs) return { kind: 'grandfathered' };

    // Auto-trial for new signups: 30 days from tenant.created_at.
    const autoEndsMs = createdMs + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const endsAt = new Date(autoEndsMs).toISOString();
    if (autoEndsMs <= now) return { kind: 'expired', endsAt, planId: 'director_60' };
    const daysLeft = Math.max(0, Math.ceil((autoEndsMs - now) / (24 * 60 * 60 * 1000)));
    return { kind: 'trial', daysLeft, endsAt, planId: 'director_60' };
  }, [tenant, plan, tenantLoading, planLoading]);
}
