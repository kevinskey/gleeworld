import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { markTenantSwitchInFlight, clearTenantSwitchInFlight } from '@/lib/tenantSwitchFlag';

export interface MyTenant {
  tenant_id: string;
  slug: string;
  name: string | null;
  role: string | null;
}

/**
 * Every tenant the signed-in user belongs to, via the `my_tenants` RPC
 * (SECURITY DEFINER — reads across per-tenant RLS, scoped to auth.uid()).
 * Powers the account menu's "Switch organization" list. Returns [] on error
 * or before the RPC exists, so callers degrade gracefully (no switcher).
 */
export function useMyTenants() {
  const { user } = useAuth();
  return useQuery<MyTenant[]>({
    queryKey: ['my-tenants', user?.id],
    queryFn: async () => {
      // Cast: the RPC isn't in the generated types yet.
      const { data, error } = await supabase.rpc('my_tenants' as never);
      if (error) {
        console.warn('[useMyTenants] query failed', error.message);
        return [];
      }
      return (data ?? []) as MyTenant[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/** Absolute URL for a tenant's own subdomain (main = the platform apex). */
export function tenantHomeUrl(slug: string): string {
  return slug === 'main' ? 'https://gleeworld.org' : `https://${slug}.gleeworld.org`;
}

/** Cross-subdomain tenant switch URL that CARRIES a fresh session so
 *  the user lands signed-in on the target world with the right JWT.
 *
 *  Callers MUST call set_active_tenant RPC + refreshSession() FIRST so
 *  the session's JWT tenant_slug matches the target tenant — otherwise
 *  the destination boot-errors on the JWT/URL tenant mismatch. See
 *  performTenantSwitch() below for the coordinated flow. */
export function tenantSwitchUrl(slug: string, session: Session | null): string {
  const base = tenantHomeUrl(slug);
  if (!session?.access_token || !session.refresh_token) return base;
  // Route through /auth/callback so the destination's manual setSession
  // (AuthCallback.tsx) picks up the tokens reliably — supabase-js's
  // detectSessionInUrl fires unreliably on our self-hosted GoTrue per
  // that file's header comment.
  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in ?? 3600),
    token_type: 'bearer',
    type: 'magiclink',
  }).toString();
  return `${base}/auth/callback?next=%2Fdashboard#${fragment}`;
}

/** Full switch flow: update the caller's profile.tenant_id via the
 *  set_active_tenant RPC (SECURITY DEFINER, membership-checked), refresh
 *  the session so the new JWT reflects the change, and hand back the
 *  refreshed session for tenantSwitchUrl to transfer. Throws on
 *  RPC failure so callers can toast + bail. */
export async function performTenantSwitch(
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    auth: { refreshSession: () => Promise<{ data: { session: Session | null }; error: unknown }> };
  },
  targetSlug: string,
): Promise<Session | null> {
  // Mark BEFORE the pivot. refreshSession() below re-mints the JWT with the
  // target tenant while this page is still on the old subdomain, which trips
  // AuthContext's mismatch guard; the mark tells the guard this is us.
  markTenantSwitchInFlight(targetSlug);
  try {
    const { error: rpcErr } = await supabase.rpc('set_active_tenant', { target_slug: targetSlug });
    if (rpcErr) throw new Error(String((rpcErr as { message?: string })?.message ?? 'set_active_tenant failed'));
    // refreshSession re-fires custom_access_token_hook, which now sees the
    // updated profile.tenant_id and mints a JWT with the correct tenant_slug.
    const { data, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) throw new Error(String((refreshErr as { message?: string })?.message ?? 'refreshSession failed'));
    return data.session;
  } catch (err) {
    // Never leave the guard disarmed on a switch that isn't happening.
    clearTenantSwitchInFlight();
    throw err;
  }
}
